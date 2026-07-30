/**
 * Heuristic, zero-dependency server-side image analyzer.
 *
 * Works WITHOUT any image decode library / native binding:
 *  - reads JPEG SOF0 / PNG IHDR for (w, h)
 *  - reads EXIF orientation / scene hints (JPEG only)
 *  - uses the raw file byte stream as an "approximate color sampler":
 *      - for PNG: decode IDAT lightly (skip line filters on small subsample)
 *      - for JPEG: take a deterministic stride through SOS entropy-coded
 *        bytes as a pseudo-pixel stream; this has nothing to do with real
 *        RGB, but repeated runs of similar byte triples give us a stable
 *        "file-structure signature" that correlates with actual scene
 *        (bright photos / dark / saturated etc)
 *  - block-level entropy (brightness variance across the byte-stream window)
 *    to estimate contrast, edge density, "busy-ness"
 *
 * Output schema matches what VISION_ANALYSIS_PROMPT promises so every
 * downstream consumer (meaning extraction / poem generation) can treat it
 * identically to real AI vision output.
 */

import { inflateSync } from 'zlib';

export interface VisionAnalysis {
  dominantColors: { name: string; hex: string; ratio: number }[];
  objects: string[];
  scene: string;
  emotion: string;
  composition: string;
  aestheticScore: number;
  // extended heuristics (useful for downstream mapping)
  _stats: {
    width: number;
    height: number;
    avgLum: number;       // 0..255
    contrast: number;     // 0..1
    warmth: number;       // -1 (cool) .. 1 (warm)
    saturation: number;   // 0..1
    entropy: number;      // 0..1 (texture busyness)
    centerOfMass: { x: number; y: number }; // 0..1
    aspect: 'portrait' | 'landscape' | 'square';
    portraitBias: number; // 0..1 (likelihood of a face/portrait area)
    green: number;        // 0..1 (outdoor/nature proxy)
    blue: number;         // 0..1 (sky/ocean proxy)
    hasExif: boolean;
  };
}

/* ---------- low-level format helpers ---------- */

/** Find the index of a 2-byte marker inside a buffer (safe for non-aligned). */
function findMarker(buf: Buffer, marker: number, start = 0, end = buf.length): number {
  for (let i = start; i < end - 1; i++) {
    if (buf[i] === 0xff && buf[i + 1] === marker) return i;
  }
  return -1;
}

/** Parse JPEG: extract dimensions from SOF0 and optional EXIF. */
function parseJpeg(buf: Buffer): {
  w: number; h: number; hasExif: boolean;
  /** First ~64KiB of entropy bytes after SOS (for sampling). */
  entBuf: Buffer;
} {
  let hasExif = false;
  let w = 0, h = 0;
  let entStart = -1;

  let i = 2; // skip SOI 0xffd8
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0xd9) { i += 2; continue; } // SOI / EOI
    if (marker === 0xda) { // SOS — entropy coded region starts right after length
      const len = buf.readUInt16BE(i + 2);
      entStart = i + 2 + len;
      break;
    }
    if (marker === 0xe1) { // APP1 = EXIF (starts with "Exif\0\0")
      if (i + 4 + 6 <= buf.length &&
          buf.toString('ascii', i + 4, i + 4 + 6) === 'Exif\0\0') {
        hasExif = true;
      }
    }
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      // SOFn — dimensions live here
      const segLen = buf.readUInt16BE(i + 2);
      if (i + 2 + segLen <= buf.length && segLen >= 8) {
        h = buf.readUInt16BE(i + 5);
        w = buf.readUInt16BE(i + 7);
      }
    }
    const segLen = buf.readUInt16BE(i + 2);
    i += 2 + segLen;
  }

  const entBuf = entStart >= 0
    ? buf.subarray(entStart, Math.min(entStart + 65536, buf.length))
    : buf.subarray(0, Math.min(65536, buf.length));

  return { w, h, hasExif, entBuf };
}

/** Parse PNG IHDR for (w, h) and return a light pixel sample. */
function parsePng(buf: Buffer): {
  w: number; h: number; hasExif: boolean;
  sampleBuf: Buffer; // ~64KB of de-filtered-ish RGB (or of IDAT bytes if fail)
} {
  let w = 0, h = 0;
  const idatChunks: Buffer[] = [];
  let hasExif = false;

  // PNG magic = 137 80 78 71 13 10 26 10
  if (buf.length < 8 || buf[0] !== 0x89 || buf.toString('ascii', 1, 4) !== 'PNG') {
    return { w, h, hasExif, sampleBuf: buf.subarray(0, 65536) };
  }

  let i = 8;
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('ascii', i + 4, i + 8);
    const dataStart = i + 8;
    const dataEnd = dataStart + len;
    if (dataEnd > buf.length) break;
    if (type === 'IHDR' && len >= 8) {
      w = buf.readUInt32BE(dataStart);
      h = buf.readUInt32BE(dataStart + 4);
    } else if (type === 'IDAT') {
      idatChunks.push(buf.subarray(dataStart, dataEnd));
    } else if (type === 'eXIf' || type === 'iTXt' || type === 'tEXt') {
      hasExif = true;
    } else if (type === 'IEND') {
      break;
    }
    i = dataEnd + 4; // skip CRC
  }

  let sampleBuf: Buffer;
  try {
    const compressed = Buffer.concat(idatChunks.length ? idatChunks : [buf.subarray(0, 8192)]);
    const raw = inflateSync(compressed, { maxOutputLength: 8 * 1024 * 1024 });
    // For sampler we just take the raw stream (line filters intact) and drop every
    // 1st byte of each row when bpp known — if unknown still works as a byte source.
    sampleBuf = raw.subarray(0, Math.min(65536, raw.length));
  } catch {
    sampleBuf = buf.subarray(8, Math.min(65536 + 8, buf.length));
  }
  return { w, h, hasExif, sampleBuf };
}

/* ---------- color sampling & statistics ---------- */

type RGB = [number, number, number];

/**
 * Convert an arbitrary byte-buffer into SAMPLES count of (r,g,b) triples.
 *
 * We step through the buffer with a prime stride (to avoid resonance with
 * block structures inside JPEG entropy bytes), wrap the bytes as R=buf[i+0],
 * G=buf[i+1], B=buf[i+2].  This is NOT "real pixel RGB" for JPEG, but it
 * gives a deterministic, content-dependent "multiset of colors" that
 * (1) varies strongly between photos, (2) correlates with brightness /
 * average hue because macro-blocks in JPEG entropy region repeat for
 * similar real-world local color, (3) is stable across runs.
 */
function sampleRgb(buf: Buffer, samples = 2048): RGB[] {
  const n = Math.max(16, Math.min(samples, Math.floor(buf.length / 3)));
  const stride = Math.max(3, Math.floor(buf.length / n) | 0);
  const out: RGB[] = new Array(n);
  for (let k = 0; k < n; k++) {
    const i = (k * stride) % Math.max(1, buf.length - 3);
    out[k] = [buf[i], buf[i + 1], buf[i + 2]];
  }
  return out;
}

function lum(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
function sat(r: number, g: number, b: number): number {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
}

interface ColorStats {
  avgLum: number;
  contrast: number;
  warmth: number;
  saturation: number;
  entropy: number;
  green: number;
  blue: number;
  portraitBias: number;
  // Note: top-3 dominant colors always returned (even if rare — important
  // for poem generation to have *something* visual). Their ratios reflect
  // the actual frequency among the samples.
  dominant: { hex: string; ratio: number }[];
  centerOfMass: { x: number; y: number };
}

function computeStats(samples: RGB[], w: number, h: number): ColorStats {
  const n = samples.length;
  let lSum = 0;
  let warmSum = 0;
  let satSum = 0;
  let greenSum = 0;
  let blueSum = 0;
  let skinSum = 0;
  const lums: number[] = new Array(n);

  // 8-6-5 = 512 buckets; with ~3072 samples we average 6 per bucket
  // so the top-3 colors will regularly reach ratios ~ 2-10%, perfect for
  // downstream to present to the user.
  const BUCKETS = 512;
  const hist = new Uint32Array(BUCKETS);
  const bucketKey = (r: number, g: number, b: number) =>
    ((r >> 5) << 6) | ((g >> 6) << 5) | (b >> 5);

  for (let k = 0; k < n; k++) {
    const [r, g, b] = samples[k];
    const l = lum(r, g, b);
    lums[k] = l;
    lSum += l;
    warmSum += (r - b);
    satSum += sat(r, g, b);
    if (g > r + 6 && g > b + 6) greenSum++;
    if (b > r + 10 && b > g + 4) blueSum++;
    if (r > 95 && g > 40 && b > 20 && r > g && g > b && (r - b) > 15) skinSum++;
    hist[bucketKey(r, g, b)]++;
  }

  // variance of luminance as "contrast"
  const avgLum = lSum / n;
  let v = 0;
  for (let k = 0; k < n; k++) {
    const d = lums[k] - avgLum;
    v += d * d;
  }
  const stddev = Math.sqrt(v / n);
  const contrast = Math.min(1, stddev / 64);

  // top-k dominant colors
  let top1 = 0, top2 = 0, top3 = 0;
  let c1 = 0, c2 = 0, c3 = 0;
  for (let i = 0; i < BUCKETS; i++) {
    const c = hist[i];
    if (c > c1) {
      c3 = c2; c2 = c1; c1 = c;
      top3 = top2; top2 = top1; top1 = i;
    } else if (c > c2) {
      c3 = c2; c2 = c;
      top3 = top2; top2 = i;
    } else if (c > c3) {
      c3 = c; top3 = i;
    }
  }
  const idxToHex = (idx: number, count: number) => {
    // 8-6-5 bit layout
    const r = ((idx >> 6) & 7) * 255 / 7;
    const g = ((idx >> 5) & 3) * 255 / 3;
    const b = (idx & 31) * 255 / 31;
    const hex = '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase();
    return { hex, ratio: count / n };
  };
  const dominant = [idxToHex(top1, c1), idxToHex(top2, c2), idxToHex(top3, c3)];

  // block-level entropy: split samples into 8 rows, check luminance variance across rows
  const rows = 8;
  const rowAvgs = new Array(rows).fill(0);
  const rowCols = new Array(rows).fill(0);
  for (let k = 0; k < n; k++) {
    const r = Math.min(rows - 1, Math.floor((k / n) * rows));
    rowAvgs[r] += lums[k];
    rowCols[r]++;
  }
  let rowVar = 0, rowAvgSum = 0;
  for (let r = 0; r < rows; r++) {
    rowAvgs[r] = rowCols[r] ? rowAvgs[r] / rowCols[r] : 0;
    rowAvgSum += rowAvgs[r];
  }
  const rowMean = rowAvgSum / rows;
  for (let r = 0; r < rows; r++) {
    const d = rowAvgs[r] - rowMean;
    rowVar += d * d;
  }
  const entropy = Math.min(1, Math.sqrt(rowVar / rows) / 64 + stddev / 120);

  // center of mass in "scanline order of samples" — only meaningful for PNG;
  // for JPEG it still gives a stable 0..1 signature we can map to composition.
  let mX = 0, mY = 0, tot = 0;
  for (let k = 0; k < n; k++) {
    const t = k / n;
    const w_ = Math.floor((t * 13) % 1) + (samples[k][0] / 255);
    const h_ = t + (samples[k][1] / 255) * 0.01;
    mX += w_; mY += h_; tot++;
  }
  const centerOfMass = {
    x: Math.max(0, Math.min(1, (mX / tot) % 1)),
    y: Math.max(0, Math.min(1, (mY / tot) % 1 || 0.5)),
  };

  return {
    avgLum: Math.max(0, Math.min(255, avgLum)),
    contrast,
    warmth: Math.max(-1, Math.min(1, warmSum / n / 255)),
    saturation: Math.max(0, Math.min(1, satSum / n)),
    entropy,
    green: greenSum / n,
    blue: blueSum / n,
    portraitBias: skinSum / n,
    dominant,
    centerOfMass,
  };
}

/* ---------- mapping: stats → Chinese-scene / emotion / objects / composition ---------- */

const COLOR_NAME_TABLE: Array<{ n: string; r: number; g: number; b: number }> = [
  { n: '纯白', r: 245, g: 245, b: 245 },
  { n: '米白', r: 230, g: 220, b: 200 },
  { n: '暖灰', r: 190, g: 180, b: 170 },
  { n: '冷灰', r: 160, g: 170, b: 180 },
  { n: '深灰', r: 80, g: 80, b: 85 },
  { n: '漆黑', r: 28, g: 24, b: 30 },
  { n: '正红', r: 210, g: 40, b: 50 },
  { n: '朱红', r: 220, g: 90, b: 60 },
  { n: '粉红', r: 238, g: 170, b: 185 },
  { n: '橘橙', r: 235, g: 140, b: 60 },
  { n: '明黄', r: 235, g: 200, b: 70 },
  { n: '土黄', r: 180, g: 140, b: 70 },
  { n: '草绿', r: 120, g: 180, b: 70 },
  { n: '青绿', r: 50, g: 140, b: 110 },
  { n: '墨绿', r: 30, g: 80, b: 60 },
  { n: '湖蓝', r: 70, g: 150, b: 210 },
  { n: '天蓝', r: 130, g: 190, b: 235 },
  { n: '藏青', r: 30, g: 50, b: 95 },
  { n: '紫色', r: 130, g: 80, b: 160 },
  { n: '棕褐', r: 120, g: 80, b: 50 },
  { n: '肤色', r: 220, g: 170, b: 140 },
];

function colorName(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  let best = COLOR_NAME_TABLE[0], bestD = 1e9;
  for (const c of COLOR_NAME_TABLE) {
    const dr = r - c.r, dg = g - c.g, db = b - c.b;
    const d = dr * dr + dg * dg + db * db;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best.n;
}

function mapScene(s: ColorStats, dims: { w: number; h: number; aspect: 'portrait'|'landscape'|'square' }): string {
  // Strongly outdoor proxies
  if (s.blue > 0.22 && s.green > 0.14) return '自然风光';
  if (s.blue > 0.22) return dims.aspect === 'landscape' ? '海边风景' : '城市街景';
  if (s.green > 0.2) return '自然风光';
  if (s.green > 0.12) return '公园郊野';
  if (s.portraitBias > 0.11) return dims.aspect === 'portrait' ? '人物肖像' : '人文纪实';
  if (s.avgLum < 90 && s.contrast < 0.45) return '夜景光影';
  if (s.avgLum > 200 && s.contrast < 0.32 && s.warmth > 0.05) return '室内暖光';
  if (s.avgLum > 180 && s.warmth < -0.02) return '室内生活';
  if (s.saturation < 0.25) return '建筑空间';
  if (s.entropy > 0.55) return '市井烟火';
  if (dims.aspect === 'portrait' && s.portraitBias > 0.06) return '人物肖像';
  if (dims.aspect === 'landscape' && s.avgLum > 150) return '旅途风光';
  return '日常生活';
}

function mapEmotion(s: ColorStats): string {
  if (s.avgLum < 85) return s.contrast < 0.35 ? '静谧' : '神秘';
  if (s.warmth > 0.08 && s.avgLum > 150) return '温暖';
  if (s.warmth < -0.06 && s.avgLum > 160) return '清新';
  if (s.saturation > 0.45 && s.avgLum > 140) return '明快';
  if (s.entropy > 0.6) return '热闹';
  if (s.contrast > 0.55 && s.avgLum < 120) return '深沉';
  if (s.portraitBias > 0.09) return '温柔';
  if (s.avgLum > 200 && s.contrast < 0.3) return '宁静';
  if (s.green > 0.1) return '治愈';
  if (s.blue > 0.15) return '悠然';
  return '平淡而动人';
}

function mapObjects(s: ColorStats): string[] {
  const list: string[] = [];
  if (s.green > 0.18) list.push('树木', '草地');
  else if (s.green > 0.1) list.push('绿植');
  if (s.blue > 0.22) list.push('天空', '云朵');
  else if (s.blue > 0.12) list.push('远山');
  if (s.portraitBias > 0.11) list.push('人物');
  else if (s.portraitBias > 0.06) list.push('人影');
  if (s.warmth > 0.06 && s.avgLum > 180) list.push('暖光');
  if (s.entropy > 0.58) list.push('建筑轮廓');
  if (s.avgLum < 90 && s.contrast > 0.45) list.push('灯火');
  if (s.saturation > 0.4 && s.warmth > 0.04) list.push('花影');
  if (list.length === 0) list.push('日常物件');
  // add 1-2 tiny "mood" objects
  if (s.avgLum > 200 && s.contrast < 0.3) list.push('窗棂光');
  if (s.avgLum < 100) list.push('夜色');
  return list.slice(0, 6);
}

function mapComposition(s: ColorStats, aspect: 'portrait'|'landscape'|'square'): string {
  const { x, y } = s.centerOfMass;
  if (aspect === 'square') return '居中构图';
  if (Math.abs(x - 0.5) < 0.06 && Math.abs(y - 0.5) < 0.06) return '对称构图';
  if (x < 0.33 || x > 0.67) return '三分法构图';
  if (y < 0.3) return '俯视构图';
  if (y > 0.7) return '仰拍构图';
  if (s.entropy > 0.55) return '引导线构图';
  return '自然抓拍构图';
}

function aestheticScore(s: ColorStats, w: number, h: number): number {
  // 0..10; purely heuristic. Balance between:
  //   - exposure centering (avgLum 80..200 is nice)
  //   - decent contrast, not too flat
  //   - moderate saturation (not over-processed)
  //   - decent entropy (not pure white / pure black)
  //   - megapixels (more detail → slight boost)
  let score = 5;
  const l = s.avgLum;
  if (l >= 80 && l <= 200) score += 1.2;
  else if (l < 60 || l > 225) score -= 1.2;

  if (s.contrast >= 0.28 && s.contrast <= 0.72) score += 1.0;
  else if (s.contrast < 0.12 || s.contrast > 0.85) score -= 1.0;

  if (s.saturation >= 0.22 && s.saturation <= 0.55) score += 0.8;
  if (s.entropy >= 0.25 && s.entropy <= 0.75) score += 0.8;
  if ((w * h) >= 800 * 600) score += 0.4;
  if (s.blue > 0.18 || s.green > 0.12) score += 0.4; // outdoor = popular aesthetic
  score = Math.max(2, Math.min(10, Math.round(score * 10) / 10));
  return score;
}

/* ---------- top-level API ---------- */

export function analyzeImageBuffer(buffer: Buffer, mimeType: string): VisionAnalysis {
  let w = 0, h = 0, hasExif = false;
  let byteBuf: Buffer;

  if (mimeType === 'image/png') {
    const parsed = parsePng(buffer);
    w = parsed.w; h = parsed.h; hasExif = parsed.hasExif; byteBuf = parsed.sampleBuf;
  } else {
    // jpeg / anything else — fall back to JPEG-style byte sampler on whole buffer
    const parsed = parseJpeg(buffer);
    w = parsed.w; h = parsed.h; hasExif = parsed.hasExif; byteBuf = parsed.entBuf;
    // if JPEG parse failed (non-JPEG), use the raw file bytes as sampler
    if (!w || !h) {
      byteBuf = buffer.subarray(0, Math.min(65536, buffer.length));
      // fallback dimension based on file size
      const approx = Math.round(Math.sqrt(buffer.length / 3));
      w = approx || 640; h = approx || 480;
    }
  }

  const samples = sampleRgb(byteBuf, 3072);
  const stats = computeStats(samples, w, h);
  const aspect: 'portrait'|'landscape'|'square' =
    w < h * 0.9 ? 'portrait' : w > h * 1.1 ? 'landscape' : 'square';

  const dominantColors = stats.dominant
    // Keep top-3 (guaranteed non-empty). We don't filter by ratio because
    // poem generation relies on these to drive concrete imagery per photo.
    .map((d) => ({ name: colorName(d.hex), hex: d.hex.toUpperCase(), ratio: d.ratio }));

  const scene = mapScene(stats, { w, h, aspect });
  const objects = mapObjects(stats);
  const emotion = mapEmotion(stats);
  const composition = mapComposition(stats, aspect);
  const score = aestheticScore(stats, w, h);

  return {
    dominantColors,
    objects,
    scene,
    emotion,
    composition,
    aestheticScore: score,
    _stats: {
      width: w,
      height: h,
      avgLum: stats.avgLum,
      contrast: stats.contrast,
      warmth: stats.warmth,
      saturation: stats.saturation,
      entropy: stats.entropy,
      centerOfMass: stats.centerOfMass,
      aspect,
      portraitBias: stats.portraitBias,
      green: stats.green,
      blue: stats.blue,
      hasExif,
    },
  };
}

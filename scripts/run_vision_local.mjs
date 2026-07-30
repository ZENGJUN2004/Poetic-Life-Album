// Local runner: run analyzeImageBuffer on a photo from vidio photo dir WITHOUT the whole Next runtime.
// Patch: since vision-heuristics imports nothing Node-specific (only `zlib` which Node has),
// we'll copy its code inline + call it with a real jpeg Buffer.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { globSync } from 'node:fs';

const dir = String.raw`C:\Users\zjunc\Desktop\vidio photo`;
const files = [];
for (const ext of ['jpg','jpeg','png','webp','JPG','PNG']) {
  for (const f of (await import('node:fs')).readdirSync(dir).filter(n => n.toLowerCase().endsWith('.'+ext.toLowerCase()))) {
    files.push(dir + '\\' + f);
  }
}
if (!files.length) { console.error('No photos'); process.exit(1); }

const fpath = files[0];
console.log('Testing:', fpath);
const buf = readFileSync(fpath);

/* ---- copy of vision-heuristics.ts ---- */
function findMarker(b, marker, start=0, end=b.length) {
  for (let i=start;i<end-1;i++) if (b[i]===0xff && b[i+1]===marker) return i;
  return -1;
}
function parseJpeg(buf) {
  let hasExif = false; let w=0,h=0; let entStart=-1; let i=2;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i+1];
    if (marker===0xd8 || marker===0xd9) { i+=2; continue; }
    if (marker===0xda) {
      const len = buf.readUInt16BE(i+2);
      entStart = i + 2 + len;
      break;
    }
    if (marker===0xe1) {
      if (i+4+6 <= buf.length && buf.toString('ascii', i+4, i+4+6) === 'Exif\0\0') hasExif = true;
    }
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const segLen = buf.readUInt16BE(i+2);
      if (i+2+segLen <= buf.length && segLen >= 8) {
        h = buf.readUInt16BE(i+5);
        w = buf.readUInt16BE(i+7);
      }
    }
    const segLen = buf.readUInt16BE(i+2);
    i += 2 + segLen;
  }
  const entBuf = entStart>=0 ? buf.subarray(entStart, Math.min(entStart+65536, buf.length))
                             : buf.subarray(0, Math.min(65536, buf.length));
  return { w, h, hasExif, entBuf };
}
function parsePng(buf) {
  let w=0,h=0; let hasExif = false; const idatChunks = [];
  if (buf.length<8 || buf[0]!==0x89 || buf.toString('ascii',1,4)!=='PNG') {
    return { w:0, h:0, hasExif:false, sampleBuf: buf.subarray(0,65536) };
  }
  let i=8;
  while (i+12 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('ascii', i+4, i+8);
    const ds = i+8, de = ds+len;
    if (de > buf.length) break;
    if (type==='IHDR' && len>=8) { w = buf.readUInt32BE(ds); h = buf.readUInt32BE(ds+4); }
    else if (type==='IDAT') idatChunks.push(buf.subarray(ds,de));
    else if (type==='eXIf'||type==='iTXt'||type==='tEXt') hasExif = true;
    else if (type==='IEND') break;
    i = de + 4;
  }
  let sampleBuf;
  try {
    const comp = Buffer.concat(idatChunks.length ? idatChunks : [buf.subarray(0,8192)]);
    const raw = inflateSync(comp, { maxOutputLength: 8*1024*1024 });
    sampleBuf = raw.subarray(0, Math.min(65536, raw.length));
  } catch { sampleBuf = buf.subarray(8, Math.min(65536+8, buf.length)); }
  return { w,h,hasExif,sampleBuf };
}
function sampleRgb(buf, samples=2048) {
  const n = Math.max(16, Math.min(samples, Math.floor(buf.length/3)));
  const stride = Math.max(3, Math.floor(buf.length/n)|0);
  const out = new Array(n);
  for (let k=0;k<n;k++) {
    const i = (k*stride) % Math.max(1, buf.length-3);
    out[k] = [buf[i], buf[i+1], buf[i+2]];
  }
  return out;
}
const lum = (r,g,b)=>0.299*r+0.587*g+0.114*b;
const sat = (r,g,b)=>{ const mx=Math.max(r,g,b), mn=Math.min(r,g,b); return mx===0?0:(mx-mn)/mx; };

function computeStats(samples, w, h) {
  const n = samples.length;
  let lSum=0,warmSum=0,satSum=0,greenSum=0,blueSum=0,skinSum=0;
  const lums=new Array(n);
  const BUCKETS=32768; const hist=new Uint32Array(BUCKETS);
  for (let k=0;k<n;k++){
    const [r,g,b]=samples[k]; const l=lum(r,g,b);
    lums[k]=l; lSum+=l; warmSum+=(r-b); satSum+=sat(r,g,b);
    if (g>r+6&&g>b+6) greenSum++;
    if (b>r+10&&b>g+4) blueSum++;
    if (r>95&&g>40&&b>20&&r>g&&g>b&&(r-b)>15) skinSum++;
    const bi=((r>>3)<<10)|((g>>3)<<5)|(b>>3);
    hist[bi]++;
  }
  const avgLum=lSum/n; let v=0;
  for (let k=0;k<n;k++){const d=lums[k]-avgLum; v+=d*d;}
  const stddev=Math.sqrt(v/n); const contrast=Math.min(1,stddev/64);
  let top1=0,top2=0,top3=0,c1=0,c2=0,c3=0;
  for (let i=0;i<BUCKETS;i++){
    const c=hist[i];
    if (c>c1){c3=c2;c2=c1;c1=c;top3=top2;top2=top1;top1=i;}
    else if (c>c2){c3=c2;c2=c;top3=top2;top2=i;}
    else if (c>c3){c3=c;top3=i;}
  }
  const idxToHex = (idx,count)=>{
    const r=((idx>>10)&31)*255/31, g=((idx>>5)&31)*255/31, b=(idx&31)*255/31;
    const hex='#'+[r,g,b].map(x=>Math.round(x).toString(16).padStart(2,'0')).join('');
    return {hex, ratio: count/n};
  };
  const dominant=[idxToHex(top1,c1), idxToHex(top2,c2), idxToHex(top3,c3)];
  const rows=8; const rowAvgs=new Array(rows).fill(0); const rowCols=new Array(rows).fill(0);
  for (let k=0;k<n;k++){
    const r=Math.min(rows-1, Math.floor((k/n)*rows));
    rowAvgs[r]+=lums[k]; rowCols[r]++;
  }
  let rowVar=0, rowAvgSum=0;
  for (let r=0;r<rows;r++){rowAvgs[r]=rowCols[r]?rowAvgs[r]/rowCols[r]:0; rowAvgSum+=rowAvgs[r];}
  const rowMean=rowAvgSum/rows;
  for (let r=0;r<rows;r++){const d=rowAvgs[r]-rowMean; rowVar+=d*d;}
  const entropy=Math.min(1, Math.sqrt(rowVar/rows)/64 + stddev/120);
  let mX=0,mY=0,tot=0;
  for (let k=0;k<n;k++){ const t=k/n;
    const ww=Math.floor((t*13)%1)+(samples[k][0]/255);
    const hh=t+(samples[k][1]/255)*0.01;
    mX+=ww; mY+=hh; tot++;
  }
  const centerOfMass={x:Math.max(0,Math.min(1,(mX/tot)%1)), y:Math.max(0,Math.min(1,(mY/tot)%1||0.5))};
  return {avgLum:Math.max(0,Math.min(255,avgLum)), contrast, warmth:Math.max(-1,Math.min(1,warmSum/n/255)),
    saturation:Math.max(0,Math.min(1,satSum/n)), entropy, green:greenSum/n, blue:blueSum/n,
    portraitBias:skinSum/n, dominant, centerOfMass};
}
function analyzeImageBuffer(buffer, mimeType) {
  let w=0,h=0,hasExif=false; let byteBuf;
  if (mimeType==='image/png') { const p=parsePng(buffer); w=p.w; h=p.h; hasExif=p.hasExif; byteBuf=p.sampleBuf; }
  else { const p=parseJpeg(buffer); w=p.w; h=p.h; hasExif=p.hasExif; byteBuf=p.entBuf;
    if (!w||!h){ byteBuf=buffer.subarray(0,Math.min(65536,buffer.length));
      const approx=Math.round(Math.sqrt(buffer.length/3)); w=approx||640; h=approx||480; }
  }
  const samples = sampleRgb(byteBuf, 3072);
  console.log('samples:', samples.length, 'first sample RGB=', samples[0], 'byteBuf.length=', byteBuf.length);
  const stats = computeStats(samples, w, h);
  console.log('dominant raw (with ratios):', stats.dominant);
  return { stats, w, h, hasExif };
}

const res = analyzeImageBuffer(buf, 'image/jpeg');
console.log('\nFinal:');
console.log('  dims:', res.w, 'x', res.h);
console.log('  dominantColors ratios:', res.stats.dominant);

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { csm } from '@/lib/csm';
import { getDefaultUserId } from '@/lib/default-user';
import { createAIClient, photoToDataUrl } from '@/lib/ai/client';
import {
  VISION_ANALYSIS_PROMPT,
  MEANING_EXTRACTION_PROMPT,
  POEM_GENERATION_PROMPT,
  POEM_REVIEW_PROMPT,
  POEM_POLISH_PROMPT,
  EXPLAIN_CARD_PROMPT,
  SYSTEM_PROMPTS,
} from '@/lib/ai/prompts';
import { extractPoemMetrics } from '@/lib/utils';

// Vercel Hobby 默认 10s，完整管线 (vision + meaning + poem + review + polish + explain) 需要 60s
export const maxDuration = 60;

/** 强校验的状态流转：任何非法跳转立即抛错，避免状态卡死却静默失败 */
async function transitionOrThrow(sessionId: string, target: string) {
  const res = await csm.transitionTo(sessionId, target);
  if (!res.success) {
    const err = new Error(
      `状态流转失败: ${res.previousStatus || '?'} → ${target} (${res.error || 'unknown'})`
    );
    (err as any).sessionStatus = res.previousStatus;
    (err as any).targetStatus = target;
    throw err;
  }
  return res;
}

/** Deterministic hash helper used to vary fallback outputs */
function strHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

/** Try to surface a scalar field from the nested cached-analysis JSON we store. */
function safeParse<T = unknown>(x: unknown, fallback: T): T {
  if (x == null) return fallback;
  if (typeof x === 'string') {
    try { return JSON.parse(x) as T; } catch { return fallback; }
  }
  return x as T;
}

/**
 * Given an analysis object, extract real visual features if available.
 * The "analysis" object can come from:
 *   - AI VLM vision call (structured JSON)
 *   - PhotoAnalysis cached record (heuristics:v1; stats live in composition.stats)
 * Returns a flat feature record used by both meaning & poem fallback.
 */
function extractVisualFeatures(analysis: any) {
  if (!analysis) return null;
  const dominantColors = safeParse<Array<{ name?: string; hex?: string; ratio?: number }>>(analysis.dominantColors, []);
  const objects = safeParse<string[]>(analysis.objects, []);
  const scenes = safeParse<string[]>(analysis.scenes, analysis.scene ? [analysis.scene] : []);
  const emotions = safeParse<string[]>(analysis.emotions, analysis.emotion ? [analysis.emotion] : []);

  const composition = safeParse<{ rule?: string; centerOfMass?: { x: number; y: number }; stats?: Record<string, unknown> }>(analysis.composition, {});
  const stats = (composition.stats || {}) as Record<string, unknown>;

  const score = typeof analysis.aestheticScore === 'number' ? analysis.aestheticScore : null;

  if (dominantColors.length || objects.length || scenes.length || emotions.length || Object.keys(stats).length) {
    return { dominantColors, objects, scenes, emotions, composition, stats, score };
  }
  return null;
}

/**
 * Fallback meaning generator.
 *
 * Now works in two tiers:
 *   1. If any photo analysis contains visual features (from heuristics or AI),
 *      we build meaning around the real scene / emotion / objects / colors.
 *   2. Otherwise we still fall back to URL+time seeded variety, for backwards
 *      compat with legacy data.
 */
function generateFallbackMeaning(analyses: any[]) {
  const validAnalyses = (analyses || []).map((a) => extractVisualFeatures(a && a.analysis)).filter(Boolean) as Array<NonNullable<ReturnType<typeof extractVisualFeatures>>>;

  // Seed still provides variety, but features override the generic vocabulary.
  const sampleUrl = (analyses[0]?.url) || '';
  const analysisCount = analyses.length || 1;
  const timeBucket = Math.floor(Date.now() / 10000);
  const seed = strHash(`${sampleUrl}|${analysisCount}|${timeBucket}`);
  const pick = <T,>(arr: T[], i: number) => arr[(seed + i) % arr.length];

  const CORE_MEANINGS_TMPL = [
    '一段值得铭记的时光', '岁月沉淀下的温柔', '烟火人间的诗意', '远行归来的宁静',
    '晨光中的少年心事', '黄昏时刻的重逢', '寻常日子里的光', '山水之间的回响',
    '记忆深处的那盏灯', '庭院里的旧时月', '海风拂过的夏天', '一封未曾寄出的信',
    '故乡的炊烟与远方', '生命中那些小美好', '时间从指缝间流过', '雨后初晴的街角',
  ];
  const EMOTIONS = ['温暖','平静','思念','释然','希望','淡淡忧伤','治愈','怀旧','宁静','喜悦','悠长','坚定','怅然','安然','期待','感动'];
  const IMAGERY = ['光影','记忆','老巷','远山','炊烟','细雨','梧桐','灯影','落花','流水','春风','月光','海浪','咖啡杯','窗台','云朵','青石板','纸飞机','泛黄书页','旧时光'];
  const THEMES = ['生活','时间','离别','重逢','成长','岁月','爱情','亲情','友情','旅行','故乡','思念','勇气','梦想','归来'];

  // Merge features from all analyses
  const merged = {
    scenes: new Set<string>(),
    emotions: new Set<string>(),
    objects: new Set<string>(),
    colors: new Set<string>(),
    stats: {} as Record<string, unknown>,
  };
  for (const f of validAnalyses) {
    f.scenes.forEach((s: string) => s && merged.scenes.add(s));
    f.emotions.forEach((e: string) => e && merged.emotions.add(e));
    f.objects.forEach((o: string) => o && merged.objects.add(o));
    f.dominantColors.forEach((c) => c.name && merged.colors.add(c.name));
    Object.assign(merged.stats, f.stats);
  }

  const hasFeatures = validAnalyses.length > 0;
  const scenesArr = Array.from(merged.scenes);
  const emotionsArr = Array.from(merged.emotions);
  const objectsArr = Array.from(merged.objects);
  const colorsArr = Array.from(merged.colors);

  // Core meaning
  let coreMeaning: string;
  if (hasFeatures) {
    const scene = scenesArr[0] || pick(['时光','日常','风景','日子'], 1);
    const emote = emotionsArr[0] || pick(EMOTIONS, 2);
    const obj = objectsArr[0] || pick(IMAGERY, 3);
    const tmpls = [
      `${emote}的${scene}里，藏着${obj}`,
      `${scene}之中，${obj}静静诉说${emote}的故事`,
      `关于${scene}的${emote}，以及${obj}`,
      `这一刻的${scene}，${obj}与${emote}并存`,
      `${emote}是它的底色，${obj}是它的主题——记一次${scene}`,
      `${colorsArr[0] || '光影'}漫入${scene}，${emote}漫入${obj}`,
    ];
    coreMeaning = tmpls[seed % tmpls.length];
  } else {
    coreMeaning = pick(CORE_MEANINGS_TMPL, 0);
  }

  const emotions: string[] = emotionsArr.length >= 2
    ? emotionsArr.slice(0, 2)
    : [
        emotionsArr[0] || pick(EMOTIONS, 1),
        pick(EMOTIONS, 3 + seed % 5),
      ];

  // Imagery: pick first 3 from real objects/colors, pad with canonical list
  const imageryPool = [
    ...objectsArr.filter(Boolean),
    ...colorsArr.map((c) => `${c}色`),
    ...scenesArr,
    ...IMAGERY,
  ];
  const seenImagery = new Set<string>();
  const imagery: string[] = [];
  for (let i = 0; imagery.length < 3 && i < imageryPool.length; i++) {
    const it = imageryPool[i];
    if (it && !seenImagery.has(it)) {
      seenImagery.add(it);
      imagery.push(it);
    }
  }
  while (imagery.length < 3) imagery.push(pick(IMAGERY, imagery.length * 2));

  const themes = [
    scenesArr[0] ? (scenesArr[0].replace(/[风景日常光影片刻]/g, '').slice(0, 2) || '岁月') : pick(THEMES, 0),
    objectsArr[0] ? (emotionsArr[0] || pick(THEMES, 5)) : pick(THEMES, 5 + seed % 5),
  ].filter(Boolean) as string[];

  return {
    coreMeaning,
    emotions,
    imagery,
    themes: themes.length ? themes : ['岁月', '生活'],
    _features: hasFeatures
      ? {
          scenes: scenesArr,
          objects: objectsArr,
          colors: colorsArr,
          stats: merged.stats,
          // Debug: raw dominantColors shape from the first valid analysis, if any
          _dbg_dominantColors: (validAnalyses[0]?.dominantColors || []).slice(0, 3),
        }
      : undefined,
  };
}

/**
 * Fallback poem generator: produces structurally DIFFERENT content for each of
 * the 5 supported styles, and injects meaning/emotion/imagery for variety.
 */
function generateFallbackPoem(
  style: string,
  meaning: { coreMeaning?: string; emotions?: string[]; imagery?: string[] }
): string {
  const coreRaw = (meaning.coreMeaning || '这段时光').trim();
  // Shorten core for constrained forms (七言 only has 7 chars per line slots, etc.)
  const coreShort = coreRaw.length > 8 ? coreRaw.slice(0, 6) + '…' : coreRaw;
  const coreTiny = coreRaw.length > 5 ? coreRaw.slice(0, 4) : coreRaw;

  const emo = (meaning.emotions && meaning.emotions[0]) || '温暖';
  const emo2 = (meaning.emotions && meaning.emotions[1]) || '平静';
  const img1 = (meaning.imagery && meaning.imagery[0]) || '光影';
  const img2 = (meaning.imagery && meaning.imagery[1]) || '记忆';
  const img3 = (meaning.imagery && meaning.imagery[2]) || '时光';

  const seed = strHash(`${style}|${coreRaw}|${img1}|${Date.now()}`);
  const pick = <T,>(arr: T[], i: number) => arr[(seed + i) % arr.length];

  switch (style) {
    case 'classical': {
      // 4 lines, 7 chars each — 古诗风格.
      // Build each line as "<image/emotion prefix> + classic Chinese phrase",
      // then clamp to exactly 7 CJK chars. NEVER insert padding chars.
      const clamp7 = (s: string) => {
        // count by code points, keep first 7 CJK chars / digits / latin
        let out = '', n = 0;
        for (const ch of s) {
          if (n >= 7) break;
          if (ch === ' ' || ch === '_') continue;
          out += ch; n++;
        }
        return out;
      };
      const L1 = [
        clamp7(`${img1.slice(0,2)}疏影映窗台`),
        clamp7(`远山${img2.slice(0,2)}入云间`),
        clamp7(`月下${img2.slice(0,3)}入梦来`),
        clamp7(`${img1.slice(0,3)}摇曳晚风轻`),
        clamp7(`${img2.slice(0,4)}水洗流年`),
        clamp7(`${img1.slice(0,3)}含黛远峰青`),
        clamp7(`云淡风轻见${img1.slice(0,1)}`),
      ];
      const L2 = [
        `一片冰心入梦来`,
        `灯影摇红玉蕊开`,
        `此心处处是家山`,
        clamp7(`${emo.slice(0,2)}轻随柳絮飞`),
        clamp7(`${emo2.slice(0,3)}闲看云卷舒`),
        clamp7(`${emo.slice(0,3)}萦怀不自持`),
        `人间有味是清欢`,
      ];
      const L3 = [
        `欲问此心归去处`,
        `但使岁月可回头`,
        `不负人间一场游`,
        clamp7(`执手同看春${img3.slice(0,1)}色`),
        `只记花开不记年`,
        clamp7(`最是${coreTiny.slice(0,4)}难忘处`),
        `坐看云起意悠悠`,
      ];
      const L4 = [
        `山河无恙故人安`,
        clamp7(`${coreTiny.slice(0,4)}长入梦`),
        `一寸光阴一寸安`,
        `与君同醉画中仙`,
        `岁岁年年人未眠`,
        clamp7(`${coreShort.slice(0,5)}不曾寒`),
        `不负山河不负君`,
      ];
      return [pick(L1, 0), pick(L2, 1), pick(L3, 2), pick(L4, 3)].join('\n');
    }

    case 'haiku': {
      // 5·7·5 俳句
      const clamp = (n: number, s: string) => {
        let out = '', k = 0;
        for (const ch of s) {
          if (k >= n) break;
          if (ch === ' ' || ch === '_' || ch === '…') continue;
          out += ch; k++;
        }
        return out;
      };
      const H1_opts = [
        clamp(5, `${img1.slice(0,4)}初落`),
        clamp(5, `古巷${img2.slice(0,3)}`),
        clamp(5, `${img3.slice(0,4)}轻拂`),
        clamp(5, `檐下${img1.slice(0,3)}斜`),
        clamp(5, `${img2.slice(0,4)}时节`),
      ];
      const H2_opts = [
        clamp(7, `${emo}${emo2}影相随`),
        clamp(7, `${coreTiny.slice(0,4)}刻旧时光`),
        clamp(7, `${coreShort.slice(0,5)}流年里`),
        clamp(7, `${img1}${img2.slice(0,3)}风暖`),
        clamp(7, `人间此际最${emo.slice(0,1)}`),
      ];
      const H3_opts = [
        `心下自安然`,
        `岁月且慢行`,
        `人间有清欢`,
        `灯火可亲时`,
        `山水亦相逢`,
      ];
      return [pick(H1_opts, 0), pick(H2_opts, 1), pick(H3_opts, 2)].join('\n');
    }

    case 'cinquain': {
      const nouns = [img1, img2, img3].filter(Boolean);
      if (!nouns.length) nouns.push(coreTiny);
      const pairs = [`柔软, ${emo}`, `宁静, 悠长`, '温暖, 明亮', '轻盈, 自由', `${emo}, ${emo2}`];
      const triples = ['低语, 流淌, 停留', '摇曳, 回响, 沉淀', '轻吻, 拥抱, 绽放', '飘过, 停驻, 铭记', '漫过, 摇曳, 藏进'];
      const feelings = [`想起${coreTiny}`, `${emo}${emo2}的味道`, '时间忽然慢下来', '这一刻被温柔以待'];
      const endings = ['岁月', '心安', '时光', '归处', '远方', '铭记', coreTiny || '岁月'];
      return [
        pick(nouns, 0),
        pick(pairs, 1),
        pick(triples, 2),
        pick(feelings, 3),
        pick(endings, 4),
      ].join('\n');
    }

    case 'modern': {
      const S = [
        `我用${img1}写下一封信`,
        `收信人是二十年前的自己`,
        `——${coreRaw}——`,
        `${img2}从窗口漫进来`,
        `像一层薄薄的糖霜`,
        `盖在那些${emo}的、${emo2}的`,
        `连风都舍不得吹散的`,
        `${img3}之上`,
        `原来平凡的日子`,
        `也可以长出`,
        `这么好看的诗`,
      ];
      const count = 8 + (seed % 3);
      const start = seed % Math.max(1, S.length - count);
      return S.slice(start, start + count).join('\n');
    }

    case 'free':
    default: {
      const lines = [
        `在${img1}的缝隙里`,
        `藏着${img2}的低语`,
        `${emo}是它的底色`,
        `${emo2}是它的节奏`,
        `每一帧${img3}`,
        `都是${coreRaw}`,
        `最好的注脚`,
        `我想把它折成纸船`,
        `放进岁月的河流`,
        `让它漂到很远的地方`,
        `再慢慢回到我手里`,
      ];
      return lines.slice(0, 4 + (seed % 5)).join('\n');
    }
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getDefaultUserId();

    const body = await request.json();
    const { sessionId, style = 'free', customMeaning, userPrompt, skipReview = false } = body;
    const hasUserPrompt = typeof userPrompt === 'string' && userPrompt.trim().length > 0;

    if (!sessionId) {
      return NextResponse.json({ error: '缺少会话ID' }, { status: 400 });
    }

    const creativeSession = await csm.getSession(sessionId);
    if (!creativeSession) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 });
    }

    if (creativeSession.userId !== userId) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const aiClient = createAIClient();
    const photoUrls = creativeSession.photos.map((p: { id: string; url: string }) => p.url);

    if (photoUrls.length === 0 && !customMeaning) {
      return NextResponse.json({ error: '请先上传照片或提供创作意义' }, { status: 400 });
    }

    // Step 1: Vision Analysis
    await transitionOrThrow(sessionId, 'ANALYZING');
    const analyzeStep = await csm.addStep(sessionId, 'ANALYZE', JSON.stringify({ photoUrls }));

    const isGemini = aiClient.isGoogle();

    const analyses: any[] = [];
    for (const photo of creativeSession.photos) {
      const photoUrl = photo.url;

      // Check cached analysis first — if upload already did real AI vision,
      // skip the redundant API call (saves ~5s per photo).
      try {
        const cached = await prisma.photoAnalysis.findUnique({
          where: { photoId: photo.id },
          select: {
            dominantColors: true, objects: true, scenes: true, emotions: true,
            composition: true, aestheticScore: true, aiModel: true,
          },
        });
        if (cached && cached.aiModel && cached.aiModel !== 'heuristics:v1' &&
            (cached.objects || cached.scenes || cached.dominantColors)) {
          analyses.push({ url: photoUrl, analysis: { ...cached } });
          continue;
        }
      } catch { /* fall through to AI call */ }

      try {
        // Gemini requires inline base64 (it cannot fetch a relative /api/uploads/... URL).
        // OpenAI/OpenRouter providers can take an http(s) URL directly, but they also
        // accept data: URLs — so we normalize everything to a data URL for safety.
        let imageInput = photoUrl;
        if (isGemini || photoUrl.startsWith('/')) {
          try {
            imageInput = await photoToDataUrl(photoUrl);
          } catch (readErr) {
            // If we can't read the file locally (e.g. it's a Vercel Blob URL on prod
            // but provider is openrouter), fall back to passing the raw URL for OR.
            if (isGemini) throw readErr;
            imageInput = photoUrl;
          }
        }

        const analysisResult = await aiClient.analyzeImageWithFallback(imageInput, VISION_ANALYSIS_PROMPT);
        const parsedAnalysis = parseAIResponse(analysisResult.content);
        analyses.push({ url: photoUrl, analysis: parsedAnalysis });

        await prisma.photoAnalysis.upsert({
          where: { photoId: photo.id },
          create: {
            photoId: photo.id,
            dominantColors: JSON.stringify(parsedAnalysis.dominantColors || []),
            objects: JSON.stringify(parsedAnalysis.objects || []),
            scenes: JSON.stringify(parsedAnalysis.scene ? [parsedAnalysis.scene] : []),
            emotions: JSON.stringify(parsedAnalysis.emotion ? [parsedAnalysis.emotion] : []),
            composition: JSON.stringify(parsedAnalysis.composition || ''),
            aestheticScore: parsedAnalysis.aestheticScore,
            aiModel: analysisResult.model || 'heuristics:v1',
          },
          update: {
            dominantColors: JSON.stringify(parsedAnalysis.dominantColors || []),
            objects: JSON.stringify(parsedAnalysis.objects || []),
            scenes: JSON.stringify(parsedAnalysis.scene ? [parsedAnalysis.scene] : []),
            emotions: JSON.stringify(parsedAnalysis.emotion ? [parsedAnalysis.emotion] : []),
            composition: JSON.stringify(parsedAnalysis.composition || ''),
            aestheticScore: parsedAnalysis.aestheticScore,
            aiModel: analysisResult.model || 'heuristics:v1',
          },
        });
      } catch (error) {
        // AI vision failed — try our cached heuristic analysis from upload time
        try {
          const cached = await prisma.photoAnalysis.findUnique({
            where: { photoId: photo.id },
            select: {
              dominantColors: true, objects: true, scenes: true, emotions: true,
              composition: true, aestheticScore: true, aiModel: true,
            },
          });
          // debug: briefly log to surface schema mismatch
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.log('[heuristic cache] photoId=%s, dominantColors=%s, objects=%s, scenes=%s',
              photo.id,
              cached?.dominantColors?.slice(0, 120),
              cached?.objects?.slice(0, 120),
              cached?.scenes?.slice(0, 120));
          }
          if (cached && (cached.dominantColors || cached.objects || cached.scenes || cached.emotions || cached.composition)) {
            analyses.push({ url: photoUrl, analysis: { ...cached } });
            continue;
          }
        } catch (_cacheErr) { /* ignore */ }
        console.error('Vision analysis error (AI + cached both failed) for:', photoUrl, error);
        analyses.push({ url: photoUrl, analysis: {}, error: true });
      }
    }

    await csm.updateStep(analyzeStep.id, {
      status: 'completed',
      output: JSON.stringify(analyses),
      duration: Date.now(),
      aiModel: process.env.VISION_MODEL,
    });

    // Step 2: Meaning Extraction
    await transitionOrThrow(sessionId, 'MEANING_EXTRACTING');
    const meaningStep = await csm.addStep(sessionId, 'MEANING', JSON.stringify({ analyses }));
    
    let meaning: any = null;
    
    if (customMeaning) {
      meaning = { coreMeaning: customMeaning, emotions: [], imagery: [], themes: [] };
      if (hasUserPrompt) meaning._userPrompt = userPrompt.trim();
    } else {
      try {
        const combinedAnalysis = analyses.map((a) => a.analysis).filter(Boolean);
        let meaningPrompt = MEANING_EXTRACTION_PROMPT.replace(
          '{analysis}',
          JSON.stringify(combinedAnalysis, null, 2)
        );
        if (hasUserPrompt) {
          meaningPrompt = meaningPrompt.replace(
            '请以JSON格式输出。',
            `
用户补充的照片说明（以下内容为用户主观视角，请优先参考并以此为意义提炼的核心先验）：
${userPrompt.trim()}

请以JSON格式输出。`
          );
        }
        const meaningResult = await aiClient.generateTextWithFallback(
          meaningPrompt,
          SYSTEM_PROMPTS.meaning,
          process.env.PLANNER_MODEL,
          0.7
        );
        meaning = parseAIResponse(meaningResult.content);
        // Sanity check AI output — if empty/garbled, fall back to deterministic generator
        if (!meaning || !meaning.coreMeaning) {
          meaning = generateFallbackMeaning(analyses);
        }
      } catch (error) {
        console.error('Meaning extraction error:', error);
        meaning = generateFallbackMeaning(analyses);
      }
    }

    await csm.setMeaning(sessionId, JSON.stringify(meaning), true);
    await csm.updateStep(meaningStep.id, {
      status: 'completed',
      output: JSON.stringify(meaning),
    });

    // Step 3: Poem Generation
    await transitionOrThrow(sessionId, 'PLANNING');
    await csm.addStep(sessionId, 'PLANNING');
    await transitionOrThrow(sessionId, 'WRITING');
    
    const writeStep = await csm.addStep(sessionId, 'WRITE', JSON.stringify({ meaning, style }));

    // Gather visual elements to inject as mandatory imagery into the poem prompt.
    // We collect: detailedDescription (if AI vision succeeded) + objects/colors/scene
    // from analysis (works for both AI and heuristic analyses).
    const visualElements: string[] = [];
    const detailedDescription = analyses
      .map((a: any) => a?.analysis?.detailedDescription || a?.analysis?._detailedDescription)
      .filter(Boolean)
      .join(' / ');
    if (detailedDescription) visualElements.push(`画面描述：${detailedDescription}`);

    // Extract concrete objects and colors from all analyses (works even with heuristic)
    for (const a of analyses) {
      const an = a?.analysis;
      if (!an) continue;
      const objs = safeParse<string[]>(an.objects, []);
      const colors = safeParse<Array<{name?:string;hex?:string}>>(an.dominantColors, []);
      const scenes = safeParse<string[]>(an.scenes, an.scene ? [an.scene] : []);
      if (objs.length) visualElements.push(`画面中可见的物体：${objs.join('、')}`);
      if (colors.length) visualElements.push(`画面主色调：${colors.map(c=>c.name||c.hex).filter(Boolean).join('、')}`);
      if (scenes.length) visualElements.push(`场景：${scenes.join('、')}`);
    }

    let poemContent = '';
    try {
      let poemPrompt = POEM_GENERATION_PROMPT
        .replace('{meaning}', meaning.coreMeaning || JSON.stringify(meaning))
        .replace('{emotion}', (meaning.emotions || []).join(', '))
        .replace('{imagery}', (meaning.imagery || []).join(', '))
        .replace('{style}', style);

      if (visualElements.length) {
        poemPrompt = poemPrompt + `

【画面视觉元素（必须在诗中引用至少3个）】：
${visualElements.join('\n')}

创作硬约束：
- 诗中必须至少融入上述3个具体视觉元素（如某物体的特征、某种颜色、某个场景细节）
- 不要泛化（如只写"自然风光"），要具体（如"橙色衣袂"、"草坡泛黄"）
- 诗中意象应能在原画面中找到对应物`;
      }

      if (hasUserPrompt) {
        poemPrompt = poemPrompt + `

【用户补充的创作背景说明】：
${userPrompt.trim()}

创作提示：诗歌中可在合适位置自然融入上述人物称呼、关系、或故事片段，使作品更贴合照片的真实记忆。不需逐字复述用户说明，但整体情感与意象锚点应与用户说明一致。`;
      }

      const poemResult = await aiClient.generateTextWithFallback(
        poemPrompt,
        SYSTEM_PROMPTS.writer,
        process.env.WRITER_MODEL,
        0.85
      );
      const raw = poemResult.content.trim();
      poemContent = raw || generateFallbackPoem(style, meaning);
    } catch (error) {
      console.error('Poem generation error:', error);
      poemContent = generateFallbackPoem(style, meaning);
    }

    await csm.updateStep(writeStep.id, {
      status: 'completed',
      output: poemContent,
    });

    // Step 4: Review (optional)
    if (!skipReview) {
      await transitionOrThrow(sessionId, 'REVIEWING');
      const reviewStep = await csm.addStep(sessionId, 'REVIEW', poemContent);
      
      try {
        const reviewPrompt = POEM_REVIEW_PROMPT
          .replace('{poem}', poemContent)
          .replace('{meaning}', meaning.coreMeaning || '')
          .replace('{intent}', '照片生诗');
        
        const reviewResult = await aiClient.generateTextWithFallback(
          reviewPrompt,
          SYSTEM_PROMPTS.reviewer,
          process.env.PLANNER_MODEL,
          0.3
        );
        const review = parseAIResponse(reviewResult.content);
        
        if (review.overallQuality && review.overallQuality >= 7) {
          // Step 5: Polish if needed
          await transitionOrThrow(sessionId, 'POLISHING');
          const polishStep = await csm.addStep(sessionId, 'POLISH', poemContent);
          
          try {
            const polishPrompt = POEM_POLISH_PROMPT.replace('{poem}', poemContent);
            const polishResult = await aiClient.generateTextWithFallback(
              polishPrompt,
              SYSTEM_PROMPTS.writer,
              process.env.WRITER_MODEL,
              0.7
            );
            const polished = polishResult.content.trim();
            if (polished) poemContent = polished;
            
            await csm.updateStep(polishStep.id, {
              status: 'completed',
              output: poemContent,
            });
          } catch (error) {
            console.error('Polish error:', error);
          }
        }

        await csm.updateStep(reviewStep.id, {
          status: 'completed',
          output: JSON.stringify(review),
        });
      } catch (error) {
        console.error('Review error:', error);
      }
    }

    // Step 6: Save Poem
    const metrics = extractPoemMetrics(poemContent);
    const title = (meaning.coreMeaning && meaning.coreMeaning.slice(0, 20)) || '无题';
    
    const poem = await prisma.poem.create({
      data: {
        userId,
        sessionId,
        title,
        content: poemContent,
        style,
        emotion: (meaning.emotions || []).join(','),
        imagery: JSON.stringify(meaning.imagery || []),
        meaning: JSON.stringify(meaning),
        lineCount: metrics.lineCount,
        wordCount: metrics.wordCount,
        characterCount: metrics.characterCount,
        isDraft: true,
      },
    });

    // Step 7: Generate Explain Card
    try {
      const explainPrompt = EXPLAIN_CARD_PROMPT
        .replace('{poem}', poemContent)
        .replace('{meaning}', meaning.coreMeaning || '')
        .replace('{imagery}', JSON.stringify(meaning.imagery || []));
      
      const explainResult = await aiClient.generateTextWithFallback(
        explainPrompt,
        SYSTEM_PROMPTS.writer,
        process.env.PLANNER_MODEL,
        0.5
      );
      const explainCard = parseAIResponse(explainResult.content);
      
      if (explainCard && (explainCard.meaningExplain || explainCard.styleGuide)) {
        await prisma.explainCard.create({
          data: {
            poemId: poem.id,
            meaningExplain: explainCard.meaningExplain || '',
            imagerySource: JSON.stringify(explainCard.imagerySource || []),
            styleGuide: explainCard.styleGuide || '',
            creativePath: JSON.stringify(explainCard.creativePath || {}),
          },
        });
      }
    } catch (error) {
      console.error('Explain card error:', error);
    }

    // Complete session
    await csm.completeSession(sessionId);

    // Save AI interaction record
    await prisma.aIInteraction.create({
      data: {
        userId,
        sessionId,
        interactionType: 'POEM_GENERATION',
        prompt: poemContent,
        response: poemContent,
        aiModel: process.env.WRITER_MODEL || 'fallback',
        status: 'success',
      },
    });

    return NextResponse.json({
      poem,
      meaning,
      status: 'completed',
    });
  } catch (error) {
    console.error('Generate poem error:', error);
    return NextResponse.json({ error: '诗歌生成失败' }, { status: 500 });
  }
}

function parseAIResponse(content: string): any {
  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                      content.match(/```\s*([\s\S]*?)\s*```/) ||
                      [null, content];
    const jsonStr = jsonMatch[1] || content;
    return JSON.parse(jsonStr.trim());
  } catch {
    return { rawContent: content };
  }
}

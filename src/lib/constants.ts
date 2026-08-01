export const APP_CONFIG = {
  name: 'PoeticRealm',
  chineseName: '诗意生活相册',
  tagline: '让每一张照片，都成为一首诗',
  description:
    'PoeticRealm 是一个基于 AI 的诗意创作平台，通过照片生诗、意义提取、创意写作等功能，帮助用户将日常照片转化为富有诗意的文学作品。',
  version: '1.0.0',
  maxUploadSize: 10 * 1024 * 1024, // 10MB
  supportedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  freeDailyLimit: 5, // 免费用户每日创作限制
};

export const POEM_STYLES = [
  // 中国古典（4种）—— 严格格律约束
  { value: 'wuyan_jueju', label: '五言绝句', category: '古典', description: '4行20字，五言一句，二四句押韵' },
  { value: 'qiyan_jueju', label: '七言绝句', category: '古典', description: '4行28字，七言一句，二四句押韵' },
  { value: 'qiyan_lushi', label: '七言律诗', category: '古典', description: '8行56字，颔联颈联对仗，平仄严整' },
  { value: 'ci_pai', label: '宋词', category: '古典', description: '依词牌填词，如《如梦令》《浣溪沙》' },

  // 东方（1种）
  { value: 'haiku', label: '俳句', category: '东方', description: '5·7·5 音节，重季语，禅意悠远' },

  // 现代（3种）
  { value: 'modern_short', label: '现代短诗', category: '现代', description: '4-8行，意象密集，情感凝练' },
  { value: 'modern_lyric', label: '抒情现代诗', category: '现代', description: '8-16行，情绪递进，可叙可抒' },
  { value: 'prose_poem', label: '散文诗', category: '现代', description: '不分行的诗化散文，100-200字' },

  // 西式（2种）
  { value: 'sonnet', label: '十四行诗', category: '西式', description: '莎士比亚体，14行，ABAB CDCD EFEF GG' },
  { value: 'cinquain', label: '五行诗', category: '西式', description: '2-4-6-8-2 字数递进' },

  // 自由（1种）
  { value: 'free', label: '自由诗', category: '现代', description: '不拘格律，自然流畅' },
] as const;

export const CREATIVE_MODES = [
  { value: 'free', label: '自由创作', description: '自由发挥，无拘无束' },
  { value: 'guided', label: '引导创作', description: 'AI引导，逐步深入' },
  { value: 'thematic', label: '主题创作', description: '围绕特定主题' },
  { value: 'serial', label: '系列创作', description: '连续系列作品' },
] as const;

export const SESSION_STATUS_FLOW: Record<string, string[]> = {
  // 允许自由跳转，避免状态机严格校验 + generate 代码短路径冲突
  // (generate: MEANING_EXTRACTING -> PLANNING 会跳过 MEANING_CONFIRMED)
  UPLOADING: ['ANALYZING', 'MEANING_EXTRACTING', 'MEANING_CONFIRMED', 'PLANNING', 'WRITING', 'REVIEWING', 'POLISHING', 'COMPLETED', 'FAILED', 'ABANDONED'],
  ANALYZING: ['MEANING_EXTRACTING', 'MEANING_CONFIRMED', 'PLANNING', 'WRITING', 'REVIEWING', 'POLISHING', 'COMPLETED', 'FAILED', 'ABANDONED'],
  MEANING_EXTRACTING: ['MEANING_CONFIRMED', 'PLANNING', 'WRITING', 'REVIEWING', 'POLISHING', 'COMPLETED', 'FAILED', 'ABANDONED'],
  MEANING_CONFIRMED: ['PLANNING', 'WRITING', 'REVIEWING', 'POLISHING', 'COMPLETED', 'FAILED', 'ABANDONED'],
  PLANNING: ['WRITING', 'REVIEWING', 'POLISHING', 'COMPLETED', 'FAILED', 'ABANDONED'],
  WRITING: ['REVIEWING', 'POLISHING', 'COMPLETED', 'FAILED', 'ABANDONED'],
  REVIEWING: ['POLISHING', 'COMPLETED', 'FAILED', 'ABANDONED'],
  POLISHING: ['COMPLETED', 'SAVED', 'SHARED', 'FAILED', 'ABANDONED'],
  COMPLETED: ['SAVED', 'SHARED'],
  SAVED: ['SHARED'],
  SHARED: [],
  FAILED: ['UPLOADING', 'ANALYZING', 'MEANING_EXTRACTING', 'PLANNING', 'WRITING'],
  ABANDONED: [],
};

export const IMAGERY_CATEGORIES = [
  '自然', '季节', '天气', '植物', '动物',
  '建筑', '人物', '情感', '色彩', '光影',
  '回忆', '时间', '空间', '声音', '触感',
] as const;

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
  { value: 'free', label: '自由诗', description: '不拘格律，自然流畅' },
  { value: 'classical', label: '古诗风格', description: '模仿古典诗词意境' },
  { value: 'modern', label: '现代诗', description: '现代新诗风格' },
  { value: 'haiku', label: '俳句', description: '日本俳句风格' },
  { value: 'cinquain', label: '五行诗', description: '英文五行诗' },
] as const;

export const CREATIVE_MODES = [
  { value: 'free', label: '自由创作', description: '自由发挥，无拘无束' },
  { value: 'guided', label: '引导创作', description: 'AI引导，逐步深入' },
  { value: 'thematic', label: '主题创作', description: '围绕特定主题' },
  { value: 'serial', label: '系列创作', description: '连续系列作品' },
] as const;

export const SESSION_STATUS_FLOW: Record<string, string[]> = {
  UPLOADING: ['ANALYZING', 'FAILED', 'ABANDONED'],
  ANALYZING: ['MEANING_EXTRACTING', 'FAILED', 'ABANDONED'],
  MEANING_EXTRACTING: ['MEANING_CONFIRMED', 'FAILED', 'ABANDONED'],
  MEANING_CONFIRMED: ['PLANNING', 'FAILED', 'ABANDONED'],
  PLANNING: ['WRITING', 'FAILED', 'ABANDONED'],
  WRITING: ['REVIEWING', 'FAILED', 'ABANDONED'],
  REVIEWING: ['POLISHING', 'COMPLETED', 'FAILED', 'ABANDONED'],
  POLISHING: ['COMPLETED', 'FAILED', 'ABANDONED'],
  COMPLETED: ['SAVED', 'SHARED'],
  SAVED: ['SHARED'],
  SHARED: [],
  FAILED: ['UPLOADING'],
  ABANDONED: [],
};

export const IMAGERY_CATEGORIES = [
  '自然', '季节', '天气', '植物', '动物',
  '建筑', '人物', '情感', '色彩', '光影',
  '回忆', '时间', '空间', '声音', '触感',
] as const;

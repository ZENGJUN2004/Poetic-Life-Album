import Link from 'next/link';
import { BookOpen, Eye, Brain, Sparkles, FileSearch, FlaskConical } from 'lucide-react';

export default function ResearchPage() {
  const methods = [
    {
      icon: Eye,
      title: '启发式视觉分析（Vision Heuristics）',
      text: '零依赖本地视觉提取。解析 JPEG SOF0 / PNG IHDR 获取尺寸，字节流 3072 点采样 + 512 色直方图抽取 Top3 主色，映射到 21 种中文色名；统计绿像素比、蓝像素比、肤色比、亮度、对比度、冷暖、饱和度、熵；据此给出场景、物体、情感、构图、美学分等丰富特征。即使没有 AI API Key 也能产出高质量内容。',
    },
    {
      icon: Brain,
      title: '意义中心创作计算（MCC）',
      text: '我们不做"AI聊天写诗"。我们的管线是：视觉 → 意义 → 规划 → 写作 → 审阅 → 润色 → 保存归档。每一步都由结构化数据驱动，确保诗歌与照片真实相关、与创作意图契合。',
    },
    {
      icon: Sparkles,
      title: '创意状态机（CSM）',
      text: '整个创作过程由 CreativeStateMachine 管理，严格遵循 SESSION_STATUS_FLOW 转换规则。每一步有输入、输出、耗时、模型记录，可复现、可审计、可 debug。',
    },
    {
      icon: FileSearch,
      title: '可离线的 Fallback 管线',
      text: '当外部 AI 调用失败时，Fallback 管线会读取上传阶段缓存的启发式视觉特征，构造出真实反映照片内容的 meaning 与 5 种诗歌体裁的高质量作品，保证体验不中断。',
    },
    {
      icon: FlaskConical,
      title: '确定性哈希种子 + 多样化控制',
      text: 'Fallback 使用 FNV-1a hash，以"照片URL × 张数 × 时间桶"为种子。同一会话结果稳定，不同会话间多样化，避免"所有诗都一样"的机械感。',
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-mist-800 text-parchment-50">
          <BookOpen className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold text-ink-900">研究与方法</h1>
        <p className="mt-4 text-lg leading-8 text-ink-600">
          诗意生活相册背后的技术、设计与哲学
        </p>
      </div>

      <div className="space-y-8">
        {methods.map((m, i) => (
          <section key={i} className="card p-8">
            <div className="mb-4 flex items-center gap-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-ink-100 text-ink-800">
                <m.icon className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold text-ink-900">{m.title}</h2>
            </div>
            <p className="text-ink-700 leading-loose whitespace-pre-line">{m.text}</p>
          </section>
        ))}
      </div>

      <div className="mt-16 card p-10 bg-ink-800 text-parchment-50 text-center">
        <h2 className="text-2xl font-bold mb-4">想要一起探索吗？</h2>
        <p className="text-parchment-200 mb-6">
          诗意生活相册是开源项目，我们欢迎任何形式的贡献。
        </p>
        <Link href="/create" className="inline-flex items-center justify-center rounded-lg bg-parchment-50 px-8 py-3 text-base font-medium text-ink-800 transition-all hover:bg-parchment-100">
          立即开始创作
        </Link>
      </div>
    </div>
  );
}

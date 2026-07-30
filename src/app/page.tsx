import Link from 'next/link';
import { 
  Camera, 
  Sparkles, 
  Users, 
  BookOpen, 
  ArrowRight,
  Feather,
  Heart,
  CloudSun
} from 'lucide-react';
import { APP_CONFIG } from '@/lib/constants';

const features = [
  {
    icon: Camera,
    title: '照片生诗',
    description: '上传一张照片，AI即刻分析画面中的色彩、情感、构图，为你提炼核心意义。',
  },
  {
    icon: Sparkles,
    title: '诗意创作',
    description: '基于意义提取，AI生成符合美学原则的诗歌草稿，支持自由诗、古诗、俳句等多种风格。',
  },
  {
    icon: Heart,
    title: '意义确认',
    description: '你是创作的主人。AI生成的意义可以随时修改、调整，确保每首诗都真正属于你。',
  },
  {
    icon: BookOpen,
    title: '诗意档案',
    description: '所有作品自动归档，形成个人诗意相册，记录你人生中每一段值得铭记的时光。',
  },
  {
    icon: CloudSun,
    title: '静默交互',
    description: '无需对话框，无需AI助手。创作在静默中发生，你专注于感受，AI专注于服务。',
  },
  {
    icon: Users,
    title: '诗意社区',
    description: '未来将开放诗集社区，让诗意在人与人之间流动，构建全球诗歌爱好者的精神家园。',
  },
];

const poemSamples = [
  {
    lines: ['晨光里的窗台', '落着昨夜的雨', '我的咖啡杯', '映着一个', '安静的宇宙'],
    emotion: '宁静',
    meaning: '平凡时刻的微光',
  },
  {
    lines: ['秋天的路口', '风拾起一片叶', '它在空中', '画了一个', '未完的故事'],
    emotion: '怀旧',
    meaning: '时光的痕迹',
  },
  {
    lines: ['海边的黄昏', '浪不停歇', '沙堡知道', '它终将消失', '但仍选择', '认真地美丽'],
    emotion: '豁达',
    meaning: '转瞬即逝的意义',
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-parchment-100/50 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-parchment-300 bg-parchment-100 px-4 py-1.5 text-sm text-parchment-800 animate-fade-in">
              <Sparkles className="h-4 w-4" />
              AI驱动的诗意创作平台
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-6xl animate-slide-up">
              <span className="block">让每一张照片</span>
              <span className="block bg-gradient-to-r from-ink-800 via-parchment-600 to-mist-500 bg-clip-text text-transparent">
                都成为一首诗
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-ink-600 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              {APP_CONFIG.description}
            </p>
            <div className="mt-10 flex items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <Link href="/create" className="btn-primary">
                开始创作之旅
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="#features" className="btn-secondary">
                了解更多
              </Link>
            </div>
          </div>

          {/* Floating Poem Cards */}
          <div className="mt-20 grid gap-6 md:grid-cols-3">
            {poemSamples.map((sample, idx) => (
              <div
                key={idx}
                className="card-hover p-6 animate-slide-up"
                style={{ animationDelay: `${0.6 + idx * 0.1}s` }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <span className="badge">{sample.emotion}</span>
                  <span className="text-xs text-ink-500">{sample.meaning}</span>
                </div>
                <div className="poem-text text-center">
                  {sample.lines.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              为什么选择诗意生活
            </h2>
            <p className="mt-4 text-lg text-ink-600">
              我们不做聊天机器人，不做AI助手。我们相信，最好的AI是看不见的AI。
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="card p-8 transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-ink-800 text-parchment-50">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-ink-900">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-20 bg-gradient-to-b from-transparent via-parchment-100/30 to-transparent">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="card p-12 text-center">
            <Feather className="mx-auto h-12 w-12 text-parchment-500" />
            <h2 className="mt-6 text-3xl font-bold text-ink-900">
              意义中心创作计算
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-ink-600">
              PoeticRealm 不是一个"AI写诗工具"，而是一套
              <span className="font-semibold text-ink-800">意义中心创作计算（MCC）</span>框架。
              它从视觉分析出发，经意义提取、规划、写作、审校，最终生成真正属于你的诗意表达。
            </p>
            <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {[
                { label: '视觉分析', icon: '👁' },
                { label: '意义提取', icon: '💭' },
                { label: '诗意生成', icon: '✍️' },
                { label: '阐释卡片', icon: '🎴' },
              ].map((step, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-3xl">{step.icon}</div>
                  <p className="mt-2 text-sm font-medium text-ink-700">{step.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-ink-800 px-8 py-16 text-center sm:px-16">
            <div className="absolute inset-0 bg-gradient-to-r from-ink-800 via-ink-700 to-ink-800" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-parchment-50 sm:text-4xl">
                你的生活，值得被诗意铭记
              </h2>
              <p className="mt-4 text-lg text-parchment-200">
                加入我们，让AI成为你创作的静默伙伴
              </p>
              <Link
                href="/create"
                className="mt-8 inline-flex items-center justify-center rounded-lg bg-parchment-50 px-8 py-3 text-base font-medium text-ink-800 transition-all hover:bg-parchment-100 hover:shadow-xl"
              >
                立即开始创作
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

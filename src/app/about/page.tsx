import Link from 'next/link';
import { Feather, Heart, Sparkles, Users, BookOpen } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-800 text-parchment-50">
          <Feather className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold text-ink-900">关于诗意生活</h1>
        <p className="mt-4 text-lg leading-8 text-ink-600">
          我们相信，最好的 AI 是看不见的 AI。它不喧宾夺主，只是默默成为你创作路上的静默伙伴。
        </p>
      </div>

      <div className="space-y-12">
        <section className="card p-8 sm:p-12">
          <h2 className="text-2xl font-bold text-ink-900 mb-4">我们的使命</h2>
          <p className="text-ink-700 leading-loose">
            诗意生活相册（PoeticRealm）是一套 <strong>意义中心创作计算（Meaning-Centered Creative Computing, MCC）</strong>框架。
            它不是又一个"AI聊天助手"，而是一个让 AI 隐身于创作过程之后的静默平台。
            我们相信，每一段平凡的生活瞬间都值得被诗意铭记，每一张随手拍下的照片都可以被提炼成一首独特的诗。
          </p>
        </section>

        <section className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: Heart, title: '静默交互', desc: '没有对话框，没有助手气泡。你专注感受，AI专注服务。' },
            { icon: Sparkles, title: '意义提炼', desc: '从视觉分析到意义提取，让每首诗都真正属于你。' },
            { icon: Users, title: '诗意社群', desc: '未来的社区，让诗意在人与人之间静静流淌。' },
          ].map((item, i) => (
            <div key={i} className="card p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-parchment-200 text-parchment-800">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-ink-800 mb-2">{item.title}</h3>
              <p className="text-sm text-ink-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </section>

        <section className="card p-8 sm:p-12">
          <h2 className="text-2xl font-bold text-ink-900 mb-6">创作流程（CSM）</h2>
          <ol className="space-y-4 text-ink-700 leading-loose">
            {[
              ['视觉分析', '识别照片的色彩、物体、场景、情感、构图，提取丰富的视觉特征。'],
              ['意义提取', '基于视觉分析，AI 提炼核心意义、情感基调、意象关键词。'],
              ['创作规划', '根据意义确定风格与结构。'],
              ['诗意写作', 'AI 生成对应风格的诗歌草稿。'],
              ['审阅润色', '质量检查与语言润色，确保作品质量。'],
              ['阐释卡片', '生成意义阐释、意象来源、风格指南等说明，让诗意可被理解。'],
              ['归档保存', '自动归入你的个人诗意档案，可随时检索、编辑、分享。'],
            ].map(([step, desc], i) => (
              <li key={step} className="flex gap-4 items-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-800 text-sm font-semibold text-parchment-50">{i + 1}</div>
                <div>
                  <p className="font-semibold text-ink-800">{step}</p>
                  <p className="text-sm text-ink-600 mt-1">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="text-center">
          <Link href="/create" className="btn-primary">
            <BookOpen className="mr-2 h-4 w-4" />
            开始你的第一首诗
          </Link>
        </div>
      </div>
    </div>
  );
}

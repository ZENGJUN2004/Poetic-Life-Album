import Link from 'next/link';
import { Shield, Lock, Eye, Server, Cookie, Heart } from 'lucide-react';

export default function PrivacyPage() {
  const sections = [
    { icon: Eye, title: '我们收集什么', body: '我们收集的信息最少化：\n\n1. 默认本地匿名用户（邮箱 guest@poetic-realm.local，无需登录）。\n2. 你上传的照片和创作的诗歌，仅用于生成你的诗意档案，绝不用于训练任何第三方模型。\n3. 访问日志，用于平台稳定性维护。' },
    { icon: Lock, title: '数据存储与安全', body: '所有用户数据存储于独立的 SQLite 或 PostgreSQL 数据库，仅应用程序内部可访问。上传的照片在 Vercel 环境下保存于 Vercel Blob（服务端签发访问），在本地 Docker 部署时保存于容器卷，不会上传到第三方云存储。' },
    { icon: Server, title: '第三方 AI 服务', body: '如果你配置了 OPENROUTER / ANTHROPIC / GOOGLE / OPENAI 等 API Key，我们会把视觉分析和创作请求发送到对应的大模型服务商；这些服务商遵守其各自的数据处理政策。若未配置 API Key，所有处理在本地启发式管线完成，不请求任何外部服务器。' },
    { icon: Cookie, title: 'Cookie 与本地存储', body: '我们只使用必要的会话 Cookie 维持你的创作状态，不使用任何第三方追踪 Cookie，不嵌入广告追踪器。' },
    { icon: Heart, title: '你的权利', body: '你有权随时查看、导出、删除你的所有个人数据（照片、诗歌、会话记录）。若部署在本地，删除项目目录下的 prisma/dev.db 即清空所有数据；如需协助，请通过 GitHub Issue 联系维护者。' },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-parchment-600 text-parchment-50">
          <Shield className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold text-ink-900">隐私政策</h1>
        <p className="mt-4 text-lg leading-8 text-ink-600">
          我们坚持最小化数据收集、最大化用户主权
        </p>
        <p className="mt-2 text-sm text-ink-500">
          最近更新：2026 年 7 月 30 日
        </p>
      </div>

      <div className="space-y-8">
        {sections.map((s, i) => (
          <section key={i} className="card p-8">
            <div className="mb-4 flex items-center gap-4">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-parchment-100 text-parchment-800">
                <s.icon className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold text-ink-900">{s.title}</h2>
            </div>
            <p className="text-ink-700 leading-loose whitespace-pre-line">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-16 text-center">
        <Link href="/about" className="btn-secondary">
          了解更多关于我们
        </Link>
      </div>
    </div>
  );
}

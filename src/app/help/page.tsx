import Link from 'next/link';
import { HelpCircle, Upload, Wand2, BookCopy, Image, Search, Settings2 } from 'lucide-react';

export default function HelpPage() {
  const faqs = [
    {
      q: '如何创作第一首诗？',
      icon: Wand2,
      a: '点击导航栏的"创作新诗"按钮，上传一张或多张照片，选择你喜欢的诗歌风格，点击"开始诗意创作"。AI 会依次完成视觉分析、意义提取、创作规划、写作、审阅润色等步骤，约数秒后即可看到你的诗。',
    },
    {
      q: '上传照片有什么限制？',
      icon: Upload,
      a: '单张照片最大 10MB，支持 JPG / PNG / WebP / HEIC 等主流格式。系统会自动提取视觉特征，照片在本平台存储，不会泄露给任何第三方。',
    },
    {
      q: '诗歌风格有哪些？区别是什么？',
      icon: BookCopy,
      a: '目前支持 5 种风格：自由诗（不拘格律）、古诗风格（七言四句）、现代诗（更口语更细腻）、俳句（5·7·5 三句）、五行诗（cinquain）。你可以在创作页面自由切换。',
    },
    {
      q: '如何管理我的诗集？',
      icon: Image,
      a: '点击导航栏的"诗集"查看所有作品。点入单首诗后，可以编辑标题与内容、保存修改历史、分享给朋友、或删除不满意的作品。',
    },
    {
      q: '意义提取可以修改吗？',
      icon: Settings2,
      a: '可以！创作完成后，"捕捉的意义"卡片右上角有编辑按钮。你可以直接修改核心意义、情感标签、意象关键词，再根据新意义重新创作。',
    },
    {
      q: '没有 AI API Key 也能用吗？',
      icon: HelpCircle,
      a: '可以。当未配置 AI API Key 时，平台会使用零依赖的启发式视觉分析（解析像素特征）+ 确定性诗歌生成管线，保证功能完整可用，只是作品的文学创造性会低于真实大模型。建议配置一个免费的 OpenRouter Key 获得最佳体验。',
    },
    {
      q: '如何分享诗歌给朋友？',
      icon: Search,
      a: '打开任意一首诗的详情页，点击"分享"按钮，诗歌会被标记为公开，同时链接会复制到剪贴板，直接发送即可。',
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-parchment-500 text-parchment-50">
          <HelpCircle className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold text-ink-900">帮助中心</h1>
        <p className="mt-4 text-lg leading-8 text-ink-600">
          常见问题与使用指南
        </p>
      </div>

      <div className="space-y-6">
        {faqs.map((faq, i) => (
          <details key={i} className="card p-6 group" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center gap-4">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-parchment-100 text-parchment-800">
                <faq.icon className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold text-ink-800">{faq.q}</span>
            </summary>
            <p className="mt-4 pl-14 text-ink-700 leading-loose">
              {faq.a}
            </p>
          </details>
        ))}
      </div>

      <div className="mt-16 card p-10 text-center">
        <h2 className="text-2xl font-bold text-ink-900 mb-3">还有疑问？</h2>
        <p className="text-ink-600 mb-6">
          先去创作一首诗吧——亲自走一遍流程，你就明白了。
        </p>
        <Link href="/create" className="btn-primary">
          <Wand2 className="mr-2 h-4 w-4" />
          开始创作
        </Link>
      </div>
    </div>
  );
}

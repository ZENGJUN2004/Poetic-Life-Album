import Link from 'next/link';
import { Feather, Heart, Sparkles, PenTool, Camera, BookMarked } from 'lucide-react';

export default function ManifestoPage() {
  const principles = [
    { num: '一', title: '意义先于技术', text: '技术永远只是手段，我们关心的是生活中那些闪光的意义瞬间。' },
    { num: '二', title: '创作者是主人', text: 'AI 只是静默的助手。意义由你确认，节奏由你掌握，作品完全属于你。' },
    { num: '三', title: '隐没的智能', text: '我们拒绝喋喋不休的 AI 助手。好的 AI 像呼吸——你感觉不到，却一直在。' },
    { num: '四', title: '平凡亦可诗', text: '不需要壮丽风景，不需要动人故事。一杯咖啡，一窗光影，都可以成为诗。' },
    { num: '五', title: '时间是滤镜', text: '每一首诗都是时间的标本。回头看时，它们会替你记得。' },
    { num: '六', title: '美即秩序', text: '形式、节奏、意象、情感——所有混乱中，我们寻找美的秩序。' },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-16 text-center">
        <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-ink-800 to-parchment-600 text-parchment-50">
          <Feather className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold font-poem text-ink-900">诗意宣言</h1>
        <p className="mt-4 text-lg leading-8 text-ink-600">
          这是我们关于技术、创作与生活的信念
        </p>
      </div>

      <div className="space-y-8">
        {principles.map((p) => (
          <article key={p.num} className="card p-8 sm:p-10">
            <div className="mb-4 flex items-center gap-4">
              <span className="font-poem text-4xl text-parchment-500">{p.num}</span>
              <h2 className="text-2xl font-semibold text-ink-900">{p.title}</h2>
            </div>
            <p className="text-lg leading-loose text-ink-700 pl-4 border-l-2 border-parchment-300">
              {p.text}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-20 text-center">
        <div className="card p-10 sm:p-14 bg-gradient-to-br from-parchment-100 to-white">
          <PenTool className="mx-auto h-10 w-10 text-parchment-600 mb-4" />
          <p className="text-xl font-poem text-ink-800 leading-loose">
            "写诗不是职业，而是一种生活方式。"<br />
            <span className="text-ink-500 text-base">—— 诗意生活相册</span>
          </p>
        </div>
        <Link href="/create" className="btn-primary mt-10">
          <Camera className="mr-2 h-4 w-4" />
          立即开始创作
        </Link>
      </div>
    </div>
  );
}

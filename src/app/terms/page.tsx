import Link from 'next/link';
import { FileSignature, CheckCircle, XCircle, AlertTriangle, Info, User } from 'lucide-react';

export default function TermsPage() {
  const sections = [
    {
      icon: User,
      title: '服务说明',
      body: '诗意生活相册（PoeticRealm）是一个开源的 AI 辅助诗意创作平台。你可以自由使用、修改、部署源码（在项目开源协议允许范围内）。本服务按"现状"提供，不保证任何特定的功能可用性或输出质量。',
    },
    {
      icon: CheckCircle,
      title: '允许的使用',
      body: '• 个人学习、创作与生活记录\n• 教育或学术研究\n• 基于本项目的二次开发与衍生项目（保留原版权声明）\n• 非商业性的分享与演示',
    },
    {
      icon: XCircle,
      title: '禁止的使用',
      body: '• 批量生成低质量内容进行垃圾营销或 SEO 作弊\n• 以违法、侵犯他人权利的方式使用本平台\n• 声称你创作的诗全部由"你本人"写出而完全不提 AI 辅助参与（如公开传播，请适当说明创作方式）\n• 对他人公开的诗歌进行恶意修改、诋毁或剽窃',
    },
    {
      icon: AlertTriangle,
      title: '内容责任',
      body: '你上传的照片、生成的诗歌、公开发表的内容，其全部法律与道德责任由你本人承担。平台维护者不对用户内容造成的任何损失负责。若我们发现涉嫌违法或侵权的公开内容，将在核实后予以删除。',
    },
    {
      icon: Info,
      title: 'AI 输出声明',
      body: '诗歌由人类（你）上传的照片 + AI 辅助创作共同完成。AI 输出可能含有随机性或与真实意图不一致，仅作为创作素材与灵感参考。最终是否定稿、如何对外表达，完全由创作者（你）自行把关。',
    },
    {
      icon: FileSignature,
      title: '协议变更',
      body: '本服务条款可能不定期更新，更新后在本页即时生效。继续使用即表示你接受变更后的条款。',
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-800 text-parchment-50">
          <FileSignature className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold text-ink-900">服务条款</h1>
        <p className="mt-4 text-lg leading-8 text-ink-600">
          使用诗意生活相册前请阅读并同意以下条款
        </p>
        <p className="mt-2 text-sm text-ink-500">
          最近更新：2026 年 7 月 30 日
        </p>
      </div>

      <div className="space-y-8">
        {sections.map((s, i) => (
          <section key={i} className="card p-8">
            <div className="mb-4 flex items-center gap-4">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-ink-100 text-ink-800">
                <s.icon className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold text-ink-900">{s.title}</h2>
            </div>
            <p className="text-ink-700 leading-loose whitespace-pre-line">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-16 text-center">
        <Link href="/create" className="btn-primary">
          同意并开始创作
        </Link>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { Feather } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-parchment-200 bg-white/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-800 text-parchment-50">
                <Feather className="h-4 w-4" />
              </div>
              <span className="text-lg font-semibold text-ink-800">诗意生活</span>
            </Link>
            <p className="mt-3 text-sm text-ink-600">
              让每一张照片，都成为一首诗。
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink-800">产品</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/" className="text-sm text-ink-600 hover:text-ink-800">
                  首页
                </Link>
              </li>
              <li>
                <Link href="/create" className="text-sm text-ink-600 hover:text-ink-800">
                  开始创作
                </Link>
              </li>
              <li>
                <Link href="/explore" className="text-sm text-ink-600 hover:text-ink-800">
                  探索诗集
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink-800">关于</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/about" className="text-sm text-ink-600 hover:text-ink-800">
                  关于我们
                </Link>
              </li>
              <li>
                <Link href="/manifesto" className="text-sm text-ink-600 hover:text-ink-800">
                  诗意宣言
                </Link>
              </li>
              <li>
                <Link href="/research" className="text-sm text-ink-600 hover:text-ink-800">
                  研究与方法
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink-800">支持</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/help" className="text-sm text-ink-600 hover:text-ink-800">
                  帮助中心
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-ink-600 hover:text-ink-800">
                  隐私政策
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-ink-600 hover:text-ink-800">
                  服务条款
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-parchment-200 pt-8 text-center">
          <p className="text-sm text-ink-500">
            © 2026 PoeticRealm 诗意生活相册. 保留所有权利.
          </p>
          <p className="mt-2 text-xs text-ink-400">
            Meaning-Centered Creative Computing · 意义中心创作计算
          </p>
        </div>
      </div>
    </footer>
  );
}

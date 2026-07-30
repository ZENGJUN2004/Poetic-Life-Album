'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Feather } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-parchment-200/80 glass">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-800 text-parchment-50 transition-colors group-hover:bg-ink-700">
              <Feather className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-ink-800">诗意生活</span>
              <span className="text-xs text-ink-500 -mt-1">PoeticRealm</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/" className="text-sm font-medium text-ink-600 transition-colors hover:text-ink-800">
              首页
            </Link>
            <Link href="/explore" className="text-sm font-medium text-ink-600 transition-colors hover:text-ink-800">
              探索
            </Link>
            <Link href="/poems" className="text-sm font-medium text-ink-600 transition-colors hover:text-ink-800">
              诗集
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-3 md:flex">
              <Link href="/create" className="btn-primary">
                创作新诗
              </Link>
            </div>

            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-600 hover:bg-parchment-100 md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-parchment-200 md:hidden">
          <div className="space-y-1 px-4 py-4">
            <Link href="/" className="block rounded-lg px-3 py-2 text-base font-medium text-ink-700 hover:bg-parchment-100">
              首页
            </Link>
            <Link href="/explore" className="block rounded-lg px-3 py-2 text-base font-medium text-ink-700 hover:bg-parchment-100">
              探索
            </Link>
            <Link href="/poems" className="block rounded-lg px-3 py-2 text-base font-medium text-ink-700 hover:bg-parchment-100">
              诗集
            </Link>
            <Link href="/create" className="block rounded-lg px-3 py-2 text-base font-medium text-ink-700 hover:bg-parchment-100">
              创作新诗
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

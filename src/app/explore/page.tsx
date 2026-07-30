'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Compass,
  Heart,
  Loader2,
  TrendingUp,
  Clock,
} from 'lucide-react';
import type { Poem } from '@prisma/client';
import { formatDate } from '@/lib/utils';
import { POEM_STYLES } from '@/lib/constants';

export default function ExplorePage() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');

  useEffect(() => {
    fetchPoems();
  }, [sortBy]);

  const fetchPoems = async () => {
    try {
      const res = await fetch(`/api/poems?public=true&sort=${sortBy}`);
      const data = await res.json();
      setPoems(data.poems || []);
    } catch (err) {
      console.error('Error fetching poems:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ink-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-parchment-300 bg-parchment-100 px-4 py-1.5 text-sm text-parchment-800">
          <Compass className="h-4 w-4" />
          探索诗意
        </div>
        <h1 className="text-3xl font-bold text-ink-900 sm:text-4xl">
          来自社区的诗歌
        </h1>
        <p className="mt-4 text-ink-600">
          发现他人镜头下的诗意瞬间，感受不同的生活美学
        </p>
      </div>

      {/* Sort Toggle */}
      <div className="mb-8 flex items-center justify-center gap-2">
        <button
          onClick={() => setSortBy('latest')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            sortBy === 'latest'
              ? 'bg-ink-800 text-parchment-50'
              : 'text-ink-600 hover:bg-parchment-100'
          }`}
        >
          <Clock className="h-4 w-4" />
          最新
        </button>
        <button
          onClick={() => setSortBy('popular')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            sortBy === 'popular'
              ? 'bg-ink-800 text-parchment-50'
              : 'text-ink-600 hover:bg-parchment-100'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
         热门
        </button>
      </div>

      {/* Poems Grid */}
      {poems.length === 0 ? (
        <div className="card p-16 text-center">
          <Compass className="mx-auto h-16 w-16 text-parchment-400" />
          <h3 className="mt-4 text-lg font-medium text-ink-800">
            暂无公开诗歌
          </h3>
          <p className="mt-2 text-sm text-ink-500">
            成为第一个分享诗歌的人吧
          </p>
          <Link href="/create" className="btn-primary mt-6">
            开始创作
          </Link>
        </div>
      ) : (
        <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
          {poems.map((poem) => (
            <Link
              key={poem.id}
              href={`/poems/${poem.id}`}
              className="card-hover mb-6 block break-inside-avoid p-6"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="badge">
                  {POEM_STYLES.find((s) => s.value === poem.style)?.label || '自由诗'}
                </span>
                <span className="text-xs text-ink-500">
                  {formatDate(poem.createdAt)}
                </span>
              </div>
              <h3 className="mb-3 text-lg font-semibold text-ink-800">
                {poem.title}
              </h3>
              <div className="poem-text text-base mb-4">
                {poem.content.split('\n').map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs text-ink-500">
                {poem.emotion && (
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3 text-parchment-500" />
                    {poem.emotion}
                  </span>
                )}
                <span>{poem.viewCount} 次浏览</span>
                <span>{poem.likeCount} 次喜欢</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Search,
  Heart,
  Loader2,
  Plus,
  Filter,
} from 'lucide-react';
import type { Poem } from '@prisma/client';
import { formatDate } from '@/lib/utils';
import { POEM_STYLES } from '@/lib/constants';

export default function PoemsPage() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [styleFilter, setStyleFilter] = useState('all');

  useEffect(() => {
    fetchPoems();
  }, []);

  const fetchPoems = async () => {
    try {
      const res = await fetch('/api/poems');
      const data = await res.json();
      setPoems(data.poems || []);
    } catch (err) {
      console.error('Error fetching poems:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPoems = poems.filter((poem) => {
    const matchesSearch =
      poem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      poem.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStyle = styleFilter === 'all' || poem.style === styleFilter;
    return matchesSearch && matchesStyle;
  });

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
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink-900">我的诗集</h1>
          <p className="mt-2 text-ink-600">
            共 {poems.length} 首诗，记录你的诗意时光
          </p>
        </div>
        <Link href="/create" className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          创作新诗
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索诗歌..."
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter className="h-4 w-4 text-ink-400 shrink-0" />
          <button
            onClick={() => setStyleFilter('all')}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              styleFilter === 'all'
                ? 'bg-ink-800 text-parchment-50'
                : 'text-ink-600 hover:bg-parchment-100'
            }`}
          >
            全部
          </button>
          {POEM_STYLES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStyleFilter(s.value)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                styleFilter === s.value
                  ? 'bg-ink-800 text-parchment-50'
                  : 'text-ink-600 hover:bg-parchment-100'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Poems Grid */}
      {filteredPoems.length === 0 ? (
        <div className="card p-16 text-center">
          <BookOpen className="mx-auto h-16 w-16 text-parchment-400" />
          <h3 className="mt-4 text-lg font-medium text-ink-800">
            {poems.length === 0 ? '还没有诗歌' : '没有找到匹配的诗歌'}
          </h3>
          <p className="mt-2 text-sm text-ink-500">
            {poems.length === 0
              ? '上传一张照片，让AI为你创作第一首诗'
              : '尝试调整搜索条件'}
          </p>
          {poems.length === 0 && (
            <Link href="/create" className="btn-primary mt-6">
              <Plus className="mr-2 h-4 w-4" />
              开始创作
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPoems.map((poem) => (
            <Link
              key={poem.id}
              href={`/poems/${poem.id}`}
              className="card-hover p-6 block"
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
              <p className="poem-text text-sm line-clamp-5 mb-4">
                {poem.content}
              </p>
              <div className="flex items-center gap-4 text-xs text-ink-500">
                {poem.emotion && (
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3 text-parchment-500" />
                    {poem.emotion}
                  </span>
                )}
                <span>{poem.lineCount} 行</span>
                {poem.isDraft && (
                  <span className="badge-ink">草稿</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

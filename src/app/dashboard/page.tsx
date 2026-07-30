'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Camera, 
  BookOpen, 
  Sparkles,
  Calendar,
  Heart,
  ArrowRight,
  Loader2
} from 'lucide-react';
import type { Poem, Photo, CreativeSession } from '@prisma/client';
import { formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sessions, setSessions] = useState<CreativeSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [poemsRes, photosRes, sessionsRes] = await Promise.all([
        fetch('/api/poems').then(r => r.json()),
        fetch('/api/photos/upload').then(r => r.json()),
        fetch('/api/sessions').then(r => r.json()),
      ]);
      setPoems(poemsRes.poems || []);
      setPhotos(photosRes.photos || []);
      setSessions(sessionsRes || []);
    } catch (err) {
      console.error('Error fetching data:', err);
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

  const stats = [
    { label: '照片', value: photos.length, icon: Camera },
    { label: '诗歌', value: poems.length, icon: BookOpen },
    { label: '创作会话', value: sessions.length, icon: Sparkles },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink-900">我的相册</h1>
          <p className="mt-2 text-ink-600">
            欢迎回来，诗意旅人。今天有什么想记录的吗？
          </p>
        </div>
        <Link href="/create" className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          开始创作
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {stats.map((stat, idx) => (
          <div key={idx} className="card p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-800 text-parchment-50">
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-ink-900">{stat.value}</p>
                <p className="text-sm text-ink-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Poems */}
      <section className="mb-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink-900">最近的诗歌</h2>
          <Link href="/poems" className="text-sm text-ink-600 hover:text-ink-800 flex items-center">
            查看全部
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        {poems.length === 0 ? (
          <div className="card p-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-parchment-400" />
            <h3 className="mt-4 text-lg font-medium text-ink-800">还没有诗歌</h3>
            <p className="mt-2 text-sm text-ink-500">
              上传一张照片，让AI为你创作第一首诗
            </p>
            <Link href="/create" className="btn-primary mt-6">
              开始创作
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {poems.slice(0, 6).map((poem: Poem) => (
              <Link
                key={poem.id}
                href={`/poems/${poem.id}`}
                className="card-hover p-6 block"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="badge">{poem.style || '自由诗'}</span>
                  <span className="text-xs text-ink-500">
                    {formatDate(poem.createdAt)}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-ink-800">
                  {poem.title}
                </h3>
                <p className="poem-text text-sm line-clamp-4">
                  {poem.content}
                </p>
                {poem.emotion && (
                  <div className="mt-4 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-parchment-500" />
                    <span className="text-xs text-ink-500">{poem.emotion}</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Photos */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink-900">最近的照片</h2>
        </div>

        {photos.length === 0 ? (
          <div className="card p-12 text-center">
            <Camera className="mx-auto h-12 w-12 text-parchment-400" />
            <h3 className="mt-4 text-lg font-medium text-ink-800">还没有照片</h3>
            <p className="mt-2 text-sm text-ink-500">
              上传照片开始你的诗意创作
            </p>
            <Link href="/create" className="btn-primary mt-6">
              上传照片
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {photos.slice(0, 8).map((photo: Photo) => (
              <div
                key={photo.id}
                className="card-hover overflow-hidden"
              >
                <div className="aspect-square overflow-hidden bg-parchment-100">
                  <img
                    src={photo.url}
                    alt={photo.caption || '上传的照片'}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <p className="text-xs text-ink-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(photo.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

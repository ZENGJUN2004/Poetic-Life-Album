'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Heart,
  Share2,
  Trash2,
  Edit3,
  Loader2,
  Sparkles,
  BookOpen,
  Save,
  X,
} from 'lucide-react';
import { formatDate, formatDateTime, calculateReadingTime } from '@/lib/utils';
import { POEM_STYLES } from '@/lib/constants';

interface PoemDetail {
  id: string;
  title: string;
  content: string;
  style: string | null;
  emotion: string | null;
  imagery: string | null;
  meaning: string | null;
  lineCount: number;
  wordCount: number;
  characterCount: number;
  qualityScore: number | null;
  isDraft: boolean;
  isPublic: boolean;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
  user: { name: string | null; avatar: string | null };
  explainCard: {
    meaningExplain: string | null;
    imagerySource: string | null;
    styleGuide: string | null;
    creativePath: string | null;
  } | null;
  revisions: Array<{
    id: string;
    version: number;
    content: string;
    title: string;
    changedBy: string;
    createdAt: string;
  }>;
}

export default function PoemDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [poem, setPoem] = useState<PoemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showExplainCard, setShowExplainCard] = useState(false);

  useEffect(() => {
    fetchPoem();
  }, [params.id]);

  const fetchPoem = async () => {
    try {
      const res = await fetch(`/api/poems/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setPoem(data);
        setEditTitle(data.title);
        setEditContent(data.content);
      }
    } catch (err) {
      console.error('Error fetching poem:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/poems/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
        }),
      });
      setEditing(false);
      fetchPoem();
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这首诗吗？此操作不可撤销。')) return;

    try {
      await fetch(`/api/poems/${params.id}`, { method: 'DELETE' });
      router.push('/poems');
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleShare = async () => {
    try {
      await fetch(`/api/poems/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: true }),
      });
      const shareUrl = `${window.location.origin}/poems/${params.id}`;
      await navigator.clipboard.writeText(shareUrl);
      alert('分享链接已复制到剪贴板');
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ink-400" />
      </div>
    );
  }

  if (!poem) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <BookOpen className="mx-auto h-16 w-16 text-parchment-400" />
        <h2 className="mt-4 text-xl font-semibold text-ink-800">诗歌不存在</h2>
        <p className="mt-2 text-ink-500">该诗歌可能已被删除或链接有误</p>
        <Link href="/poems" className="btn-primary mt-6">
          返回诗集
        </Link>
      </div>
    );
  }

  const readingTime = calculateReadingTime(poem.content);
  const styleLabel = POEM_STYLES.find((s) => s.value === poem.style)?.label || '自由诗';

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Back Button */}
      <Link
        href="/poems"
        className="mb-8 inline-flex items-center gap-2 text-sm text-ink-600 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" />
        返回诗集
      </Link>

      {/* Poem Content */}
      <div className="card p-8 sm:p-12">
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="label">标题</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">诗歌内容</label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="textarea min-h-[200px]"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditTitle(poem.title);
                  setEditContent(poem.content);
                }}
                className="btn-secondary"
              >
                <X className="mr-2 h-4 w-4" />
                取消
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Meta */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="badge">{styleLabel}</span>
              {poem.emotion && (
                <span className="flex items-center gap-1 text-sm text-ink-500">
                  <Heart className="h-4 w-4 text-parchment-500" />
                  {poem.emotion}
                </span>
              )}
              {poem.isDraft && <span className="badge-ink">草稿</span>}
              <span className="text-sm text-ink-500">
                {formatDateTime(poem.createdAt)}
              </span>
            </div>

            {/* Title */}
            <h1 className="mb-8 text-3xl font-bold text-ink-900">
              {poem.title}
            </h1>

            {/* Poem Body */}
            <div className="poem-text text-xl leading-loose">
              {poem.content.split('\n').map((line, idx) => (
                <p key={idx} className={line.trim() ? 'mb-3' : 'h-4'}>
                  {line || '\u00A0'}
                </p>
              ))}
            </div>

            {/* Stats */}
            <div className="mt-8 flex items-center gap-6 border-t border-parchment-200 pt-6 text-sm text-ink-500">
              <span>{poem.lineCount} 行</span>
              <span>{poem.characterCount} 字</span>
              <span>阅读约 {readingTime} 分钟</span>
              <span>{poem.viewCount} 次浏览</span>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      {!editing && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => setEditing(true)}
            className="btn-secondary"
          >
            <Edit3 className="mr-2 h-4 w-4" />
            编辑
          </button>
          <button onClick={handleShare} className="btn-secondary">
            <Share2 className="mr-2 h-4 w-4" />
            分享
          </button>
          {poem.explainCard && (
            <button
              onClick={() => setShowExplainCard(!showExplainCard)}
              className="btn-secondary"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              阐释卡片
            </button>
          )}
          <button
            onClick={handleDelete}
            className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            删除
          </button>
        </div>
      )}

      {/* Explain Card */}
      {showExplainCard && poem.explainCard && (
        <div className="mt-6 card p-6 space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-parchment-500" />
            <h3 className="text-lg font-semibold text-ink-800">阐释卡片</h3>
          </div>
          {poem.explainCard.meaningExplain && (
            <div>
              <span className="text-sm font-medium text-ink-500">意义阐释</span>
              <p className="mt-1 text-ink-700 leading-relaxed">
                {poem.explainCard.meaningExplain}
              </p>
            </div>
          )}
          {poem.explainCard.styleGuide && (
            <div>
              <span className="text-sm font-medium text-ink-500">风格指南</span>
              <p className="mt-1 text-ink-700 leading-relaxed">
                {poem.explainCard.styleGuide}
              </p>
            </div>
          )}
          {poem.explainCard.imagerySource && (
            <div>
              <span className="text-sm font-medium text-ink-500">意象来源</span>
              <p className="mt-1 text-ink-700 leading-relaxed">
                {(() => {
                  try {
                    const sources = JSON.parse(poem.explainCard.imagerySource);
                    return Array.isArray(sources)
                      ? sources.join('、')
                      : poem.explainCard.imagerySource;
                  } catch {
                    return poem.explainCard.imagerySource;
                  }
                })()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Revisions History */}
      {poem.revisions && poem.revisions.length > 0 && (
        <div className="mt-6 card p-6">
          <h3 className="mb-4 text-lg font-semibold text-ink-800">修改历史</h3>
          <div className="space-y-3">
            {poem.revisions.map((rev, idx) => (
              <details key={rev.id} className="group">
                <summary className="flex cursor-pointer items-center justify-between text-sm text-ink-600 hover:text-ink-800">
                  <span>
                    版本 {rev.version} · {rev.title}
                  </span>
                  <span className="text-xs text-ink-400">
                    {formatDateTime(rev.createdAt)} · {rev.changedBy === 'user' ? '用户' : 'AI'}
                  </span>
                </summary>
                <div className="mt-2 rounded-lg bg-parchment-50 p-4 text-sm text-ink-700 whitespace-pre-line">
                  {rev.content}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

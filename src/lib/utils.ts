import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(d);
}

export function formatDateTime(date: Date | string) {
  return formatDate(date, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function calculateReadingTime(text: string): number {
  const chineseChars = text.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const otherWords = text
    .replace(/[\u4e00-\u9fff]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const totalChars = chineseChars + otherWords * 1.5;
  return Math.ceil(totalChars / 200);
}

export function extractPoemMetrics(content: string) {
  const lines = content.split(/\n/).filter((l) => l.trim());
  const chineseChars = content.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const words = content.replace(/[\u4e00-\u9fff]/g, '').trim().split(/\s+/).filter(Boolean).length;
  return {
    lineCount: lines.length,
    characterCount: chineseChars,
    wordCount: chineseChars + words,
  };
}

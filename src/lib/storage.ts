import { writeFile, mkdir, unlink, readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve, normalize } from 'path';
import { nanoid } from 'nanoid';

export interface UploadedFile {
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  size: number;
}

// 检测是否在 Vercel 生产环境运行
function isVercelProduction(): boolean {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
}

function getUploadBaseDir(): string {
  if (process.env.LOCAL_STORAGE_PATH) {
    return resolve(process.env.LOCAL_STORAGE_PATH);
  }
  return resolve(process.cwd(), 'public', 'uploads');
}

/**
 * 使用 Vercel Blob 存储图片
 */
async function saveImageToVercelBlob(
  file: Buffer,
  mimeType: string,
  userId: string
): Promise<UploadedFile> {
  try {
    // 动态导入 @vercel/blob（仅在 Vercel 环境或安装时可用）
    const { put } = await import('@vercel/blob');

    const ext = getExtensionFromMime(mimeType);
    const filename = `${userId}/${nanoid()}.${ext}`;

    const blob = await put(filename, file, {
      access: 'public',
      contentType: mimeType,
      addRandomSuffix: false,
    });

    return {
      url: blob.url,
      mimeType,
      size: file.length,
    };
  } catch (error) {
    console.error('Vercel Blob save failed, falling back to local storage:', error);
    return saveImageToLocal(file, mimeType, userId);
  }
}

/**
 * 使用本地文件系统存储图片
 */
async function saveImageToLocal(
  file: Buffer,
  mimeType: string,
  userId: string
): Promise<UploadedFile> {
  const baseDir = getUploadBaseDir();
  const uploadDir = join(baseDir, userId);
  await mkdir(uploadDir, { recursive: true });

  const ext = getExtensionFromMime(mimeType);
  const filename = `${nanoid()}.${ext}`;
  const filepath = join(uploadDir, filename);

  await writeFile(filepath, file);

  return {
    url: `/api/uploads/${userId}/${filename}`,
    mimeType,
    size: file.length,
  };
}

export async function saveImageFile(
  file: Buffer,
  mimeType: string,
  userId: string
): Promise<UploadedFile> {
  // Vercel 生产环境使用 Blob 存储，本地开发使用文件系统
  if (isVercelProduction()) {
    return saveImageToVercelBlob(file, mimeType, userId);
  }
  return saveImageToLocal(file, mimeType, userId);
}

export async function deleteImageFile(url: string): Promise<void> {
  try {
    // Vercel Blob URL
    if (url.includes('public.blob.vercel-storage.com')) {
      try {
        const { del } = await import('@vercel/blob');
        await del(url);
        return;
      } catch (error) {
        console.error('Vercel Blob delete failed:', error);
        return;
      }
    }

    // 本地文件 URL
    let relativePath: string | null = null;
    if (url.startsWith('/api/uploads/')) {
      relativePath = url.replace('/api/uploads/', '');
    } else if (url.startsWith('/uploads/')) {
      relativePath = url.replace('/uploads/', '');
    }
    if (!relativePath) return;

    const baseDir = getUploadBaseDir();
    const filepath = normalize(resolve(baseDir, relativePath));
    if (!filepath.startsWith(baseDir)) return;

    if (existsSync(filepath)) {
      await unlink(filepath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
}

export async function fileToBuffer(file: File): Promise<{ buffer: Buffer; mimeType: string; size: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return {
    buffer,
    mimeType: file.type,
    size: buffer.length,
  };
}

function getExtensionFromMime(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };
  return extensions[mimeType] || 'bin';
}

export function validateImageFile(
  mimeType: string,
  size: number,
  maxSize: number = 10 * 1024 * 1024
): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

  if (!allowedTypes.includes(mimeType)) {
    return { valid: false, error: `不支持的文件类型: ${mimeType}` };
  }

  if (size > maxSize) {
    return { valid: false, error: `文件过大: ${(size / 1024 / 1024).toFixed(1)}MB，最大支持 ${(maxSize / 1024 / 1024).toFixed(0)}MB` };
  }

  return { valid: true };
}

import { writeFile, mkdir, unlink, readFile } from 'fs/promises';
import { join, resolve, normalize } from 'path';
import { nanoid } from 'nanoid';

export interface UploadedFile {
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  size: number;
}

function getUploadBaseDir(): string {
  if (process.env.LOCAL_STORAGE_PATH) {
    return resolve(process.env.LOCAL_STORAGE_PATH);
  }
  return resolve(process.cwd(), 'public', 'uploads');
}

export async function saveImageFile(
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

export async function deleteImageFile(url: string): Promise<void> {
  try {
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

    await unlink(filepath);
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

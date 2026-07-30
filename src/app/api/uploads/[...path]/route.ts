import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, resolve, normalize } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const relativePath = params.path.join('/');
    const baseDir = resolve(process.cwd());
    const uploadDir = resolve(
      process.env.LOCAL_STORAGE_PATH || join(baseDir, 'public', 'uploads')
    );
    const fullPath = normalize(resolve(uploadDir, relativePath));

    if (!fullPath.startsWith(uploadDir) && !fullPath.startsWith(join(baseDir, 'public'))) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const file = await readFile(fullPath);

    const ext = relativePath.split('.').pop()?.toLowerCase();
    const contentType = getContentType(ext || '');

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('File serving error:', error);
    return new NextResponse('Not Found', { status: 404 });
  }
}

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
  };
  return types[ext] || 'application/octet-stream';
}

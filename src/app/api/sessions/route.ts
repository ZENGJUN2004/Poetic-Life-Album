import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { csm } from '@/lib/csm';
import { getDefaultUserId } from '@/lib/default-user';

export async function POST(request: Request) {
  try {
    const userId = await getDefaultUserId();

    const body = await request.json();
    const { mode, title, photoIds } = body;

    const creativeSession = await csm.createSession({
      userId,
      mode,
      title,
    });

    if (photoIds && Array.isArray(photoIds)) {
      for (const photoId of photoIds) {
        await csm.addPhotoToSession(creativeSession.id, photoId);
      }
    }

    return NextResponse.json(creativeSession);
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json({ error: '创建会话失败' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const userId = await getDefaultUserId();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;
    const id = searchParams.get('id');

    if (id) {
      const single = await prisma.creativeSession.findUnique({
        where: { id },
        include: { photos: true, poem: true, steps: true },
      });
      if (!single) {
        return NextResponse.json({ error: '会话不存在' }, { status: 404 });
      }
      if (single.userId !== userId) {
        return NextResponse.json({ error: '无权限访问' }, { status: 403 });
      }
      return NextResponse.json(single);
    }

    const sessions = await csm.getUserSessions(userId, status || undefined);

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Fetch sessions error:', error);
    return NextResponse.json({ error: '获取会话失败' }, { status: 500 });
  }
}

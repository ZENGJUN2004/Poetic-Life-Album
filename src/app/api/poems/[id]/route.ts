import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDefaultUserId } from '@/lib/default-user';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const poem = await prisma.poem.findUnique({
      where: { id: params.id },
      include: {
        explainCard: true,
        revisions: {
          orderBy: { version: 'desc' },
        },
        user: {
          select: { name: true, avatar: true },
        },
      },
    });

    if (!poem) {
      return NextResponse.json({ error: '诗歌不存在' }, { status: 404 });
    }

    // Increment view count
    await prisma.poem.update({
      where: { id: params.id },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json(poem);
  } catch (error) {
    console.error('Fetch poem error:', error);
    return NextResponse.json({ error: '获取诗歌失败' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getDefaultUserId();

    const poem = await prisma.poem.findUnique({
      where: { id: params.id },
      include: { revisions: true },
    });

    if (!poem) {
      return NextResponse.json({ error: '诗歌不存在' }, { status: 404 });
    }

    const body = await request.json();
    
    if (body.content && body.content !== poem.content) {
      await prisma.poemRevision.create({
        data: {
          poemId: poem.id,
          version: poem.revisions.length + 1,
          content: poem.content,
          title: poem.title,
          changedBy: 'user',
        },
      });
    }

    const updated = await prisma.poem.update({
      where: { id: params.id },
      data: {
        title: body.title,
        content: body.content,
        isDraft: body.isDraft ?? poem.isDraft,
        isPublic: body.isPublic ?? poem.isPublic,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update poem error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.poem.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete poem error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}

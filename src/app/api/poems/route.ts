import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDefaultUserId } from '@/lib/default-user';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const isPublic = searchParams.get('public') === 'true';
    const sort = searchParams.get('sort') || 'latest';

    if (isPublic) {
      const where = { isPublic: true };
      const orderBy = sort === 'popular'
        ? [{ viewCount: 'desc' as const }, { likeCount: 'desc' as const }]
        : [{ createdAt: 'desc' as const }];

      const [poems, total] = await Promise.all([
        prisma.poem.findMany({
          where,
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            user: { select: { name: true, avatar: true } },
          },
        }),
        prisma.poem.count({ where }),
      ]);

      return NextResponse.json({
        poems,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    const userId = await getDefaultUserId();
    const where = { userId };

    const [poems, total] = await Promise.all([
      prisma.poem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { explainCard: true },
      }),
      prisma.poem.count({ where }),
    ]);

    return NextResponse.json({
      poems,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Fetch poems error:', error);
    // 优雅降级：数据库不可用时返回空列表而非 500
    return NextResponse.json({
      poems: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  }
}

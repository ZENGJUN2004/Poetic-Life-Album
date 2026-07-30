import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const rows = await prisma.photoAnalysis.findMany({
      take: 20,
      orderBy: { analyzedAt: 'desc' },
      select: {
        photoId: true,
        aiModel: true,
        dominantColors: true,
        objects: true,
        scenes: true,
        emotions: true,
        aestheticScore: true,
      },
    });
    return NextResponse.json({
      count: rows.length,
      rows: rows.map((r) => ({
        ...r,
        _dc_parsed: r.dominantColors ? safeParse(r.dominantColors, null) : null,
        _obj_parsed: r.objects ? safeParse(r.objects, null) : null,
        _sc_parsed: r.scenes ? safeParse(r.scenes, null) : null,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

function safeParse<T = unknown>(x: unknown, fb: T): T {
  if (!x) return fb;
  try { return JSON.parse(String(x)) as T; } catch { return fb; }
}

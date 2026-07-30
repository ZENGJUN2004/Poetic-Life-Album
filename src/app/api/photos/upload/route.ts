import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDefaultUserId } from '@/lib/default-user';
import { saveImageFile, validateImageFile } from '@/lib/storage';
import { APP_CONFIG } from '@/lib/constants';
import { analyzeImageBuffer } from '@/lib/vision-heuristics';

export async function POST(request: Request) {
  try {
    const userId = await getDefaultUserId();

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: '没有上传文件' }, { status: 400 });
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      const validation = validateImageFile(file.type, file.size, APP_CONFIG.maxUploadSize);
      
      if (!validation.valid) {
        errors.push({ file: file.name, error: validation.error });
        continue;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const saved = await saveImageFile(buffer, file.type, userId);
        
        const photo = await prisma.photo.create({
          data: {
            userId,
            url: saved.url,
            thumbnailUrl: saved.url,
            isPrivate: true,
          },
        });

        // Cache a zero-dependency heuristic analysis so downstream generate
        // has real visual features to work with even without an AI API key.
        try {
          const ana = analyzeImageBuffer(buffer, file.type);
          const extraStats = {
            ...ana._stats,
            dominantColors: ana.dominantColors,
            scene: ana.scene,
            objects: ana.objects,
            emotion: ana.emotion,
          };
          await prisma.photoAnalysis.create({
            data: {
              photoId: photo.id,
              dominantColors: JSON.stringify(ana.dominantColors),
              objects: JSON.stringify(ana.objects),
              scenes: JSON.stringify([ana.scene]),
              emotions: JSON.stringify([ana.emotion]),
              composition: JSON.stringify({
                rule: ana.composition,
                centerOfMass: ana._stats.centerOfMass,
                stats: extraStats,
              }),
              aestheticScore: ana.aestheticScore,
              aiModel: 'heuristics:v1',
            },
          });
        } catch (anaErr) {
          console.error('Heuristic analysis failed for', file.name, anaErr);
        }

        results.push(photo);
      } catch (error) {
        console.error('Error processing file:', file.name, error);
        errors.push({ file: file.name, error: '处理失败' });
      }
    }

    return NextResponse.json({
      photos: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const userId = await getDefaultUserId();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { analysis: true },
      }),
      prisma.photo.count({ where: { userId } }),
    ]);

    return NextResponse.json({
      photos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch photos error:', error);
    return NextResponse.json({ error: '获取照片失败' }, { status: 500 });
  }
}

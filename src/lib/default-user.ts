import { prisma } from '@/lib/prisma';

let cachedUserId: string | null = null;

export async function getDefaultUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;

  // Find or create a default user
  let user = await prisma.user.findUnique({
    where: { email: 'guest@poetic-realm.local' },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'guest@poetic-realm.local',
        name: '诗意旅人',
      },
    });
  }

  cachedUserId = user.id;
  return user.id;
}

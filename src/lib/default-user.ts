import { prisma } from '@/lib/prisma';

let cachedUserId: string | null = null;

const FALLBACK_USER_ID = 'guest-local-user';

export async function getDefaultUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;

  try {
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
  } catch (error) {
    console.error('getDefaultUserId: database unavailable, using fallback');
    return FALLBACK_USER_ID;
  }
}

import { prisma } from './prisma';
import { SESSION_STATUS_FLOW } from './constants';

export type SessionStatus = string;
export type CreativeMode = string;

export interface CreateSessionInput {
  userId: string;
  mode?: string;
  title?: string;
}

export interface TransitionResult {
  success: boolean;
  previousStatus?: string;
  newStatus?: string;
  error?: string;
}

export class CreativeStateMachine {
  async createSession(input: CreateSessionInput) {
    return prisma.creativeSession.create({
      data: {
        userId: input.userId,
        mode: input.mode || 'FREE',
        title: input.title,
        status: 'UPLOADING',
      },
    });
  }

  async getSession(sessionId: string) {
    return prisma.creativeSession.findUnique({
      where: { id: sessionId },
      include: {
        photos: true,
        poem: true,
        steps: true,
      },
    });
  }

  async getUserSessions(userId: string, status?: string) {
    const where: { userId: string; status?: string } = { userId };
    if (status) where.status = status;

    return prisma.creativeSession.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        photos: true,
        poem: true,
      },
    });
  }

  async transitionTo(
    sessionId: string,
    targetStatus: SessionStatus
  ): Promise<TransitionResult> {
    const session = await prisma.creativeSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return { success: false, error: '会话不存在' };
    }

    const allowedTransitions = SESSION_STATUS_FLOW[session.status] || [];
    if (!allowedTransitions.includes(targetStatus)) {
      return {
        success: false,
        previousStatus: session.status,
        error: `不允许从 ${session.status} 转换到 ${targetStatus}`,
      };
    }

    const updated = await prisma.creativeSession.update({
      where: { id: sessionId },
      data: {
        status: targetStatus,
        completedAt: targetStatus === 'COMPLETED' ? new Date() : undefined,
      },
    });

    return {
      success: true,
      previousStatus: session.status,
      newStatus: updated.status,
    };
  }

  async addStep(
    sessionId: string,
    stepType: string,
    input?: string
  ) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('会话不存在');

    const nextStepNumber = session.steps.length + 1;
    // SessionStep duration is INT so any updateStep.write must not overflow 32-bit
    const step = await prisma.sessionStep.create({
      data: {
        sessionId,
        stepNumber: nextStepNumber,
        stepType,
        input,
        status: 'pending',
      },
    });
    (step as any).__startedAt = Date.now();
    return step;
  }

  async updateStep(
    stepId: string,
    data: {
      status?: string;
      output?: string;
      duration?: number;
      errorMsg?: string;
      aiModel?: string;
    }
  ) {
    const normalizedData = { ...data };
    // SQLite INT column: clamp duration to seconds (max 2^31-1) to avoid overflow
    if (normalizedData.duration !== undefined && normalizedData.duration !== null) {
      let d = Number(normalizedData.duration);
      if (!isFinite(d) || d < 0) d = 0;
      // If value looks like epoch ms (>1e9), convert to seconds
      if (d > 1_000_000_000) d = Math.round(d / 1000);
      if (d > 2_000_000_000) d = 2_000_000_000;
      normalizedData.duration = d;
    }
    return prisma.sessionStep.update({
      where: { id: stepId },
      data: {
        ...normalizedData,
        completedAt: normalizedData.status === 'completed' ? new Date() : undefined,
        startedAt: normalizedData.status && normalizedData.status !== 'pending' ? new Date() : undefined,
      },
    });
  }

  async setMeaning(sessionId: string, meaning: string, confirmed: boolean = false) {
    return prisma.creativeSession.update({
      where: { id: sessionId },
      data: {
        meaning,
        meaningConfirmed: confirmed,
      },
    });
  }

  async addPhotoToSession(sessionId: string, photoId: string) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('会话不存在');

    await prisma.creativeSession.update({
      where: { id: sessionId },
      data: {
        photos: {
          connect: { id: photoId },
        },
      },
    });
  }

  async completeSession(sessionId: string) {
    return this.transitionTo(sessionId, 'COMPLETED');
  }

  async failSession(sessionId: string) {
    return this.transitionTo(sessionId, 'FAILED');
  }

  async abandonSession(sessionId: string) {
    return this.transitionTo(sessionId, 'ABANDONED');
  }
}

export const csm = new CreativeStateMachine();

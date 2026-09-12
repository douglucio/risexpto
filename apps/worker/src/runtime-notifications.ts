import type { Prisma, PrismaClient } from '@risexpto/database';

export async function notifyTrader(
  database: PrismaClient,
  input: { userId: string; botId: string; connectionId?: string | null; type: string; severity?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'; title: string; body: string; data?: Record<string, unknown> },
) {
  await database.notification.create({
    data: {
      userId: input.userId,
      botId: input.botId,
      connectionId: input.connectionId ?? null,
      channel: 'IN_APP',
      status: 'PENDING',
      severity: input.severity ?? 'INFO',
      type: input.type,
      title: input.title,
      body: input.body,
      ...(input.data ? { data: input.data as Prisma.InputJsonValue } : {}),
    },
  });
}

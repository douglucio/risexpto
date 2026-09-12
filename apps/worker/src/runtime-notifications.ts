import { createHash } from 'node:crypto';
import type { Prisma, PrismaClient } from '@risexpto/database';

export async function notifyTrader(
  database: PrismaClient,
  input: { userId: string; botId: string; connectionId?: string | null; type: string; severity?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'; title: string; body: string; data?: Record<string, unknown>; dedupeWindowMs?: number },
) {
  const dedupeKey = `${input.type}:${createHash('sha256').update(JSON.stringify(input.data ?? {})).digest('hex').slice(0, 24)}`;
  const recent = typeof database.notification.findFirst === 'function'
    ? await database.notification.findFirst({ where: { botId: input.botId, dedupeKey, createdAt: { gte: new Date(Date.now() - (input.dedupeWindowMs ?? 300_000)) } }, select: { id: true } })
    : null;
  if (recent) return recent;
  await database.notification.create({
    data: {
      userId: input.userId,
      botId: input.botId,
      connectionId: input.connectionId ?? null,
      channel: 'IN_APP',
      status: 'PENDING',
      severity: input.severity ?? 'INFO',
      type: input.type,
      dedupeKey,
      title: input.title,
      body: input.body,
      ...(input.data ? { data: input.data as Prisma.InputJsonValue } : {}),
    },
  });
}

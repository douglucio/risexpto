import type { PrismaClient } from '@risexpto/database';
import type { Queue } from 'bullmq';
import type { WorkerJob } from './queue.js';
import { runtimeExecutionProfileForTrader } from '@risexpto/digital-traders';

export function paperCycleJobId(botId: string, scheduledAt: number): string {
  if (!botId || !Number.isFinite(scheduledAt)) throw new Error('Invalid paper cycle identity');
  return `paper-cycle:${botId}:${scheduledAt}`;
}

export async function schedulePaperCycles(
  database: PrismaClient,
  queue: Pick<Queue<WorkerJob>, 'add'>,
  now = new Date(),
): Promise<number> {
  const bots = await database.bot.findMany({
    where: { status: 'RUNNING', tradingMode: 'PAPER', archivedAt: null },
    select: {
      id: true,
      digitalTraderSlug: true,
      nextRunAt: true,
      configuration: { select: { parameters: true, evaluationIntervalMs: true } },
    },
  });
  let scheduled = 0;
  for (const bot of bots) {
    const intervalMs = intervalFrom(bot.configuration?.evaluationIntervalMs)
      ?? (bot.digitalTraderSlug ? intervalFrom(runtimeExecutionProfileForTrader(bot.digitalTraderSlug).evaluationIntervalMs) : null)
      // Legacy rows created before the execution profile migration remain schedulable.
      ?? intervalFromParameters(bot.configuration?.parameters);
    if (!intervalMs || (bot.nextRunAt !== null && bot.nextRunAt > now)) continue;
    const scheduledAt = bot.nextRunAt ?? now;
    const nextRunAt = new Date(
      Math.max(now.getTime() + intervalMs, scheduledAt.getTime() + intervalMs),
    );
    const claimed = await database.bot.updateMany({
      where: {
        id: bot.id,
        status: 'RUNNING',
        tradingMode: 'PAPER',
        archivedAt: null,
        nextRunAt: bot.nextRunAt,
      },
      data: { nextRunAt },
    });
    if (claimed.count !== 1) continue;
    await queue.add(
      'bot-cycle',
      { type: 'bot-cycle', botId: bot.id },
      {
        jobId: paperCycleJobId(bot.id, scheduledAt.getTime()),
        attempts: 3,
        backoff: { type: 'exponential', delay: 1_000 },
        removeOnComplete: { age: 86_400, count: 10_000 },
        removeOnFail: false,
      },
    );
    scheduled += 1;
  }
  return scheduled;
}

function intervalFrom(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1_000 &&
    value <= 86_400_000
    ? value
    : null;
}

function intervalFromParameters(parameters: unknown): number | null {
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters) || !('intervalMs' in parameters)) return null;
  return intervalFrom(parameters.intervalMs);
}

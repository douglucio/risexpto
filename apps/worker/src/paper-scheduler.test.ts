import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@risexpto/database';
import { paperCycleJobId, schedulePaperCycles } from './paper-scheduler.js';

describe('paper scheduler', () => {
  it('claims due PAPER bots and enqueues deterministic cycles', async () => {
    const now = new Date('2026-09-08T12:00:00.000Z');
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const add = vi.fn().mockResolvedValue({ id: 'paper-cycle:bot-1:176' });
    const database = {
      bot: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'bot-1', nextRunAt: null, configuration: { parameters: { intervalMs: 60_000 } } },
          {
            id: 'bot-2',
            nextRunAt: new Date(now.getTime() + 1_000),
            configuration: { parameters: { intervalMs: 60_000 } },
          },
          { id: 'bot-3', nextRunAt: null, configuration: { parameters: { intervalMs: 500 } } },
        ]),
        updateMany,
      },
    } as unknown as PrismaClient;

    await expect(schedulePaperCycles(database, { add }, now)).resolves.toBe(1);
    const claim = updateMany.mock.calls[0] as unknown as [
      { where: { id: string; nextRunAt: Date | null } },
    ];
    expect(claim[0].where).toMatchObject({ id: 'bot-1', nextRunAt: null });
    const call = add.mock.calls[0] as unknown as [
      string,
      { type: string; botId: string },
      { jobId: string },
    ];
    expect(call[0]).toBe('bot-cycle');
    expect(call[1]).toEqual({ type: 'bot-cycle', botId: 'bot-1' });
    expect(call[2].jobId).toBe(paperCycleJobId('bot-1', now.getTime()));
  });

  it('does not enqueue when another scheduler wins the atomic claim', async () => {
    const database = {
      bot: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { id: 'bot-1', nextRunAt: null, configuration: { parameters: { intervalMs: 60_000 } } },
          ]),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    } as unknown as PrismaClient;
    const add = vi.fn();
    await expect(schedulePaperCycles(database, { add }, new Date())).resolves.toBe(0);
    expect(add).not.toHaveBeenCalled();
  });

  it('schedules every catalog trader from its execution profile without strategy intervalMs', async () => {
    const now = new Date('2026-09-08T12:00:00.000Z');
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const add = vi.fn().mockResolvedValue({ id: 'job' });
    const database = {
      bot: {
        findMany: vi.fn().mockResolvedValue(['atlas', 'luna', 'dca-one', 'pulse'].map((digitalTraderSlug) => ({
          id: `bot-${digitalTraderSlug}`,
          digitalTraderSlug,
          nextRunAt: null,
          configuration: { parameters: {}, evaluationIntervalMs: 60_000 },
        }))),
        updateMany,
      },
    } as unknown as PrismaClient;

    await expect(schedulePaperCycles(database, { add }, now)).resolves.toBe(4);
    expect(add).toHaveBeenCalledTimes(4);
    expect(updateMany).toHaveBeenCalledTimes(4);
  });
});

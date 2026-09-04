import { describe, expect, it, vi } from 'vitest';
import { reserveCapital } from './paper-cycle.js';

describe('reserveCapital concurrency', () => {
  it('approves only one concurrent reservation within the global limit', async () => {
    const botAllocations = new Map<string, number>();
    let globalAllocation = 0;
    const reservations = new Set<string>();
    const transaction = vi.fn((callback: (tx: unknown) => Promise<boolean>) => callback(database));
    const database = {
      paperCapitalReservation: {
        findUnique: vi.fn(({ where }: { where: { proposalId: string } }) =>
          reservations.has(where.proposalId) ? { status: 'ACTIVE' } : null),
        create: vi.fn(({ data }: { data: { proposalId: string } }) => { reservations.add(data.proposalId); }),
      },
      paperCapitalAllocation: {
        upsert: vi.fn(({ where }: { where: { botId: string } }) => { if (!botAllocations.has(where.botId)) botAllocations.set(where.botId, 0); }),
        updateMany: vi.fn(({ where, data }: { where: { botId: string; allocated: { lte?: number; gte?: number } }; data: { allocated: { increment?: number; decrement?: number } } }) => {
          const current = botAllocations.get(where.botId) ?? 0;
          if (where.allocated.lte !== undefined && current > where.allocated.lte) return { count: 0 };
          if (where.allocated.gte !== undefined && current < where.allocated.gte) return { count: 0 };
          botAllocations.set(where.botId, current + (data.allocated.increment ?? 0) - (data.allocated.decrement ?? 0));
          return { count: 1 };
        }),
      },
      botConfiguration: { aggregate: vi.fn().mockResolvedValue({ _sum: { authorizedCapital: 100 } }) },
      paperGlobalCapitalAllocation: {
        upsert: vi.fn(),
        updateMany: vi.fn(({ where, data }: { where: { id: string; allocated: { lte: number } }; data: { allocated: { increment: number } } }) => {
          if (globalAllocation > where.allocated.lte) return { count: 0 };
          globalAllocation += data.allocated.increment;
          return { count: 1 };
        }),
      },
      $transaction: transaction,
    } as never;

    const results = await Promise.all([
      reserveCapital(database, 'bot-a', 'proposal-a', 100, 80),
      reserveCapital(database, 'bot-b', 'proposal-b', 100, 80),
    ]);

    expect(results.sort()).toEqual([false, true]);
    expect(globalAllocation).toBe(80);
    expect([...botAllocations.values()].sort()).toEqual([0, 80]);
    expect(reservations).toHaveLength(1);
  });
});

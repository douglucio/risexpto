import { describe, expect, it, vi } from 'vitest';
import { processPaperCycle } from './paper-cycle.js';

describe('processPaperCycle', () => {
  it('persists a safe completion when market data is unavailable', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'event-1' });
    const database = {
      bot: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'bot-1',
          strategyVersionId: 'strategy-1',
          configuration: { parameters: {}, allowedSymbols: ['BTCUSDT'] },
          strategyVersion: { version: 1, implementationKey: 'dca', definition: {} },
          userId: 'user-1',
        }),
      },
      botEvent: { create },
      marketSnapshot: { findFirst: vi.fn().mockResolvedValue(null) },
      killSwitchState: { findFirst: vi.fn().mockResolvedValue(null) },
    } as never;

    await processPaperCycle(database, { id: 'job-1', data: { type: 'bot-cycle', botId: 'bot-1' } } as never);

    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1]?.[0]).toEqual({
      data: { botId: 'bot-1', type: 'CYCLE_COMPLETED', payload: { jobId: 'job-1', reason: 'MARKET_DATA_UNAVAILABLE' } },
    });
  });

  it('blocks a cycle when a persistent kill switch is active', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'event-1' });
    const database = {
      bot: { findFirst: vi.fn().mockResolvedValue({ id: 'bot-1', userId: 'user-1', configuration: {}, strategyVersion: {} }) },
      killSwitchState: { findFirst: vi.fn().mockResolvedValue({ scope: 'SYSTEM', reason: 'incident' }) },
      botEvent: { create },
    } as never;
    await processPaperCycle(database, { id: 'job-2', data: { type: 'bot-cycle', botId: 'bot-1' } } as never);
    expect(create).toHaveBeenCalledWith({
      data: { botId: 'bot-1', type: 'CYCLE_BLOCKED', payload: { jobId: 'job-2', scope: 'SYSTEM', reason: 'incident' } },
    });
  });
});

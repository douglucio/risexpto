import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@risexpto/database';
import { assertFreshMarketData, syncRunningBotMarketData } from './market-data-runtime.js';

describe('market data runtime', () => {
  it('derives unique symbols from running bots and upserts public candles', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const database = {
      bot: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { configuration: { allowedSymbols: ['BTCUSDT'], parameters: { symbol: 'ethusdt' } } },
            { configuration: { allowedSymbols: ['BTCUSDT', 'INVALID!'], parameters: {} } },
          ]),
      },
      marketSnapshot: { upsert },
    } as unknown as PrismaClient;
    const candle = {
      openTime: 1_000,
      closeTime: 59_999,
      open: '100',
      high: '101',
      low: '99',
      close: '100.5',
      volume: '12',
      trades: 8,
      quoteVolume: '1206',
    };
    const client = { candles: vi.fn().mockResolvedValue([candle]) };

    await expect(syncRunningBotMarketData(database, client)).resolves.toEqual({
      symbols: 2,
      snapshots: 2,
    });
    expect(client.candles).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          provider_symbol_interval_openTime: {
            provider: 'BINANCE',
            symbol: 'BTCUSDT',
            interval: '1m',
            openTime: new Date(1_000),
          },
        },
      }),
    );
  });

  it('rejects snapshots older than the configured freshness window', () => {
    expect(() => assertFreshMarketData(new Date(1_000), 121_001, 120_000)).toThrow(
      'STALE_MARKET_DATA',
    );
    expect(() => assertFreshMarketData(new Date(1_000), 121_000, 120_000)).not.toThrow();
  });
});

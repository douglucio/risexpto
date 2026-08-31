import { describe, expect, it, vi } from 'vitest';
import { BinancePublicMarketDataClient } from './client.js';
import { CircuitOpenError } from './errors.js';

const response = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: () => Promise.resolve(body) }) as Response;

describe('BinancePublicMarketDataClient', () => {
  it('maps public exchange info and rejects malformed candles', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      response({
        timezone: 'UTC',
        serverTime: 1,
        symbols: [
          {
            symbol: 'BTCUSDT',
            status: 'TRADING',
            baseAsset: 'BTC',
            quoteAsset: 'USDT',
            baseAssetPrecision: 8,
            quoteAssetPrecision: 8,
            orderTypes: ['LIMIT'],
            isSpotTradingAllowed: true,
            filters: [{ filterType: 'LOT_SIZE', minQty: '0.001', maxQty: '10', stepSize: '0.001' }],
          },
        ],
      }),
    );
    const client = new BinancePublicMarketDataClient(
      { restBaseUrl: 'https://example.test' },
      { fetch: fetcher },
    );
    expect((await client.symbols())[0]?.filters[0]).toEqual({
      type: 'LOT_SIZE',
      minQuantity: '0.001',
      maxQuantity: '10',
      stepSize: '0.001',
    });
    expect(fetcher).toHaveBeenCalledWith(
      expect.objectContaining({ href: 'https://example.test/api/v3/exchangeInfo' }),
      expect.anything(),
    );
  });

  it('retries transient failures and opens the circuit after repeated errors', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response({ error: 'down' }, false, 503));
    const client = new BinancePublicMarketDataClient(
      { maxRetries: 0, circuitFailureThreshold: 2, retryBaseDelayMs: 0 },
      { fetch: fetcher, sleep: () => Promise.resolve() },
    );
    await expect(client.price('BTCUSDT')).rejects.toThrow('503');
    await expect(client.price('BTCUSDT')).rejects.toThrow('503');
    await expect(client.price('BTCUSDT')).rejects.toBeInstanceOf(CircuitOpenError);
    expect(client.health().status).toBe('unhealthy');
    expect(client.metrics().failures).toBe(2);
  });

  it('validates symbols and candle limits before making requests', async () => {
    const client = new BinancePublicMarketDataClient({}, { fetch: vi.fn() });
    await expect(client.price('bad symbol')).rejects.toThrow('Invalid Binance symbol');
    await expect(client.candles('BTCUSDT', '1m', 1001)).rejects.toThrow('between 1 and 1000');
  });
});

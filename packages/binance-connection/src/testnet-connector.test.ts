import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { BinanceConnectionError } from './errors.js';
import { BinanceSpotTestnetConnector } from './testnet-connector.js';

const response = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) }) as Response;

describe('BinanceSpotTestnetConnector', () => {
  it('rejects production endpoints before any request', () => {
    expect(
      () => new BinanceSpotTestnetConnector('key', 'secret', {}, 'https://api.binance.com'),
    ).toThrow('rejects non-Testnet');
  });

  it('signs and maps a Testnet order request', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({
          symbols: [
            {
              symbol: 'BTCUSDT',
              status: 'TRADING',
              isSpotTradingAllowed: true,
              orderTypes: ['MARKET'],
              filters: [
                { filterType: 'LOT_SIZE', minQty: '0.0001', maxQty: '100', stepSize: '0.0001' },
                { filterType: 'MIN_NOTIONAL', minNotional: '5' },
              ],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        response({ orderId: 42, clientOrderId: 'bot-1-1', status: 'FILLED', executedQty: '0.001' }),
      );
    const connector = new BinanceSpotTestnetConnector('api-key', 'api-secret', {
      fetch: fetcher,
      now: () => 1_700_000_000_000,
    });
    await expect(
      connector.submit({
        clientOrderId: 'bot-1-1',
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quoteAmount: '10',
      }),
    ).resolves.toEqual({
      clientOrderId: 'bot-1-1',
      externalOrderId: '42',
      status: 'FILLED',
      filledQuantity: '0.001',
    });
    const requestUrl = fetcher.mock.calls[1]?.[0] as URL;
    const params = new URL(requestUrl).searchParams;
    const signature = params.get('signature');
    params.delete('signature');
    expect(signature).toBe(
      createHmac('sha256', 'api-secret').update(params.toString()).digest('hex'),
    );
    expect(requestUrl.origin).toBe('https://testnet.binance.vision');
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      headers: { accept: 'application/json' },
    });
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      headers: { 'X-MBX-APIKEY': 'api-key' },
    });
  });

  it('validates order shape and maps query/cancel terminal states', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({ orderId: 42, origClientOrderId: 'bot-1-1', status: 'CANCELED' }),
      )
      .mockResolvedValueOnce(
        response({ orderId: 42, origClientOrderId: 'bot-1-1', status: 'CANCELED' }),
      );
    const connector = new BinanceSpotTestnetConnector('key', 'secret', { fetch: fetcher });
    await expect(
      connector.submit({
        clientOrderId: 'bad id',
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: '1',
      }),
    ).rejects.toThrow(BinanceConnectionError);
    await expect(connector.query('bot-1-1')).resolves.toMatchObject({ status: 'CANCELED' });
    await expect(connector.cancel('bot-1-1')).resolves.toMatchObject({ status: 'CANCELED' });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect((fetcher.mock.calls[0]?.[1] as RequestInit).method).toBe('GET');
    expect((fetcher.mock.calls[1]?.[1] as RequestInit).method).toBe('DELETE');
  });
});

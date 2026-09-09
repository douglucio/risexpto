import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@risexpto/database';
import { LiveExecutionEngine, type LiveConnector } from '@risexpto/live-execution';
import { PrismaLiveOrderStore } from './live-order-store.js';

type Row = Record<string, unknown>;

const request = {
  clientOrderId: 'bot-1-1',
  symbol: 'BTCUSDT',
  side: 'BUY' as const,
  type: 'MARKET' as const,
  quoteAmount: '10',
};

describe('PrismaLiveOrderStore', () => {
  it('creates a LIVE order before submit and resolves it idempotently', async () => {
    const rows = new Map<string, Row>();
    const create = vi.fn(({ data }: { data: Row & { clientOrderId: string } }) => {
      const row = { ...data, externalOrderId: null, filledQuantity: '0', limitPrice: null };
      rows.set(data.clientOrderId, row);
      return Promise.resolve(row);
    });
    const update = vi.fn(({ where, data }: { where: { clientOrderId: string }; data: Row }) => {
      const row = { ...(rows.get(where.clientOrderId) ?? {}), ...data };
      rows.set(where.clientOrderId, row);
      return Promise.resolve(row);
    });
    const database = {
      order: {
        findUnique: vi.fn(({ where }: { where: { clientOrderId: string } }): Promise<Row | undefined> => Promise.resolve(rows.get(where.clientOrderId))),
        create,
        update,
      },
    } as unknown as PrismaClient;
    const store = new PrismaLiveOrderStore(database, () => Promise.resolve({
      botId: 'bot-1', exchangeConnectionId: 'connection-1', tradeProposalId: 'proposal-1', idempotencyKey: 'live:proposal-1',
    }));

    await expect(store.createPending({ request, result: null, state: 'PENDING_SUBMIT' })).resolves.toMatchObject({
      state: 'PENDING_SUBMIT',
      result: null,
    });
    await store.resolve(request.clientOrderId, {
      clientOrderId: request.clientOrderId,
      externalOrderId: '42',
      status: 'FILLED',
      filledQuantity: '0.001',
    });
    await expect(store.find(request.clientOrderId)).resolves.toMatchObject({
      state: 'RESOLVED',
      result: { externalOrderId: '42', status: 'FILLED', filledQuantity: '0.001' },
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('recovers after restart and ignores a duplicate pending-order creation', async () => {
    const rows = new Map<string, Row>();
    const create = vi.fn(({ data }: { data: Row & { clientOrderId: string } }) => {
      if (rows.has(data.clientOrderId)) {
        return Promise.reject(Object.assign(new Error('duplicate order'), { code: 'P2002' }));
      }
      const row = {
        ...data,
        externalOrderId: null,
        filledQuantity: '0',
        requestedQuantity: null,
        requestedQuoteAmount: data.requestedQuoteAmount ?? null,
        limitPrice: null,
      };
      rows.set(data.clientOrderId, row);
      return Promise.resolve(row);
    });
    const database = {
      order: {
        findUnique: vi.fn(({ where }: { where: { clientOrderId: string } }): Promise<Row | undefined> => Promise.resolve(rows.get(where.clientOrderId))),
        create,
        update: vi.fn(({ where, data }: { where: { clientOrderId: string }; data: Row }) => {
          const row = { ...(rows.get(where.clientOrderId) ?? {}), ...data };
          rows.set(where.clientOrderId, row);
          return Promise.resolve(row);
        }),
      },
    } as unknown as PrismaClient;
    const resolveContext = () => Promise.resolve({
      botId: 'bot-1', exchangeConnectionId: 'connection-1', tradeProposalId: 'proposal-1', idempotencyKey: 'live:proposal-1',
    });
    const firstResult = {
      clientOrderId: request.clientOrderId,
      externalOrderId: '42',
      status: 'FILLED' as const,
      filledQuantity: '0.001',
    };
    const firstStore = new PrismaLiveOrderStore(database, resolveContext);
    const restartedStore = new PrismaLiveOrderStore(database, resolveContext);
    await firstStore.createPending({ request, result: null, state: 'PENDING_SUBMIT' });
    await expect(restartedStore.createPending({ request, result: null, state: 'PENDING_SUBMIT' })).resolves.toMatchObject({
      state: 'PENDING_SUBMIT',
      result: null,
    });
    const firstSubmit = vi.fn();
    const firstQuery = vi.fn().mockResolvedValue(firstResult);
    const firstConnector: LiveConnector = {
      submit: firstSubmit,
      query: firstQuery,
      cancel: vi.fn(),
    };
    const firstEngine = new LiveExecutionEngine(firstConnector, true, firstStore);
    await expect(firstEngine.submit(request)).resolves.toEqual(firstResult);

    const secondSubmit = vi.fn();
    const secondConnector: LiveConnector = { submit: secondSubmit, query: vi.fn(), cancel: vi.fn() };
    const restartedEngine = new LiveExecutionEngine(secondConnector, true, restartedStore);
    await expect(restartedEngine.submit(request)).resolves.toEqual(firstResult);
    expect(firstSubmit).not.toHaveBeenCalled();
    expect(firstQuery).toHaveBeenCalledTimes(1);
    expect(secondSubmit).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(2);
  });
});

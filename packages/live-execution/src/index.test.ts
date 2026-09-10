import { describe, expect, it, vi } from 'vitest';
import { InMemoryLiveOrderStore, LiveExecutionEngine, type LiveConnector } from './index.js';

const order = {
  clientOrderId: 'bot-1-1',
  symbol: 'BTCUSDT',
  side: 'BUY' as const,
  type: 'MARKET' as const,
  quoteAmount: '10',
};
const result = {
  clientOrderId: order.clientOrderId,
  externalOrderId: 'exchange-1',
  status: 'FILLED' as const,
  filledQuantity: '0.001',
};
describe('LiveExecutionEngine', () => {
  it('fails closed and never calls connector unless explicitly enabled', async () => {
    const submit = vi.fn();
    const connector = { submit, query: vi.fn(), cancel: vi.fn() } as LiveConnector;
    await expect(new LiveExecutionEngine(connector).submit(order)).rejects.toThrow('disabled');
    expect(submit).not.toHaveBeenCalled();
  });
  it('does not duplicate an order and queries after uncertain submit', async () => {
    const submit = vi.fn().mockRejectedValue(new Error('timeout'));
    const query = vi.fn().mockResolvedValue(result);
    const connector: LiveConnector = {
      submit,
      query,
      cancel: vi.fn(),
    };
    const engine = new LiveExecutionEngine(connector, true, new InMemoryLiveOrderStore());
    await expect(engine.submit(order)).resolves.toEqual(result);
    await expect(engine.submit(order)).resolves.toEqual(result);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('reconciles before canceling and leaves terminal orders unchanged', async () => {
    const cancel = vi.fn();
    const connector: LiveConnector = {
      submit: vi.fn(),
      query: vi.fn().mockResolvedValue(result),
      cancel,
    };
    const store = new InMemoryLiveOrderStore();
    await store.createPending({ request: order, result: null, state: 'PENDING_SUBMIT' });
    const engine = new LiveExecutionEngine(connector, true, store);
    await expect(engine.cancel(order.clientOrderId)).resolves.toEqual(result);
    expect(cancel).not.toHaveBeenCalled();
  });

  it('persists an unresolved intent and never resubmits after recovery query failure', async () => {
    const submit = vi.fn().mockRejectedValue(new Error('timeout'));
    const query = vi.fn().mockRejectedValue(new Error('exchange unavailable'));
    const connector: LiveConnector = { submit, query, cancel: vi.fn() };
    const store = new InMemoryLiveOrderStore();
    const engine = new LiveExecutionEngine(connector, true, store);
    await expect(engine.submit(order)).rejects.toThrow('exchange unavailable');
    await expect(engine.submit(order)).rejects.toThrow('exchange unavailable');
    expect(submit).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('survives an engine restart using the same durable store', async () => {
    const store = new InMemoryLiveOrderStore();
    const firstConnector: LiveConnector = {
      submit: vi.fn().mockResolvedValue(result),
      query: vi.fn(),
      cancel: vi.fn(),
    };
    const firstEngine = new LiveExecutionEngine(firstConnector, true, store);
    await expect(firstEngine.submit(order)).resolves.toEqual(result);

    const secondSubmit = vi.fn();
    const secondConnector: LiveConnector = {
      submit: secondSubmit,
      query: vi.fn(),
      cancel: vi.fn(),
    };
    const restartedEngine = new LiveExecutionEngine(secondConnector, true, store);
    await expect(restartedEngine.submit(order)).resolves.toEqual(result);
    expect(secondSubmit).not.toHaveBeenCalled();
  });
});

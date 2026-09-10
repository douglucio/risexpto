export type LiveOrder = {
  clientOrderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity?: string;
  quoteAmount?: string;
  limitPrice?: string;
};
export type ExchangeOrder = {
  clientOrderId: string;
  externalOrderId: string;
  status: 'SUBMITTED' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'UNKNOWN';
  filledQuantity: string;
};
export type LiveConnector = {
  submit(order: LiveOrder): Promise<ExchangeOrder>;
  query(clientOrderId: string): Promise<ExchangeOrder>;
  cancel(clientOrderId: string): Promise<ExchangeOrder>;
};

export type LiveOrderRecord = {
  request: LiveOrder;
  result: ExchangeOrder | null;
  state: 'PENDING_SUBMIT' | 'RESOLVED';
};

export type LiveOrderStore = {
  find(clientOrderId: string): Promise<LiveOrderRecord | undefined>;
  createPending(record: LiveOrderRecord): Promise<LiveOrderRecord>;
  resolve(clientOrderId: string, result: ExchangeOrder): Promise<void>;
};

export class InMemoryLiveOrderStore implements LiveOrderStore {
  private readonly records = new Map<string, LiveOrderRecord>();

  async find(clientOrderId: string): Promise<LiveOrderRecord | undefined> {
    await Promise.resolve();
    const record = this.records.get(clientOrderId);
    return record ? cloneRecord(record) : undefined;
  }

  async createPending(record: LiveOrderRecord): Promise<LiveOrderRecord> {
    await Promise.resolve();
    const existing = this.records.get(record.request.clientOrderId);
    if (existing) return cloneRecord(existing);
    this.records.set(record.request.clientOrderId, cloneRecord(record));
    return cloneRecord(record);
  }

  async resolve(clientOrderId: string, result: ExchangeOrder): Promise<void> {
    await Promise.resolve();
    const existing = this.records.get(clientOrderId);
    if (!existing) throw new Error('LIVE_ORDER_NOT_RESERVED');
    this.records.set(clientOrderId, { ...existing, result: { ...result }, state: 'RESOLVED' });
  }
}

export class LiveExecutionEngine {
  constructor(
    private readonly connector: LiveConnector,
    private readonly allowLive = false,
    private readonly store: LiveOrderStore = new InMemoryLiveOrderStore(),
  ) {}
  async submit(order: LiveOrder): Promise<ExchangeOrder> {
    if (!this.allowLive) throw new Error('LIVE execution is disabled');
    const existing = await this.store.find(order.clientOrderId);
    if (existing?.result) return { ...existing.result };
    if (existing) {
      const recovered = await this.connector.query(order.clientOrderId);
      await this.store.resolve(order.clientOrderId, recovered);
      return { ...recovered };
    }
    const reserved = await this.store.createPending({
      request: { ...order },
      result: null,
      state: 'PENDING_SUBMIT',
    });
    if (reserved.result) return { ...reserved.result };
    if (reserved.request.clientOrderId !== order.clientOrderId)
      throw new Error('LIVE_ORDER_IDEMPOTENCY_CONFLICT');
    let result: ExchangeOrder;
    try {
      result = await this.connector.submit(order);
    } catch {
      // Never resubmit after an ambiguous failure. Query is the only safe recovery.
      result = await this.connector.query(order.clientOrderId);
    }
    await this.store.resolve(order.clientOrderId, result);
    return { ...result };
  }
  async reconcile(clientOrderId: string): Promise<ExchangeOrder> {
    const result = await this.connector.query(clientOrderId);
    await this.store.resolve(clientOrderId, result);
    return { ...result };
  }
  async cancel(clientOrderId: string): Promise<ExchangeOrder> {
    const current = await this.reconcile(clientOrderId);
    if (['FILLED', 'CANCELED', 'REJECTED'].includes(current.status)) return current;
    const result = await this.connector.cancel(clientOrderId);
    await this.store.resolve(clientOrderId, result);
    return { ...result };
  }
  async status(clientOrderId: string): Promise<ExchangeOrder | undefined> {
    const result = (await this.store.find(clientOrderId))?.result;
    return result ? { ...result } : undefined;
  }
}

function cloneRecord(record: LiveOrderRecord): LiveOrderRecord {
  return {
    ...record,
    request: { ...record.request },
    result: record.result ? { ...record.result } : null,
  };
}

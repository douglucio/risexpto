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

export class LiveExecutionEngine {
  private readonly orders = new Map<string, ExchangeOrder>();
  constructor(
    private readonly connector: LiveConnector,
    private readonly allowLive = false,
  ) {}
  async submit(order: LiveOrder): Promise<ExchangeOrder> {
    if (!this.allowLive) throw new Error('LIVE execution is disabled');
    const existing = this.orders.get(order.clientOrderId);
    if (existing) return { ...existing };
    let result: ExchangeOrder;
    try {
      result = await this.connector.submit(order);
    } catch {
      result = await this.connector.query(order.clientOrderId);
    }
    this.orders.set(order.clientOrderId, result);
    return { ...result };
  }
  async reconcile(clientOrderId: string): Promise<ExchangeOrder> {
    const result = await this.connector.query(clientOrderId);
    this.orders.set(clientOrderId, result);
    return { ...result };
  }
  async cancel(clientOrderId: string): Promise<ExchangeOrder> {
    const current = await this.reconcile(clientOrderId);
    if (['FILLED', 'CANCELED', 'REJECTED'].includes(current.status)) return current;
    const result = await this.connector.cancel(clientOrderId);
    this.orders.set(clientOrderId, result);
    return { ...result };
  }
  status(clientOrderId: string): ExchangeOrder | undefined {
    const result = this.orders.get(clientOrderId);
    return result ? { ...result } : undefined;
  }
}

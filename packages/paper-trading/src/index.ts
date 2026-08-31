export type Side = 'BUY' | 'SELL';
export type OrderStatus = 'FILLED' | 'REJECTED';
export type PaperOrder = {
  id: string;
  symbol: string;
  side: Side;
  quantity: number;
  price: number;
  fee: number;
  status: OrderStatus;
  createdAt: number;
};
export type Position = {
  symbol: string;
  quantity: number;
  averagePrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
};
export type Balance = { asset: string; free: number; locked: number };
export type PaperSnapshot = {
  balances: Balance[];
  positions: Position[];
  orders: PaperOrder[];
  realizedPnl: number;
  unrealizedPnl: number;
};

export class PaperTradingEngine {
  private readonly balances = new Map<string, number>();
  private readonly positions = new Map<string, Position>();
  private readonly orders: PaperOrder[] = [];
  private sequence = 0;

  constructor(
    initialBalances: Record<string, number>,
    private readonly feeRate = 0.001,
    private readonly now: () => number = Date.now,
  ) {
    if (feeRate < 0 || feeRate >= 1) throw new Error('Fee rate must be between 0 and 1');
    for (const [asset, amount] of Object.entries(initialBalances)) {
      if (!/^[A-Z0-9]{2,12}$/.test(asset) || !Number.isFinite(amount) || amount < 0)
        throw new Error('Invalid initial balance');
      this.balances.set(asset, amount);
    }
  }

  execute(symbol: string, side: Side, quantity: number, price: number): PaperOrder {
    const pair = parseSymbol(symbol);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0)
      throw new Error('Quantity and price must be positive');
    const [base, quote] = pair;
    const gross = quantity * price;
    const fee = gross * this.feeRate;
    const quoteBalance = this.balances.get(quote) ?? 0;
    const position = this.positions.get(symbol) ?? {
      symbol,
      quantity: 0,
      averagePrice: 0,
      realizedPnl: 0,
      unrealizedPnl: 0,
    };
    if (side === 'BUY') {
      if (quoteBalance < gross + fee) return this.reject(symbol, side, quantity, price);
      this.balances.set(quote, quoteBalance - gross - fee);
      this.balances.set(base, (this.balances.get(base) ?? 0) + quantity);
      const newQuantity = position.quantity + quantity;
      position.averagePrice =
        newQuantity > 0 ? (position.averagePrice * position.quantity + gross) / newQuantity : 0;
      position.quantity = newQuantity;
    } else {
      if (position.quantity < quantity) return this.reject(symbol, side, quantity, price);
      this.balances.set(base, (this.balances.get(base) ?? 0) - quantity);
      this.balances.set(quote, quoteBalance + gross - fee);
      position.realizedPnl += (price - position.averagePrice) * quantity - fee;
      position.quantity -= quantity;
      if (position.quantity === 0) position.averagePrice = 0;
    }
    this.positions.set(symbol, position);
    return this.fill(symbol, side, quantity, price, fee);
  }

  mark(symbol: string, marketPrice: number): Position {
    if (!Number.isFinite(marketPrice) || marketPrice <= 0)
      throw new Error('Market price must be positive');
    const position = this.positions.get(symbol);
    if (!position) throw new Error('Position not found');
    position.unrealizedPnl = (marketPrice - position.averagePrice) * position.quantity;
    return { ...position };
  }
  snapshot(): PaperSnapshot {
    return {
      balances: [...this.balances].map(([asset, free]) => ({ asset, free, locked: 0 })),
      positions: [...this.positions.values()].map((position) => ({ ...position })),
      orders: this.orders.map((order) => ({ ...order })),
      realizedPnl: [...this.positions.values()].reduce(
        (sum, position) => sum + position.realizedPnl,
        0,
      ),
      unrealizedPnl: [...this.positions.values()].reduce(
        (sum, position) => sum + position.unrealizedPnl,
        0,
      ),
    };
  }
  private fill(
    symbol: string,
    side: Side,
    quantity: number,
    price: number,
    fee: number,
  ): PaperOrder {
    const order = {
      id: `paper-${++this.sequence}`,
      symbol,
      side,
      quantity,
      price,
      fee,
      status: 'FILLED' as const,
      createdAt: this.now(),
    };
    this.orders.push(order);
    return order;
  }
  private reject(symbol: string, side: Side, quantity: number, price: number): PaperOrder {
    const order = {
      id: `paper-${++this.sequence}`,
      symbol,
      side,
      quantity,
      price,
      fee: 0,
      status: 'REJECTED' as const,
      createdAt: this.now(),
    };
    this.orders.push(order);
    return order;
  }
}

function parseSymbol(symbol: string): [string, string] {
  const normalized = symbol.trim().toUpperCase();
  const match = /^([A-Z0-9]{2,10})(USDT|USDC|BTC|ETH)$/.exec(normalized);
  if (!match) throw new Error('Unsupported spot symbol');
  return [match[1]!, match[2]!];
}

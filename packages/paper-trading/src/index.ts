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
  private readonly balances = new Map<string, Decimal>();
  private readonly positions = new Map<string, DecimalPosition>();
  private readonly orders: PaperOrder[] = [];
  private sequence = 0;

  constructor(
    initialBalances: Record<string, number>,
    private readonly feeRate = 0.001,
    private readonly now: () => number = Date.now,
  ) {
    if (new Decimal(feeRate).isNegative() || !new Decimal(feeRate).lessThan(1)) throw new Error('Fee rate must be between 0 and 1');
    for (const [asset, amount] of Object.entries(initialBalances)) {
      if (!/^[A-Z0-9]{2,12}$/.test(asset) || !Number.isFinite(amount) || amount < 0)
        throw new Error('Invalid initial balance');
      if (!Number.isFinite(amount)) throw new Error('Invalid initial balance');
      this.balances.set(asset, new Decimal(amount));
    }
  }

  execute(symbol: string, side: Side, quantity: number, price: number): PaperOrder {
    const pair = parseSymbol(symbol);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0)
      throw new Error('Quantity and price must be positive');
    const [base, quote] = pair;
    const quantityDecimal = new Decimal(quantity);
    const priceDecimal = new Decimal(price);
    const gross = quantityDecimal.times(priceDecimal);
    const fee = gross.times(this.feeRate);
    const quoteBalance = this.balances.get(quote) ?? new Decimal(0);
    const position = this.positions.get(symbol) ?? {
      symbol,
      quantity: new Decimal(0), averagePrice: new Decimal(0), realizedPnl: new Decimal(0), unrealizedPnl: new Decimal(0),
    };
    if (side === 'BUY') {
      if (quoteBalance.lessThan(gross.plus(fee))) return this.reject(symbol, side, quantity, price);
      this.balances.set(quote, quoteBalance.minus(gross).minus(fee));
      this.balances.set(base, (this.balances.get(base) ?? new Decimal(0)).plus(quantityDecimal));
      const newQuantity = position.quantity.plus(quantityDecimal);
      position.averagePrice = newQuantity.greaterThan(0) ? position.averagePrice.times(position.quantity).plus(gross).dividedBy(newQuantity) : new Decimal(0);
      position.quantity = newQuantity;
    } else {
      if (position.quantity.lessThan(quantityDecimal)) return this.reject(symbol, side, quantity, price);
      this.balances.set(base, (this.balances.get(base) ?? new Decimal(0)).minus(quantityDecimal));
      this.balances.set(quote, quoteBalance.plus(gross).minus(fee));
      position.realizedPnl = position.realizedPnl.plus(priceDecimal.minus(position.averagePrice).times(quantityDecimal).minus(fee));
      position.quantity = position.quantity.minus(quantityDecimal);
      if (position.quantity.isZero()) position.averagePrice = new Decimal(0);
    }
    this.positions.set(symbol, position);
    return this.fill(symbol, side, quantity, price, fee.toNumber());
  }

  mark(symbol: string, marketPrice: number): Position {
    if (!Number.isFinite(marketPrice) || marketPrice <= 0)
      throw new Error('Market price must be positive');
    const position = this.positions.get(symbol);
    if (!position) throw new Error('Position not found');
    position.unrealizedPnl = new Decimal(marketPrice).minus(position.averagePrice).times(position.quantity);
    return toPublicPosition(position);
  }
  snapshot(): PaperSnapshot {
    return {
      balances: [...this.balances].map(([asset, free]) => ({ asset, free: free.toNumber(), locked: 0 })),
      positions: [...this.positions.values()].map(toPublicPosition),
      orders: this.orders.map((order) => ({ ...order })),
      realizedPnl: [...this.positions.values()].reduce(
        (sum, position) => sum + position.realizedPnl.toNumber(),
        0,
      ),
      unrealizedPnl: [...this.positions.values()].reduce(
        (sum, position) => sum + position.unrealizedPnl.toNumber(),
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

type DecimalPosition = { symbol: string; quantity: Decimal; averagePrice: Decimal; realizedPnl: Decimal; unrealizedPnl: Decimal };
function toPublicPosition(position: DecimalPosition): Position { return { symbol: position.symbol, quantity: position.quantity.toNumber(), averagePrice: position.averagePrice.toNumber(), realizedPnl: position.realizedPnl.toNumber(), unrealizedPnl: position.unrealizedPnl.toNumber() }; }

function parseSymbol(symbol: string): [string, string] {
  const normalized = symbol.trim().toUpperCase();
  const match = /^([A-Z0-9]{2,10})(USDT|USDC|BTC|ETH)$/.exec(normalized);
  if (!match) throw new Error('Unsupported spot symbol');
  return [match[1]!, match[2]!];
}
import { Decimal } from 'decimal.js';

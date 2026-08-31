export type GridParameters = {
  symbol: string;
  lowerPrice: number;
  upperPrice: number;
  levels: number;
  capital: number;
  maxVolatility: number;
};
export type GridContext = {
  price: number;
  volatility: number;
  availableBalance: number;
  mode: 'PAPER' | 'LIVE';
};
export type GridOrder = { side: 'BUY' | 'SELL'; price: number; quoteAmount: number; level: number };
export function validateGridParameters(value: unknown): GridParameters {
  if (!value || typeof value !== 'object') throw new Error('Grid parameters are required');
  const p = value as Partial<GridParameters>;
  const symbol = typeof p.symbol === 'string' ? p.symbol.trim().toUpperCase() : '';
  if (
    !/^[A-Z0-9]{5,20}$/.test(symbol) ||
    !Number.isFinite(p.lowerPrice) ||
    !Number.isFinite(p.upperPrice) ||
    p.lowerPrice! <= 0 ||
    p.upperPrice! <= p.lowerPrice! ||
    !Number.isInteger(p.levels) ||
    p.levels! < 2 ||
    !Number.isFinite(p.capital) ||
    p.capital! <= 0 ||
    !Number.isFinite(p.maxVolatility) ||
    p.maxVolatility! < 0
  )
    throw new Error('Invalid Grid parameters');
  return {
    symbol,
    lowerPrice: p.lowerPrice!,
    upperPrice: p.upperPrice!,
    levels: p.levels!,
    capital: p.capital!,
    maxVolatility: p.maxVolatility!,
  };
}
export function buildGridOrders(parameters: GridParameters, context: GridContext): GridOrder[] {
  const p = validateGridParameters(parameters);
  if (
    context.mode !== 'PAPER' ||
    context.volatility > p.maxVolatility ||
    context.availableBalance < p.capital
  )
    return [];
  const step = (p.upperPrice - p.lowerPrice) / (p.levels - 1);
  const amount = p.capital / p.levels;
  return Array.from({ length: p.levels }, (_, i) => ({
    side: i === 0 || i % 2 === 0 ? 'BUY' : 'SELL',
    price: Number((p.lowerPrice + i * step).toFixed(8)),
    quoteAmount: amount,
    level: i,
  }));
}

import { MarketDataError } from './errors.js';

export type RawExchangeInfo = {
  timezone: string;
  serverTime: number;
  symbols: Array<{
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    baseAssetPrecision: number;
    quoteAssetPrecision: number;
    orderTypes: string[];
    isSpotTradingAllowed: boolean;
    filters: Record<string, unknown>[];
  }>;
};
export type RawCandle = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

const numberString = (value: unknown): value is string =>
  typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value);
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new MarketDataError('Invalid Binance payload');
  return value as Record<string, unknown>;
};
const string = (value: unknown, name: string): string => {
  if (typeof value !== 'string' || !value)
    throw new MarketDataError(`Invalid Binance payload field: ${name}`);
  return value;
};
const numeric = (value: unknown, name: string): string => {
  if (!numberString(value)) throw new MarketDataError(`Invalid Binance payload field: ${name}`);
  return value;
};

export function parsePrice(value: unknown): { symbol: string; price: string } {
  const row = object(value);
  return { symbol: string(row.symbol, 'symbol'), price: numeric(row.price, 'price') };
}

export function parseBookTicker(value: unknown): {
  symbol: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
} {
  const row = object(value);
  return {
    symbol: string(row.symbol, 'symbol'),
    bidPrice: numeric(row.bidPrice, 'bidPrice'),
    bidQty: numeric(row.bidQty, 'bidQty'),
    askPrice: numeric(row.askPrice, 'askPrice'),
    askQty: numeric(row.askQty, 'askQty'),
  };
}

export function parseTicker(value: unknown): {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  lastPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
} {
  const row = object(value);
  const integer = (v: unknown, n: string) => {
    if (typeof v !== 'number' || !Number.isFinite(v))
      throw new MarketDataError(`Invalid Binance payload field: ${n}`);
    return v;
  };
  return {
    symbol: string(row.symbol, 'symbol'),
    priceChange: numeric(row.priceChange, 'priceChange'),
    priceChangePercent: numeric(row.priceChangePercent, 'priceChangePercent'),
    weightedAvgPrice: numeric(row.weightedAvgPrice, 'weightedAvgPrice'),
    lastPrice: numeric(row.lastPrice, 'lastPrice'),
    volume: numeric(row.volume, 'volume'),
    quoteVolume: numeric(row.quoteVolume, 'quoteVolume'),
    openTime: integer(row.openTime, 'openTime'),
    closeTime: integer(row.closeTime, 'closeTime'),
  };
}

export function parseExchangeInfo(value: unknown): RawExchangeInfo {
  const row = object(value);
  if (
    typeof row.timezone !== 'string' ||
    typeof row.serverTime !== 'number' ||
    !Array.isArray(row.symbols)
  )
    throw new MarketDataError('Invalid Binance exchange info payload');
  return {
    timezone: row.timezone,
    serverTime: row.serverTime,
    symbols: row.symbols.map((item) => {
      const symbol = object(item);
      if (!Array.isArray(symbol.filters) || !Array.isArray(symbol.orderTypes))
        throw new MarketDataError('Invalid Binance symbol payload');
      return {
        symbol: string(symbol.symbol, 'symbol'),
        status: string(symbol.status, 'status'),
        baseAsset: string(symbol.baseAsset, 'baseAsset'),
        quoteAsset: string(symbol.quoteAsset, 'quoteAsset'),
        baseAssetPrecision: Number(symbol.baseAssetPrecision),
        quoteAssetPrecision: Number(symbol.quoteAssetPrecision),
        orderTypes: symbol.orderTypes.filter((v): v is string => typeof v === 'string'),
        isSpotTradingAllowed: symbol.isSpotTradingAllowed === true,
        filters: symbol.filters.map(object),
      };
    }),
  };
}

export function parseCandles(value: unknown): RawCandle[] {
  if (!Array.isArray(value)) throw new MarketDataError('Invalid Binance candles payload');
  return value.map((item) => {
    if (
      !Array.isArray(item) ||
      item.length < 9 ||
      typeof item[0] !== 'number' ||
      typeof item[6] !== 'number' ||
      typeof item[8] !== 'number'
    )
      throw new MarketDataError('Invalid Binance candle payload');
    const values = item.slice(0, 12);
    if (!values.slice(1, 6).every(numberString) || !numberString(values[7]))
      throw new MarketDataError('Invalid Binance candle numeric value');
    return values as RawCandle;
  });
}

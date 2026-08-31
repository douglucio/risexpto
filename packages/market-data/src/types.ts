export type MarketDataConfig = {
  restBaseUrl?: string;
  websocketBaseUrl?: string;
  requestTimeoutMs?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  requestsPerMinute?: number;
  circuitFailureThreshold?: number;
  circuitResetMs?: number;
};

export type SymbolFilter =
  | { type: 'PRICE_FILTER'; minPrice: string; maxPrice: string; tickSize: string }
  | { type: 'LOT_SIZE'; minQuantity: string; maxQuantity: string; stepSize: string }
  | { type: 'MIN_NOTIONAL'; minNotional: string }
  | { type: 'NOTIONAL'; minNotional: string; maxNotional: string }
  | { type: 'UNKNOWN'; rawType: string; values: Record<string, unknown> };

export type SpotSymbol = {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  baseAssetPrecision: number;
  quoteAssetPrecision: number;
  orderTypes: string[];
  spotTradingAllowed: boolean;
  filters: SymbolFilter[];
};

export type ExchangeInfo = {
  timezone: string;
  serverTime: number;
  symbols: SpotSymbol[];
};

export type Price = { symbol: string; price: string };

export type Ticker24h = {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAveragePrice: string;
  lastPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
};

export type BookTicker = {
  symbol: string;
  bidPrice: string;
  bidQuantity: string;
  askPrice: string;
  askQuantity: string;
};

export type CandleInterval =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '6h'
  | '8h'
  | '12h'
  | '1d'
  | '3d'
  | '1w'
  | '1M';

export type Candle = {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteVolume: string;
  trades: number;
};

export type MarketDataMetrics = {
  requests: number;
  successes: number;
  failures: number;
  retries: number;
  rateLimited: number;
  circuitRejected: number;
  websocketReconnects: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
};

export type MarketDataHealth = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  circuit: 'closed' | 'open' | 'half-open';
  lastSuccessAt: string | null;
  consecutiveFailures: number;
};

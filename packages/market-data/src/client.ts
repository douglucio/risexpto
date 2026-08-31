import { MarketDataError } from './errors.js';
import { CircuitBreaker, TokenBucketRateLimiter } from './resilience.js';
import {
  parseBookTicker,
  parseCandles,
  parseExchangeInfo,
  parsePrice,
  parseTicker,
} from './schemas.js';
import type {
  BookTicker,
  Candle,
  CandleInterval,
  ExchangeInfo,
  MarketDataConfig,
  MarketDataHealth,
  MarketDataMetrics,
  Price,
  SpotSymbol,
  SymbolFilter,
  Ticker24h,
} from './types.js';

type Dependencies = {
  fetch?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

const defaults = {
  restBaseUrl: 'https://api.binance.com',
  requestTimeoutMs: 5_000,
  maxRetries: 3,
  retryBaseDelayMs: 200,
  requestsPerMinute: 600,
  circuitFailureThreshold: 5,
  circuitResetMs: 30_000,
} as const;
type ResolvedConfig = {
  restBaseUrl: string;
  websocketBaseUrl?: string;
  requestTimeoutMs: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  requestsPerMinute: number;
  circuitFailureThreshold: number;
  circuitResetMs: number;
};

export class BinancePublicMarketDataClient {
  private readonly options: ResolvedConfig;
  private readonly fetcher: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly limiter: TokenBucketRateLimiter;
  private readonly circuit: CircuitBreaker;
  private readonly counters: MarketDataMetrics = {
    requests: 0,
    successes: 0,
    failures: 0,
    retries: 0,
    rateLimited: 0,
    circuitRejected: 0,
    websocketReconnects: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
  };

  constructor(config: MarketDataConfig = {}, dependencies: Dependencies = {}) {
    this.options = { ...defaults, ...config };
    this.fetcher = dependencies.fetch ?? globalThis.fetch;
    this.sleep = dependencies.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    const now = dependencies.now ?? Date.now;
    this.limiter = new TokenBucketRateLimiter(this.options.requestsPerMinute, now);
    this.circuit = new CircuitBreaker(
      this.options.circuitFailureThreshold,
      this.options.circuitResetMs,
      now,
    );
  }

  async exchangeInfo(symbol?: string): Promise<ExchangeInfo> {
    const raw = parseExchangeInfo(
      await this.request('/api/v3/exchangeInfo', symbol ? { symbol } : {}),
    );
    return {
      timezone: raw.timezone,
      serverTime: raw.serverTime,
      symbols: raw.symbols.map(mapSymbol),
    };
  }

  async symbols(): Promise<SpotSymbol[]> {
    return (await this.exchangeInfo()).symbols.filter((symbol) => symbol.spotTradingAllowed);
  }

  async price(symbol: string): Promise<Price> {
    return parsePrice(
      await this.request('/api/v3/ticker/price', { symbol: normalizeSymbol(symbol) }),
    );
  }

  async ticker(symbol: string): Promise<Ticker24h> {
    const value = parseTicker(
      await this.request('/api/v3/ticker/24hr', { symbol: normalizeSymbol(symbol) }),
    );
    return { ...value, weightedAveragePrice: value.weightedAvgPrice };
  }

  async volume(symbol: string): Promise<Pick<Ticker24h, 'symbol' | 'volume' | 'quoteVolume'>> {
    const { volume, quoteVolume } = await this.ticker(symbol);
    return { symbol: normalizeSymbol(symbol), volume, quoteVolume };
  }

  async bookTicker(symbol: string): Promise<BookTicker> {
    const value = parseBookTicker(
      await this.request('/api/v3/ticker/bookTicker', { symbol: normalizeSymbol(symbol) }),
    );
    return {
      symbol: value.symbol,
      bidPrice: value.bidPrice,
      bidQuantity: value.bidQty,
      askPrice: value.askPrice,
      askQuantity: value.askQty,
    };
  }

  async candles(symbol: string, interval: CandleInterval, limit = 500): Promise<Candle[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 1_000)
      throw new MarketDataError('Candle limit must be between 1 and 1000');
    return parseCandles(
      await this.request('/api/v3/klines', {
        symbol: normalizeSymbol(symbol),
        interval,
        limit: String(limit),
      }),
    ).map((row) => ({
      openTime: row[0],
      open: row[1],
      high: row[2],
      low: row[3],
      close: row[4],
      volume: row[5],
      closeTime: row[6],
      quoteVolume: row[7],
      trades: row[8],
    }));
  }

  metrics(): Readonly<MarketDataMetrics> {
    return { ...this.counters };
  }

  health(): MarketDataHealth {
    const circuit = this.circuit.state;
    return {
      status:
        circuit === 'open'
          ? 'unhealthy'
          : this.circuit.consecutiveFailures > 0
            ? 'degraded'
            : 'healthy',
      circuit,
      lastSuccessAt: this.counters.lastSuccessAt,
      consecutiveFailures: this.circuit.consecutiveFailures,
    };
  }

  recordWebsocketReconnect(): void {
    this.counters.websocketReconnects += 1;
  }

  private async request(path: string, query: Record<string, string>): Promise<unknown> {
    try {
      this.circuit.beforeRequest();
    } catch (error) {
      this.counters.circuitRejected += 1;
      throw error;
    }
    if (!this.limiter.take()) {
      this.counters.rateLimited += 1;
      throw new MarketDataError('Local market data rate limit exceeded', 429);
    }
    this.counters.requests += 1;
    const url = new URL(path, this.options.restBaseUrl);
    Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
    for (let attempt = 0; ; attempt += 1) {
      try {
        const response = await this.fetcher(url, {
          signal: AbortSignal.timeout(this.options.requestTimeoutMs),
          headers: { accept: 'application/json' },
        });
        if (!response.ok)
          throw new MarketDataError(
            `Binance public API returned ${response.status}`,
            response.status,
          );
        const result: unknown = await response.json();
        this.circuit.success();
        this.counters.successes += 1;
        this.counters.lastSuccessAt = new Date().toISOString();
        return result;
      } catch (error) {
        const retryable =
          !(error instanceof MarketDataError) ||
          error.status === 429 ||
          (error.status !== undefined && error.status >= 500);
        if (!retryable || attempt >= this.options.maxRetries) {
          this.circuit.failure();
          this.counters.failures += 1;
          this.counters.lastFailureAt = new Date().toISOString();
          throw error instanceof Error ? error : new MarketDataError('Unknown market data failure');
        }
        this.counters.retries += 1;
        const jitter = Math.floor(Math.random() * this.options.retryBaseDelayMs);
        await this.sleep(this.options.retryBaseDelayMs * 2 ** attempt + jitter);
      }
    }
  }
}

function normalizeSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  if (!/^[A-Z0-9]{5,20}$/.test(normalized)) throw new MarketDataError('Invalid Binance symbol');
  return normalized;
}

function mapSymbol(value: ReturnType<typeof parseExchangeInfo>['symbols'][number]): SpotSymbol {
  return {
    symbol: value.symbol,
    status: value.status,
    baseAsset: value.baseAsset,
    quoteAsset: value.quoteAsset,
    baseAssetPrecision: value.baseAssetPrecision,
    quoteAssetPrecision: value.quoteAssetPrecision,
    orderTypes: value.orderTypes,
    spotTradingAllowed: value.isSpotTradingAllowed,
    filters: value.filters.map(mapFilter),
  };
}

function mapFilter(filter: Record<string, unknown>): SymbolFilter {
  const type = typeof filter.filterType === 'string' ? filter.filterType : 'UNKNOWN';
  if (type === 'PRICE_FILTER')
    return {
      type,
      minPrice: String(filter.minPrice),
      maxPrice: String(filter.maxPrice),
      tickSize: String(filter.tickSize),
    };
  if (type === 'LOT_SIZE')
    return {
      type,
      minQuantity: String(filter.minQty),
      maxQuantity: String(filter.maxQty),
      stepSize: String(filter.stepSize),
    };
  if (type === 'MIN_NOTIONAL') return { type, minNotional: String(filter.minNotional) };
  if (type === 'NOTIONAL')
    return {
      type,
      minNotional: String(filter.minNotional),
      maxNotional: String(filter.maxNotional),
    };
  return { type: 'UNKNOWN', rawType: type, values: filter };
}

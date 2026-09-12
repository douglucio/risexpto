import type { PrismaClient } from '@risexpto/database';
import { BinancePublicMarketDataClient, type Candle } from '@risexpto/market-data';
import { runtimeExecutionProfileForTrader } from '@risexpto/digital-traders';

export const DEFAULT_MARKET_DATA_MAX_AGE_MS = 120_000;
export type MarketDataSyncResult = { symbols: number; snapshots: number };

export async function syncRunningBotMarketData(
  database: PrismaClient,
  client: Pick<BinancePublicMarketDataClient, 'candles'>,
): Promise<MarketDataSyncResult> {
  const bots = await database.bot.findMany({
    where: { status: 'RUNNING', archivedAt: null },
    select: {
      digitalTraderSlug: true,
      configuration: { select: { allowedSymbols: true, parameters: true, marketDataTimeframe: true, historyDepth: true } },
    },
  });
  const requests = new Map<string, { symbol: string; timeframe: string; depth: number }>();
  for (const bot of bots) {
    const profile = runtimeExecutionProfileForTrader(bot.digitalTraderSlug);
    const timeframe = bot.configuration?.marketDataTimeframe ?? profile.marketDataTimeframe;
    const depth = bot.configuration?.historyDepth ?? profile.historyDepth;
    for (const symbol of bot.configuration?.allowedSymbols ?? []) {
      const normalized = normalizeSymbol(symbol);
      if (normalized) requests.set(`${normalized}:${timeframe}`, { symbol: normalized, timeframe, depth });
    }
    const parameters = bot.configuration?.parameters;
    if (
      parameters &&
      typeof parameters === 'object' &&
      !Array.isArray(parameters) &&
      'symbol' in parameters
    ) {
      const symbol = normalizeSymbol(parameters.symbol);
      if (symbol) requests.set(`${symbol}:${timeframe}`, { symbol, timeframe, depth });
    }
  }
  let snapshots = 0;
  for (const request of requests.values()) {
    const candle = (await client.candles(request.symbol, request.timeframe as never, 1))[0];
    if (!candle) continue;
    await persistCandle(database, request.symbol, request.timeframe, candle);
    snapshots += 1;
  }
  return { symbols: new Set([...requests.values()].map((request) => request.symbol)).size, snapshots };
}

export function assertFreshMarketData(
  closeTime: Date,
  now = Date.now(),
  maxAgeMs = configuredMaxAge(),
): void {
  const age = now - closeTime.getTime();
  if (!Number.isFinite(age) || age < 0 || age > maxAgeMs) throw new Error('STALE_MARKET_DATA');
}

export function createPublicMarketDataClient(env: NodeJS.ProcessEnv = process.env) {
  const restBaseUrl =
    env.BINANCE_MARKET_DATA_BASE_URL ??
    (env.BINANCE_TRADING_ENVIRONMENT === 'TESTNET'
      ? 'https://testnet.binance.vision'
      : 'https://api.binance.com');
  return new BinancePublicMarketDataClient({ restBaseUrl });
}

async function persistCandle(
  database: PrismaClient,
  symbol: string,
  interval: string,
  candle: Candle,
): Promise<void> {
  await database.marketSnapshot.upsert({
    where: {
      provider_symbol_interval_openTime: {
        provider: 'BINANCE',
        symbol,
        interval,
        openTime: new Date(candle.openTime),
      },
    },
    update: {
      closeTime: new Date(candle.closeTime),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      trades: candle.trades,
    },
    create: {
      provider: 'BINANCE',
      symbol,
      interval,
      openTime: new Date(candle.openTime),
      closeTime: new Date(candle.closeTime),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      trades: candle.trades,
    },
  });
}
function normalizeSymbol(value: unknown): string | null {
  if (typeof value === 'string' && /^[A-Z0-9]{5,20}$/.test(value.trim().toUpperCase())) return value.trim().toUpperCase();
  return null;
}
function configuredMaxAge(): number {
  const value = Number(process.env.MARKET_DATA_MAX_AGE_MS ?? DEFAULT_MARKET_DATA_MAX_AGE_MS);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_MARKET_DATA_MAX_AGE_MS;
}

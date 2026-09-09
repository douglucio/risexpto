export type MarketType = 'CRYPTO' | 'EQUITIES' | 'FOREX' | 'FUTURES';
export type TradingCapability = 'MARKET_DATA' | 'BALANCES' | 'POSITIONS' | 'MARKET_ORDER' | 'LIMIT_ORDER' | 'CANCEL_ORDER' | 'SPOT' | 'HISTORICAL_DATA';
export type TradingProviderStatus = 'AVAILABLE' | 'COMING_SOON';
export type TradingProviderDefinition = Readonly<{
  id: string;
  slug: string;
  displayName: string;
  marketTypes: readonly MarketType[];
  capabilities: readonly TradingCapability[];
  authType: 'API_KEY_SECRET';
  enabled: boolean;
  status: TradingProviderStatus;
}>;

const futureProviders: readonly [string, string, MarketType][] = [
  ['bybit', 'Bybit', 'CRYPTO'], ['coinbase', 'Coinbase', 'CRYPTO'],
  ['alpaca', 'Alpaca', 'EQUITIES'], ['interactive-brokers', 'Interactive Brokers', 'EQUITIES'],
  ['moomoo', 'Moomoo', 'EQUITIES'],
];

export const tradingProviders: readonly TradingProviderDefinition[] = [
  {
    id: 'binance', slug: 'binance', displayName: 'Binance', marketTypes: ['CRYPTO'],
    capabilities: ['MARKET_DATA', 'BALANCES', 'POSITIONS', 'MARKET_ORDER', 'LIMIT_ORDER', 'CANCEL_ORDER', 'SPOT', 'HISTORICAL_DATA'],
    authType: 'API_KEY_SECRET', enabled: true, status: 'AVAILABLE',
  },
  ...futureProviders.map(([slug, displayName, marketType]) => ({
    id: slug, slug, displayName, marketTypes: [marketType], capabilities: [],
    authType: 'API_KEY_SECRET' as const, enabled: false, status: 'COMING_SOON' as const,
  })),
];

export function tradingProvider(slug: string): TradingProviderDefinition | undefined {
  return tradingProviders.find((provider) => provider.slug === slug);
}

export type MarketType = 'CRYPTO_SPOT' | 'US_STOCKS_SPOT';
export type TraderStatus = 'ACTIVE' | 'COMING_SOON' | 'INACTIVE';
export type CapitalMode = 'FIXED' | 'COMPOUND';
export type RiskPreset = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
export type ProductTraderState =
  | 'SETUP'
  | 'READY'
  | 'WORKING'
  | 'WAITING'
  | 'PAUSED'
  | 'RISK_PAUSED'
  | 'MARKET_CLOSED'
  | 'CONNECTION_LOST'
  | 'STOPPED'
  | 'ERROR';

export type RiskPresetValues = Readonly<{
  maxTrade: number;
  maxPosition: number;
  maxExposure: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  cooldownSeconds: number;
}>;

export const riskPresets: Readonly<Record<RiskPreset, RiskPresetValues>> = {
  CONSERVATIVE: { maxTrade: 10, maxPosition: 25, maxExposure: 35, maxDailyLoss: 2, maxDrawdown: 5, cooldownSeconds: 300 },
  BALANCED: { maxTrade: 20, maxPosition: 50, maxExposure: 60, maxDailyLoss: 5, maxDrawdown: 10, cooldownSeconds: 60 },
  AGGRESSIVE: { maxTrade: 35, maxPosition: 75, maxExposure: 85, maxDailyLoss: 10, maxDrawdown: 20, cooldownSeconds: 15 },
};

export type DigitalTrader = Readonly<{
  id: string;
  slug: string;
  name: string;
  displayName: string;
  description: string;
  specialty: string;
  marketType: MarketType;
  supportedStrategies: readonly string[];
  riskDescription: string;
  idealMarketRegime: string;
  avoidMarketRegime: string;
  defaultRiskPreset: RiskPreset;
  supportedProviders: readonly string[];
  status: TraderStatus;
  paperAvailable: boolean;
  liveAvailable: boolean;
}>;

export const cryptoDigitalTraders: readonly DigitalTrader[] = [
  {
    id: 'atlas', slug: 'atlas', name: 'ATLAS', displayName: 'Grid Specialist',
    description: 'A bounded grid specialist for disciplined range participation.', specialty: 'Grid Specialist', marketType: 'CRYPTO_SPOT', supportedStrategies: ['grid'],
    riskDescription: 'Balanced inventory and bounded exposure.', idealMarketRegime: 'RANGE_BOUND', avoidMarketRegime: 'EXTREME_TREND', defaultRiskPreset: 'BALANCED', supportedProviders: ['binance'], status: 'ACTIVE', paperAvailable: true, liveAvailable: false,
  },
  {
    id: 'luna', slug: 'luna', name: 'LUNA', displayName: 'Trend Following Specialist',
    description: 'A trend specialist that waits for momentum, volume and volatility confirmation.', specialty: 'Trend Following Specialist', marketType: 'CRYPTO_SPOT', supportedStrategies: ['trend-following'],
    riskDescription: 'Directional exposure with confirmation gates.', idealMarketRegime: 'DIRECTIONAL_TREND', avoidMarketRegime: 'CHOPPY', defaultRiskPreset: 'BALANCED', supportedProviders: ['binance'], status: 'ACTIVE', paperAvailable: true, liveAvailable: false,
  },
  {
    id: 'dca-one', slug: 'dca-one', name: 'DCA ONE', displayName: 'Accumulation / DCA Specialist',
    description: 'A recurring accumulation specialist with explicit capital pacing.', specialty: 'Accumulation / DCA Specialist', marketType: 'CRYPTO_SPOT', supportedStrategies: ['dca'],
    riskDescription: 'Paced allocation with a hard capital ceiling.', idealMarketRegime: 'LONG_HORIZON', avoidMarketRegime: 'LIQUIDITY_STRESS', defaultRiskPreset: 'CONSERVATIVE', supportedProviders: ['binance'], status: 'ACTIVE', paperAvailable: true, liveAvailable: false,
  },
  {
    id: 'pulse', slug: 'pulse', name: 'PULSE', displayName: 'Breakout / Momentum Specialist',
    description: 'A paper-first breakout specialist for confirmed range expansion.', specialty: 'Breakout / Momentum Specialist', marketType: 'CRYPTO_SPOT', supportedStrategies: ['breakout'],
    riskDescription: 'Small, cooldown-protected entries after confirmation.', idealMarketRegime: 'BREAKOUT', avoidMarketRegime: 'LOW_LIQUIDITY', defaultRiskPreset: 'CONSERVATIVE', supportedProviders: ['binance'], status: 'ACTIVE', paperAvailable: true, liveAvailable: false,
  },
];

export type Allocation = Readonly<{ traderInstanceId: string; amount: number }>;
export function assertHardAllocation(balance: number, allocations: readonly Allocation[], requested: number, instanceId?: string): void {
  if (!Number.isFinite(balance) || balance < 0 || !Number.isFinite(requested) || requested <= 0) throw new Error('Capital allocation must be positive and finite');
  const existing = allocations.filter((item) => item.traderInstanceId !== instanceId).reduce((sum, item) => sum + item.amount, 0);
  if (existing + requested > balance) throw new Error('CAPITAL_OVER_ALLOCATED');
}
export function operationalCapital(mode: CapitalMode, baseCapital: number, realizedPnl: number): number {
  if (!Number.isFinite(baseCapital) || baseCapital < 0 || !Number.isFinite(realizedPnl)) throw new Error('Invalid capital values');
  return mode === 'COMPOUND' ? Math.max(0, baseCapital + realizedPnl) : baseCapital;
}

export function mapBotState(status: string, waitingReason?: string | null): ProductTraderState {
  if (status === 'DRAFT') return 'SETUP';
  if (status === 'READY') return 'READY';
  if (status === 'RUNNING') return waitingReason ? 'WAITING' : 'WORKING';
  if (status === 'PAUSED') return 'PAUSED';
  if (status === 'RISK_BLOCKED') return 'RISK_PAUSED';
  if (status === 'STOPPED' || status === 'ARCHIVED') return 'STOPPED';
  return 'ERROR';
}

export type WaitingReason = 'MARKET_REGIME_NOT_SUITABLE' | 'INSUFFICIENT_MARKET_DATA' | 'OUTSIDE_SCHEDULE' | 'INTERVAL_NOT_REACHED' | 'PRICE_OUT_OF_RANGE' | 'CAPITAL_INSUFFICIENT';
export type StrategyNoOp = Readonly<{ kind: 'NO_OP'; waitingReason: WaitingReason; details?: Readonly<Record<string, string | number>> }>;
export function noOp(waitingReason: WaitingReason, details?: Readonly<Record<string, string | number>>): StrategyNoOp {
  return { kind: 'NO_OP', waitingReason, ...(details ? { details } : {}) };
}

export type PortfolioRiskInput = Readonly<{ proposedExposure: number; allocatedCapital: number; maximumExposure: number; dailyLoss: number; maximumDailyLoss: number; killSwitchActive: boolean }>;
export function evaluatePortfolioRisk(input: PortfolioRiskInput): { approved: boolean; reasonCode: string } {
  if (input.killSwitchActive) return { approved: false, reasonCode: 'CONNECTION_KILL_SWITCH' };
  if (input.allocatedCapital > input.maximumExposure) return { approved: false, reasonCode: 'ACCOUNT_EXPOSURE_LIMIT' };
  if (input.proposedExposure > input.maximumExposure) return { approved: false, reasonCode: 'ACCOUNT_EXPOSURE_LIMIT' };
  if (input.dailyLoss >= input.maximumDailyLoss) return { approved: false, reasonCode: 'ACCOUNT_DAILY_LOSS_LIMIT' };
  return { approved: true, reasonCode: 'APPROVED' };
}

export type CreditBucket = 'SUBSCRIPTION_CREDITS' | 'PURCHASED_CREDITS';
export class AiCreditLedger {
  private readonly balances = new Map<CreditBucket, number>([['SUBSCRIPTION_CREDITS', 0], ['PURCHASED_CREDITS', 0]]);
  credit(bucket: CreditBucket, amount: number): void { if (!Number.isInteger(amount) || amount < 0) throw new Error('Invalid credit amount'); this.balances.set(bucket, (this.balances.get(bucket) ?? 0) + amount); }
  consume(amount: number): { subscription: number; purchased: number } {
    if (!Number.isInteger(amount) || amount <= 0) throw new Error('Invalid credit consumption');
    const subscription = Math.min(this.balances.get('SUBSCRIPTION_CREDITS') ?? 0, amount);
    const purchased = amount - subscription;
    if ((this.balances.get('PURCHASED_CREDITS') ?? 0) < purchased) throw new Error('AI_CREDITS_INSUFFICIENT');
    this.balances.set('SUBSCRIPTION_CREDITS', (this.balances.get('SUBSCRIPTION_CREDITS') ?? 0) - subscription);
    this.balances.set('PURCHASED_CREDITS', (this.balances.get('PURCHASED_CREDITS') ?? 0) - purchased);
    return { subscription, purchased };
  }
  balancesSnapshot(): Readonly<Record<CreditBucket, number>> { return { SUBSCRIPTION_CREDITS: this.balances.get('SUBSCRIPTION_CREDITS') ?? 0, PURCHASED_CREDITS: this.balances.get('PURCHASED_CREDITS') ?? 0 }; }
}

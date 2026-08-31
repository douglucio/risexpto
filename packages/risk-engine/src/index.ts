export type Decision = 'APPROVED' | 'REJECTED';
export type TradingMode = 'PAPER' | 'LIVE';
export type BotStatus = 'READY' | 'RUNNING' | 'PAUSED' | 'STOPPED' | 'ERROR' | 'RISK_BLOCKED';
export type RiskLimits = {
  maxAllocatedCapital: number;
  maxTradeAmount: number;
  maxExposure: number;
  maxPositionPercent: number;
  maxPositions: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  allowedSymbols: string[];
  cooldownMs: number;
  allowLive: boolean;
};
export type RiskContext = {
  symbol: string;
  amount: number;
  price: number;
  availableBalance: number;
  allocatedCapital: number;
  currentExposure: number;
  positionValue: number;
  openPositions: number;
  dailyLoss: number;
  drawdown: number;
  lastTradeAt: number | null;
  botStatus: BotStatus;
  tradingMode: TradingMode;
  now?: number;
};
export type RiskSnapshot = RiskContext & { proposedValue: number };
export type RiskDecision = {
  decision: Decision;
  reasonCode: string;
  reason: string;
  riskSnapshot: RiskSnapshot;
  timestamp: number;
};

export class RiskEngine {
  constructor(
    private readonly limits: RiskLimits,
    private readonly now: () => number = Date.now,
  ) {
    if (
      limits.maxAllocatedCapital < 0 ||
      limits.maxTradeAmount <= 0 ||
      limits.maxExposure <= 0 ||
      limits.maxPositionPercent <= 0 ||
      limits.maxPositionPercent > 1 ||
      limits.maxPositions < 1 ||
      limits.maxDailyLoss < 0 ||
      limits.maxDrawdown < 0 ||
      limits.cooldownMs < 0
    )
      throw new Error('Invalid risk limits');
  }

  evaluate(context: RiskContext): RiskDecision {
    const timestamp = context.now ?? this.now();
    const proposedValue = context.amount * context.price;
    const snapshot: RiskSnapshot = {
      ...context,
      proposedValue,
      symbol: context.symbol.trim().toUpperCase(),
    };
    const checks: Array<[string, string, boolean]> = [
      [
        'INVALID_AMOUNT',
        'Amount and price must be positive and finite.',
        Number.isFinite(context.amount) &&
          context.amount > 0 &&
          Number.isFinite(context.price) &&
          context.price > 0,
      ],
      [
        'BOT_NOT_READY',
        'Bot status does not permit trading.',
        context.botStatus === 'READY' || context.botStatus === 'RUNNING',
      ],
      [
        'LIVE_DISABLED',
        'LIVE trading is disabled by this risk profile.',
        context.tradingMode !== 'LIVE' || this.limits.allowLive,
      ],
      [
        'SYMBOL_NOT_ALLOWED',
        'Symbol is not allowed by this risk profile.',
        this.limits.allowedSymbols.length === 0 ||
          this.limits.allowedSymbols.includes(snapshot.symbol),
      ],
      [
        'INSUFFICIENT_BALANCE',
        'Available balance is insufficient.',
        proposedValue <= context.availableBalance,
      ],
      [
        'TRADE_LIMIT',
        'Proposed trade exceeds the per-trade limit.',
        proposedValue <= this.limits.maxTradeAmount,
      ],
      [
        'ALLOCATED_CAPITAL_LIMIT',
        'Allocated capital limit would be exceeded.',
        context.allocatedCapital + proposedValue <= this.limits.maxAllocatedCapital,
      ],
      [
        'EXPOSURE_LIMIT',
        'Maximum exposure would be exceeded.',
        context.currentExposure + proposedValue <= this.limits.maxExposure,
      ],
      [
        'POSITION_PERCENT_LIMIT',
        'Position percentage limit would be exceeded.',
        proposedValue <= this.limits.maxExposure * this.limits.maxPositionPercent,
      ],
      [
        'MAX_POSITIONS',
        'Maximum open positions reached.',
        context.openPositions < this.limits.maxPositions,
      ],
      [
        'DAILY_LOSS_LIMIT',
        'Daily loss limit reached.',
        context.dailyLoss < this.limits.maxDailyLoss,
      ],
      ['DRAWDOWN_LIMIT', 'Drawdown limit reached.', context.drawdown < this.limits.maxDrawdown],
      [
        'COOLDOWN',
        'Trading cooldown is active.',
        context.lastTradeAt === null || timestamp - context.lastTradeAt >= this.limits.cooldownMs,
      ],
    ];
    const failure = checks.find(([, , passed]) => !passed);
    return failure
      ? {
          decision: 'REJECTED',
          reasonCode: failure[0],
          reason: failure[1],
          riskSnapshot: snapshot,
          timestamp,
        }
      : {
          decision: 'APPROVED',
          reasonCode: 'APPROVED',
          reason: 'All risk checks passed.',
          riskSnapshot: snapshot,
          timestamp,
        };
  }
}

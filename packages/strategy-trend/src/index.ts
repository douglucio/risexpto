export type TrendParameters = {
  symbol: string;
  fastEmaPeriod: number;
  slowEmaPeriod: number;
  atrPeriod: number;
  momentumPeriod: number;
  minMomentumPercent: number;
  minVolumeRatio: number;
  maxAtrPercent: number;
  quoteAmount: number;
  maxCapital: number;
};

export type TrendCandle = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openTime: number;
};

export type TrendContext = {
  candles: readonly TrendCandle[];
  spentCapital: number;
  positionQuantity: number;
  mode: 'PAPER' | 'LIVE';
};

export type TrendProposal = {
  side: 'BUY' | 'SELL';
  symbol: string;
  quoteAmount?: number;
  quantity?: number;
  strategyKey: 'trend-following';
  strategyVersion: string;
  rationale: string;
};

export type TrendSignal = 'BUY' | 'SELL' | 'HOLD';

export function validateTrendParameters(value: unknown): TrendParameters {
  if (!value || typeof value !== 'object') throw new Error('Trend parameters are required');
  const p = value as Partial<TrendParameters>;
  const symbol = typeof p.symbol === 'string' ? p.symbol.trim().toUpperCase() : '';
  const positiveIntegers = [p.fastEmaPeriod, p.slowEmaPeriod, p.atrPeriod, p.momentumPeriod];
  if (
    !/^[A-Z0-9]{5,20}$/.test(symbol) ||
    positiveIntegers.some((item) => !Number.isInteger(item) || item! <= 0) ||
    p.fastEmaPeriod! >= p.slowEmaPeriod! ||
    !Number.isFinite(p.minMomentumPercent) ||
    !Number.isFinite(p.minVolumeRatio) ||
    p.minVolumeRatio! <= 0 ||
    !Number.isFinite(p.maxAtrPercent) ||
    p.maxAtrPercent! <= 0 ||
    !Number.isFinite(p.quoteAmount) ||
    p.quoteAmount! <= 0 ||
    !Number.isFinite(p.maxCapital) ||
    p.maxCapital! < p.quoteAmount!
  )
    throw new Error('Invalid Trend parameters');
  return {
    symbol,
    fastEmaPeriod: p.fastEmaPeriod!,
    slowEmaPeriod: p.slowEmaPeriod!,
    atrPeriod: p.atrPeriod!,
    momentumPeriod: p.momentumPeriod!,
    minMomentumPercent: p.minMomentumPercent!,
    minVolumeRatio: p.minVolumeRatio!,
    maxAtrPercent: p.maxAtrPercent!,
    quoteAmount: p.quoteAmount!,
    maxCapital: p.maxCapital!,
  };
}

function ema(values: readonly number[], period: number): number {
  const multiplier = 2 / (period + 1);
  return values
    .slice(1)
    .reduce((current, value) => value * multiplier + current * (1 - multiplier), values[0]!);
}

function atr(candles: readonly TrendCandle[], period: number): number {
  const ranges = candles.slice(1).map((candle, index) => {
    const previous = candles[index]!;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previous.close),
      Math.abs(candle.low - previous.close),
    );
  });
  return ranges.slice(-period).reduce((sum, value) => sum + value, 0) / period;
}

export function evaluateTrendSignal(
  parameters: TrendParameters,
  candles: readonly TrendCandle[],
): TrendSignal {
  const required = Math.max(
    parameters.slowEmaPeriod,
    parameters.atrPeriod + 1,
    parameters.momentumPeriod + 1,
  );
  if (candles.length < required) return 'HOLD';
  const closes = candles.map((candle) => candle.close);
  const current = candles[candles.length - 1]!;
  const fast = ema(closes.slice(-parameters.fastEmaPeriod * 3), parameters.fastEmaPeriod);
  const slow = ema(closes.slice(-parameters.slowEmaPeriod * 3), parameters.slowEmaPeriod);
  const momentum =
    (current.close / closes[closes.length - 1 - parameters.momentumPeriod]! - 1) * 100;
  const averageVolume =
    candles
      .slice(-(parameters.momentumPeriod + 1), -1)
      .reduce((sum, candle) => sum + candle.volume, 0) / parameters.momentumPeriod;
  const volumeRatio = current.volume / averageVolume;
  const atrPercent = (atr(candles, parameters.atrPeriod) / current.close) * 100;
  if (!Number.isFinite(volumeRatio) || atrPercent > parameters.maxAtrPercent) return 'HOLD';
  if (
    fast > slow &&
    current.close > slow &&
    momentum >= parameters.minMomentumPercent &&
    volumeRatio >= parameters.minVolumeRatio
  )
    return 'BUY';
  if (fast < slow && momentum < 0) return 'SELL';
  return 'HOLD';
}

export function createTrendStrategy(version: string, parameters: TrendParameters) {
  const validated = validateTrendParameters(parameters);
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid strategy version');
  return {
    key: 'trend-following' as const,
    version,
    parameters: validated,
    analyze(context: TrendContext): TrendProposal[] {
      if (context.mode !== 'PAPER') return [];
      const signal = evaluateTrendSignal(validated, context.candles);
      const price = context.candles.at(-1)?.close;
      if (price === undefined) return [];
      if (
        signal === 'BUY' &&
        context.positionQuantity === 0 &&
        context.spentCapital + validated.quoteAmount <= validated.maxCapital
      )
        return [
          {
            side: 'BUY',
            symbol: validated.symbol,
            quoteAmount: validated.quoteAmount,
            strategyKey: 'trend-following',
            strategyVersion: version,
            rationale: `Trend confirmed above EMA with momentum at ${price}`,
          },
        ];
      if (signal === 'SELL' && context.positionQuantity > 0)
        return [
          {
            side: 'SELL',
            symbol: validated.symbol,
            quantity: context.positionQuantity,
            strategyKey: 'trend-following',
            strategyVersion: version,
            rationale: `Trend exit signal at ${price}`,
          },
        ];
      return [];
    },
  };
}

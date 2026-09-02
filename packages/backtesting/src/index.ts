export type BacktestCandle = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
export type BacktestSignal = { side: 'BUY' | 'SELL'; quoteAmount?: number; quantity?: number };
export type BacktestState = {
  cash: number;
  quantity: number;
  averagePrice: number;
  equity: number;
  fees: number;
};
export type BacktestMetrics = {
  absoluteReturn: number;
  returnPercent: number;
  maxDrawdown: number;
  winRate: number;
  lossRate: number;
  profitFactor: number | null;
  sharpe: number | null;
  tradeCount: number;
  averageTrade: number;
  bestTrade: number;
  worstTrade: number;
  estimatedFees: number;
};
export type BacktestResult = {
  metrics: BacktestMetrics;
  finalState: BacktestState;
  disclaimer: string;
};
export type BacktestStrategy = (
  candle: BacktestCandle,
  state: Readonly<BacktestState>,
  history: readonly BacktestCandle[],
) => BacktestSignal | null;
const disclaimer = 'Historical performance is not a guarantee of future results.';
export function runBacktest(
  initialCapital: number,
  candles: readonly BacktestCandle[],
  strategy: BacktestStrategy,
  feeRate = 0.001,
): BacktestResult {
  if (
    !Number.isFinite(initialCapital) ||
    initialCapital <= 0 ||
    !Number.isFinite(feeRate) ||
    feeRate < 0 ||
    feeRate >= 1 ||
    candles.length === 0
  )
    throw new Error('Invalid backtest input');
  let state: BacktestState = {
    cash: initialCapital,
    quantity: 0,
    averagePrice: 0,
    equity: initialCapital,
    fees: 0,
  };
  const returns: number[] = [];
  const tradePnl: number[] = [];
  let peak = initialCapital;
  let maxDrawdown = 0;
  for (let i = 0; i < candles.length; i += 1) {
    const candle = candles[i]!;
    const signal = strategy(candle, state, candles.slice(0, i + 1));
    if (signal?.side === 'BUY' && state.quantity === 0) {
      const quote = signal.quoteAmount ?? 0;
      const fee = quote * feeRate;
      if (quote > 0 && quote + fee <= state.cash)
        state = {
          ...state,
          cash: state.cash - quote - fee,
          quantity: quote / candle.close,
          averagePrice: candle.close,
          fees: state.fees + fee,
        };
    } else if (signal?.side === 'SELL' && state.quantity > 0) {
      const quantity = signal.quantity ?? state.quantity;
      if (quantity > 0 && quantity <= state.quantity) {
        const gross = quantity * candle.close;
        const fee = gross * feeRate;
        const pnl = (candle.close - state.averagePrice) * quantity - fee;
        tradePnl.push(pnl);
        state = {
          ...state,
          cash: state.cash + gross - fee,
          quantity: state.quantity - quantity,
          averagePrice: quantity === state.quantity ? 0 : state.averagePrice,
          fees: state.fees + fee,
        };
      }
    }
    state = { ...state, equity: state.cash + state.quantity * candle.close };
    const previous = returns.at(-1) ?? initialCapital;
    returns.push(state.equity);
    peak = Math.max(peak, state.equity);
    maxDrawdown = Math.max(maxDrawdown, peak === 0 ? 0 : (peak - state.equity) / peak);
    if (previous > 0) returns[i] = state.equity / previous - 1;
  }
  const completed = tradePnl.filter((pnl) => pnl !== 0);
  const gains = completed.filter((pnl) => pnl > 0);
  const losses = completed.filter((pnl) => pnl < 0);
  const mean = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const deviation =
    returns.length > 1
      ? Math.sqrt(
          returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1),
        )
      : 0;
  return {
    metrics: {
      absoluteReturn: state.equity - initialCapital,
      returnPercent: (state.equity / initialCapital - 1) * 100,
      maxDrawdown: maxDrawdown * 100,
      winRate: completed.length ? gains.length / completed.length : 0,
      lossRate: completed.length ? losses.length / completed.length : 0,
      profitFactor: losses.length
        ? gains.reduce((a, b) => a + b, 0) / Math.abs(losses.reduce((a, b) => a + b, 0))
        : null,
      sharpe: deviation ? (mean / deviation) * Math.sqrt(returns.length) : null,
      tradeCount: completed.length,
      averageTrade: completed.length ? completed.reduce((a, b) => a + b, 0) / completed.length : 0,
      bestTrade: gains.length ? Math.max(...gains) : 0,
      worstTrade: losses.length ? Math.min(...losses) : 0,
      estimatedFees: state.fees,
    },
    finalState: state,
    disclaimer,
  };
}

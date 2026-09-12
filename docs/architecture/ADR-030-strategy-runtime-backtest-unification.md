# ADR-030 — Strategy Runtime and Backtest Unification

Backtests select the persisted StrategyVersion and invoke the same DCA, Grid,
Trend and Breakout engine packages used by Paper runtime adapters. The
backtest controller may adapt candles and state, but must not recreate signal
logic. This keeps historical simulations auditable against runtime behavior.

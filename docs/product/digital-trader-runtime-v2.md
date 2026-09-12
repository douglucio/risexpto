# Digital Trader Runtime V2

Runtime V2 is the Paper execution closure for Product Definition V1. Atlas,
Luna, DCA One and Pulse remain separate Digital Trader personas backed by the
existing StrategyDefinition/StrategyVersion engines. A Trader Instance is one
asset and is reconstructed from PostgreSQL after every worker restart.

The persisted runtime owns hard allocation, temporary order reservations,
weighted-cost Spot positions, realized/unrealized P&L, exposure, daily loss,
waiting reason and risk state. `FIXED` uses authorized capital; `COMPOUND` uses
authorized capital plus realized P&L, never unrealized P&L.

The Paper risk pipeline is strict: Trader Risk → user-scoped Paper
Portfolio/Connection Risk → Paper execution. PAUSED keeps hard allocation;
STOPPED releases it idempotently. `PaperGlobalCapitalAllocation` is a legacy
compatibility table and is not the source of new user balances.

Risk checks distinguish exposure-increasing BUY proposals from risk-reducing
SELL exits. SELL still passes both risk layers and position validation, but is
not blocked by quote-balance, cooldown, or new-exposure checks; this allows a
trader to unwind a position after a limit or risk condition is reached.

Pulse exits are explicit Paper rules: a 3% stop loss or 6% take profit from
average entry, with cooldown and no automatic strategy switching. WAITING is a
normal product state and is persisted with structured reason data.

Backtests consume persisted candles and record trader/version/parameters and
metrics. Notifications are persisted in-app. These features do not authorize
Live execution; Binance Production, Stripe Live and AI execution are outside
this cycle.

## Runtime acceptance and manual validation

The worker is restart-safe because proposals, orders, trades, positions,
reservations and notifications are persisted. Reprocessing a job with the same
correlation id is a no-op after execution. Paper portfolios are isolated by
`userId`; the legacy global allocation table is only a migration compatibility
surface.

Manual validation sequence:

1. In Explore Traders, create Atlas/BTCUSDT, Luna/ETHUSDT, DCA One/SOLUSDT and
   Pulse/DOGEUSDT in Paper, allocating distinct capital from one Paper portfolio.
2. Activate one trader as FIXED and another as COMPOUND; verify capital,
   position, exposure, realized/unrealized P&L and allocation in My Team.
3. Pause and resume both traders; verify allocation is unchanged. Stop them and
   verify allocation is released exactly once.
4. Use an interval/range or unsuitable-market fixture and verify WAITING plus
   `waitingReason`/`waitingSince`, without an error notification.
5. Verify ORDER_FILLED, TRADER_WAITING and RISK_PAUSED in Notifications; run a
   backtest with trader, asset, period, capital and risk preset and inspect the
   metrics/equity curve.
6. Restart the worker with open Paper positions, rerun the cycle and verify no
   duplicate order/trade, preserved allocation and continued P&L calculation.

The full PostgreSQL/Redis scenarios are exposed through
`apps/worker/src/paper-trading.integration.test.ts` and
`apps/worker/src/paper-runtime-v2.integration.test.ts`, using
`E2E_DATABASE_URL`. Live provider balance synchronization remains a
prerequisite for any future Live phase.

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

Pulse exits are explicit Paper rules: a 3% stop loss or 6% take profit from
average entry, with cooldown and no automatic strategy switching. WAITING is a
normal product state and is persisted with structured reason data.

Backtests consume persisted candles and record trader/version/parameters and
metrics. Notifications are persisted in-app. These features do not authorize
Live execution; Binance Production, Stripe Live and AI execution are outside
this cycle.

# ADR-027 — Paper Capital Accounting and Trader Stop Lifecycle

## Decision

`PaperPortfolio.availableCapital` is free cash and is already net of active
allocations. Allocation validation compares it directly with requested capital;
it never subtracts `allocatedCapital` a second time. Claims use a conditional
transactional update to prevent concurrent over-allocation.

PAUSED preserves allocation and managed positions. STOPPED has an explicit
`STOP_AND_LIQUIDATE` or `STOP_AND_KEEP_ASSETS` mode. Liquidation creates the
Paper SELL proposal/order/trade and closes the position transactionally. Keep
assets transfers the position to `UnmanagedHolding`, marks the historical
position unmanaged, and releases only quote capital that is actually free.

LIVE remains disabled.

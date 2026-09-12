# ADR-024 — Paper P&L and Decimal Precision

Position average cost is weighted on buys and unchanged by partial sells.
Realized P&L is recorded on sell fills; unrealized P&L is mark price minus
average cost times the remaining long quantity. Total P&L is realized plus
unrealized. `todayPnl = todayRealizedPnl + todayUnrealizedPnl`, where the
intraday unrealized component is measured from the last persisted market mark
at or before 00:00 UTC. Positions opened after 00:00 use zero as their
baseline. Financial persistence uses Prisma Decimal and worker calculations
use Decimal-safe arithmetic.

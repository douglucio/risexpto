# ADR-024 — Paper P&L and Decimal Precision

Position average cost is weighted on buys and unchanged by partial sells.
Realized P&L is recorded on sell fills; unrealized P&L is mark price minus
average cost times the remaining long quantity. Total P&L is realized plus
unrealized. Daily realized P&L uses the UTC day boundary; daily unrealized P&L
is the mark-to-market result of positions traded/opened during the current UTC
day. Financial persistence uses Prisma Decimal and worker calculations use
Decimal-safe arithmetic.


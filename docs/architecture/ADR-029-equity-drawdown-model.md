# ADR-029 — Equity and Drawdown Model

Trader equity is quote cash plus current long Spot position value. The
high-water mark is lifetime state of the Trader Instance and is persisted in
PostgreSQL. Drawdown is `highWaterMark - currentEquity`, with percentage
`drawdown / highWaterMark * 100`. Unrealized P&L is included in equity;
intraday loss remains a separate UTC metric.

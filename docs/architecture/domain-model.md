# RiseXPTO MVP domain model

The authoritative relational model is [`packages/database/prisma/schema.prisma`](../../packages/database/prisma/schema.prisma). PostgreSQL—not Redis, a queue, an exchange response, or the browser—is the durable source of truth.

## Aggregate relationships

```text
User
├── UserProfile
├── ExchangeConnection ── Order ── Trade
├── Bot ── BotConfiguration
│   ├── StrategyVersion ── StrategyDefinition
│   ├── TradeProposal ── RiskEvent
│   ├── Order ── Trade
│   ├── Position
│   ├── RiskProfile
│   └── BotEvent
├── Backtest ── BacktestResult
├── Notification
├── AuditLog
└── Subscription ── Plan ── Entitlement
    └── Usage
```

## Financial invariants

- Strategies persist `TradeProposal`; only risk-approved proposals may later obtain a single `Order`.
- `Order.idempotencyKey` and `Order.clientOrderId` are globally unique. Exchange order IDs are unique per connection.
- A proposal/order has exactly one positive size representation: base quantity or quote amount.
- LIVE bots and orders require an exchange connection; PAPER records do not.
- Only one open position may exist per bot, symbol, and trading mode.
- Monetary values use PostgreSQL `numeric`, never floating point.
- Risk limits, periods, OHLC values, fees, fills, and metrics have database check constraints.
- Exchange API material has ciphertext fields and a key version. There are intentionally no plaintext secret columns.

## Deletion and audit

User-owned configuration generally cascades when a user is deleted, while executed orders/trades and subscriptions use restrictive references. Audit and risk references use `SET NULL` where actor or bot removal must not erase the event. Application-level soft deletion is available on `User`; retention and append-only audit enforcement are expanded in Feature 23.

## Schema changes

Never edit an applied migration. Change the Prisma schema, create a new migration, review generated SQL and custom constraints, then run `pnpm --filter @risexpto/database db:deploy`. Seeds are idempotent and contain only public plan metadata—never users, API keys, payment identifiers, or credentials.

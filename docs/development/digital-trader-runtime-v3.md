# Digital Trader Runtime V3 Development Notes

## Local validation

Use the repository root commands:

```bash
COREPACK_HOME=/tmp/risexpto-corepack pnpm lint
COREPACK_HOME=/tmp/risexpto-corepack pnpm typecheck
COREPACK_HOME=/tmp/risexpto-corepack pnpm test
COREPACK_HOME=/tmp/risexpto-corepack pnpm build
COREPACK_HOME=/tmp/risexpto-corepack pnpm test:e2e
git diff --check
```

The worker's opt-in database/Redis tests require `E2E_DATABASE_URL` and
`E2E_REDIS_URL`. Without those services they remain skipped by design; this is
not evidence of Live readiness.

## Runtime invariants

- PostgreSQL is the Paper source of truth; worker memory is only a cache.
- Scheduler cadence is not read from strategy parameters for new instances.
- Every Paper cycle has a deterministic job/proposal/order identity.
- Allocation and position ownership changes are transactional.
- Decimal-safe values are required for capital, position, P&L and exposure.
- `ALLOW`, `SKIP` and `PAUSE` remain distinguishable in events and status.
- No credential, API key or secret is written to logs or event payloads.

## Safe environment

This rodada must use Paper mode and public/test market data only. Never set
production Binance credentials or Stripe Live keys while validating these
phases.

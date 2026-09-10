# RiseXPTO

RiseXPTO is a non-custodial SaaS for controlled automation of crypto trading strategies. The MVP begins with Binance Spot and PAPER mode. It never requests withdrawal permission and never promises returns.

## Requirements

- Node.js 22.12 or newer (LTS)
- Corepack and pnpm 10.34.5
- Docker 24+ with Compose v2

The host Node 18 runtime is not supported. Use Node Version Manager (`nvm use`) or a Node 22 development container.

## Setup

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
docker compose up -d
pnpm db:setup
pnpm dev
```

The root `.env` is loaded automatically by the root `dev` command and by the API/worker application commands. Existing shell variables take precedence. The API and worker fail fast when required runtime variables are missing; test-only module imports may use isolated test fixtures.

Never use real Binance or Stripe credentials in local fixtures or tests. Values in `.env.example` are placeholders.

Authentication screens use the local RiseXPTO `[R] RiseXPTO` lockup and the
Keycloak theme at `infra/keycloak/themes/risexpto/`; run the documented local
Keycloak/Playwright smoke flow before changing theme selectors. Binance
Production and Stripe Live are not used by local validation.

## Commands

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
pnpm format:check
```

Database schema operations require `DATABASE_URL` and are intentionally explicit:

```bash
pnpm --filter @risexpto/database db:validate
pnpm --filter @risexpto/database db:generate
pnpm --filter @risexpto/database db:deploy
pnpm --filter @risexpto/database db:seed
```

Production and shared environments use `db:deploy`; `db:migrate` is reserved for creating migrations during local development. Review every generated SQL migration before applying it. The relational model and invariants are documented in [`docs/architecture/domain-model.md`](./docs/architecture/domain-model.md).

The web app runs on port 3000 and the API on 3001 (`GET /health`). Infrastructure instructions are in [`infra/README.md`](./infra/README.md), architecture decisions in [`docs/architecture/`](./docs/architecture/), and the visual contract in [`docs/brand/`](./docs/brand/).

Authentication is provided by Keycloak using OIDC Authorization Code with PKCE. Generate `AUTH_SESSION_SECRET` from a cryptographically secure source with at least 32 bytes; never reuse a database, Stripe, or exchange secret. Browser refresh tokens remain in encrypted `HttpOnly` cookies, while the API independently validates bearer tokens and roles.

The public site is always `/`; authenticated users enter at `/dashboard`. The Web BFF refreshes the session access token before forwarding it to the API and never accepts a caller-provided `Authorization` override. Routing and provider-neutral trading decisions are recorded in [`docs/architecture/ADR-014-routing-auth.md`](./docs/architecture/ADR-014-routing-auth.md), [`docs/architecture/ADR-012-trading-provider-registry.md`](./docs/architecture/ADR-012-trading-provider-registry.md), and [`docs/architecture/ADR-013-i18n.md`](./docs/architecture/ADR-013-i18n.md).

All work flows from `feature/*` to `develop`. Only the owner may update `main`.

## Current browser stabilization round

The current work addresses four confirmed regressions: invalid landing `IntersectionObserver` margins, authentication middleware intercepting anonymous `/api/public/*`, unnecessary anonymous session requests on `/`, and incomplete English/Portuguese/Spanish coverage. Track implementation versus local, browser, and external validation in [`RISEXPTO_IMPLEMENTATION_PLAN.md`](./RISEXPTO_IMPLEMENTATION_PLAN.md). Binance Production and Stripe Live are not used.

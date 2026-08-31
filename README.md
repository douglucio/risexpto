# RiseXPTO

RiseXPTO is a non-custodial SaaS for controlled automation of crypto trading strategies. The MVP begins with Binance Spot and PAPER mode. It never requests withdrawal permission and never promises returns.

## Requirements

- Node.js 22.12 or newer (LTS)
- Corepack and pnpm 10.34.5
- Docker 24+ with Compose v2

The host Node 18 runtime is not supported. Use Node Version Manager (`nvm use`) or a Node 22 development container.

## Setup

```bash
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm install --frozen-lockfile
cp .env.example .env
docker compose up -d
pnpm dev
```

Never use real Binance or Stripe credentials in local fixtures or tests. Values in `.env.example` are placeholders.

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

All work flows from `feature/*` to `develop`. Only the owner may update `main`.

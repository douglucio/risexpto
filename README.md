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

The web app runs on port 3000 and the API on 3001 (`GET /health`). Infrastructure instructions are in [`infra/README.md`](./infra/README.md), architecture decisions in [`docs/architecture/`](./docs/architecture/), and the visual contract in [`docs/brand/`](./docs/brand/).

All work flows from `feature/*` to `develop`. Only the owner may update `main`.

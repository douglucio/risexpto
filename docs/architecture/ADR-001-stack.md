# ADR-001: TypeScript SaaS platform stack

- Status: Accepted
- Date: 2026-08-30

## Context

RiseXPTO combines a public marketing surface, authenticated financial dashboards, synchronous APIs, persistent 24/7 workers, exchange streams, and payment/event integrations. Security boundaries must keep strategy logic away from exchange credentials and execution.

## Options considered

1. Next.js plus NestJS and dedicated Node workers in a TypeScript monorepo.
2. A single full-stack Next.js process.
3. React SPA plus a lightweight HTTP framework.

## Decision

Use Node.js 22 LTS, TypeScript 5.9, pnpm 10, and Turborepo. Use Next.js 16/React 19 for the web surface, NestJS 12 for the modular API, and independent worker processes. PostgreSQL is the source of durable truth; Redis supports queues, ephemeral coordination, and caching. BullMQ, Prisma, OIDC/Keycloak, WebSocket, TanStack libraries, Zod, and ECharts are adopted in the features where their behavior is required, rather than front-loaded here.

Stripe remains behind internal billing and entitlement interfaces. Binance connectors remain behind execution interfaces. Shared domain contracts must not import framework, Stripe, or exchange SDK types.

## Rationale

The split process model isolates request latency from trading workloads and allows independent scaling and recovery. NestJS supplies explicit modules, dependency injection, guards, WebSocket support, and testing conventions. Next.js supports SEO and the application shell without making it the financial authority. PostgreSQL transactions fit order, subscription, and audit consistency; Redis is not a financial system of record.

## Consequences

- More deployable units and explicit contracts are required.
- Developers need Node 22.12+; the host's Node 18 is intentionally unsupported.
- Framework upgrades are centralized and lockfile-controlled.
- Workers must implement idempotency, locking, reconciliation, and graceful shutdown in later phases.

## Risks

Framework churn and monorepo coupling are controlled by pinned dependencies, CI, package boundaries, and ADR review. Redis loss must never erase authoritative financial state. OIDC availability must not become authorization-by-UI.

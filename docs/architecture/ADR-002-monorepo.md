# ADR-002: pnpm and Turborepo monorepo

- Status: Accepted
- Date: 2026-08-30

## Context

Web, API, workers, domain types, risk logic, strategies, and connectors need coordinated changes while preserving strict dependency direction.

## Options considered

Separate repositories, npm workspaces, Nx, and pnpm workspaces with Turborepo.

## Decision

Use pnpm workspaces for deterministic dependency installation and Turborepo for task orchestration. Deployable processes live under `apps/`; reusable framework-independent code lives under `packages/`.

## Rationale

This is a small operational layer with low configuration overhead and strong TypeScript support. It supports filtered builds and caching without imposing application generators.

## Consequences

Package boundaries are reviewed as architecture boundaries. Root tasks run the complete workspace. Each package owns build, lint, test, and typecheck scripts when applicable.

## Risks

Undisciplined cross-package imports can form cycles. Export maps, future dependency-boundary lint rules, and architecture tests will mitigate this.

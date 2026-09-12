# ADR-021 — Stateful Paper Trader Runtime

## Context

Paper cycles previously assembled strategy inputs with zeroed position, capital,
loss and trade-history fields. That made a restart behave differently from a
continuous process.

## Decision

`TraderRuntimeStateService` is the single worker boundary that reconstructs a
Paper Trader Instance from PostgreSQL. PostgreSQL is authoritative in Paper;
exchange adapters are only reconciliation authorities for future Live work.
The context uses Decimal values and exposes capital, position, P&L, exposure,
timestamps, open orders and connection risk state.

## Consequences

Strategies remain provider-neutral and receive a reusable state snapshot. New
runtime consumers must use this service instead of adding per-strategy queries.


# ADR-004 — Public market data isolation and resilience

## Status

Accepted — 2026-08-31

## Decision

Market data uses a dedicated `@risexpto/market-data` package. Binance Spot public REST endpoints are accessed with native `fetch`; public WebSocket streams are isolated behind a small factory interface. Payloads are validated before entering the domain, numeric values remain strings, and no private credential is accepted by this boundary.

Every request is governed by a local token bucket, bounded retry with exponential backoff and jitter, and a circuit breaker. Health and counters are exposed as a read-only client surface so API/worker adapters can publish them without coupling the domain to an exchange SDK.

## Consequences

The package is straightforward to test with injected fetch, clock, sleep, and WebSocket factories. It does not silently exceed Binance limits or turn transient exchange failures into unbounded work. Authenticated account operations remain a separate Feature 07 concern.

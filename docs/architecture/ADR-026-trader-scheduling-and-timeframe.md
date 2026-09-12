# ADR-026 — Trader Scheduling and Market Timeframe

## Status

Accepted — Digital Trader Runtime V3, Phases 134–135.

## Decision

Evaluation cadence is an operational property of a Trader Instance, persisted
in `BotConfiguration.evaluationIntervalMs`. Strategy parameters remain owned by
the Strategy Engine and must not be required by the scheduler.

Market data timeframe is a separate persisted property. A runtime cycle loads
the configured timeframe, history depth and minimum candle count. A trader may
evaluate every minute while using 15-minute candles, for example.

Existing rows may temporarily fall back to `parameters.intervalMs`; new rows
use the Digital Trader catalog profile. This compatibility path is not a new
strategy contract and can be removed after legacy data is migrated.

## Consequences

The scheduler can run DCA One, Atlas, Luna and Pulse uniformly, survive worker
restart through `nextRunAt`, and avoid duplicate work through an atomic claim
and deterministic BullMQ job id. Market data requests are explicit and no
longer assume 60 one-minute candles for every strategy.

LIVE remains disabled.

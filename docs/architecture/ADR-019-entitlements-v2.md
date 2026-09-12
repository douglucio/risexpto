# ADR-019: Entitlements V2 compatibility

- Status: Accepted

## Decision

Introduce `maxActiveTraderInstances`, `maxLiveConnections`, `maxPaperTraderInstances` and `liveTrading` while retaining `maxBots` as a compatibility read/write key until all clients migrate. The API enforces limits; the frontend only presents them.

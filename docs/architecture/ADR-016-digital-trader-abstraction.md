# ADR-016: Digital Trader abstraction

- Status: Accepted

## Decision

Keep Digital Trader persona/catalog separate from `StrategyDefinition`, `StrategyVersion` and internal `Bot`. The commercial catalog lives in a provider-neutral domain package; existing technical entities remain compatible and the UI calls instances “My Traders”.

## Consequences

The same persona can select a strategy implementation without duplicating an engine. Future markets and providers extend the catalog and adapter registry rather than the Strategy package.

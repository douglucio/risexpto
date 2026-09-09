# ADR-012 — Trading provider registry

## Status

Accepted for the MVP foundation.

## Context

The persisted domain currently uses Binance-oriented names such as `ExchangeConnection`, while the product roadmap includes crypto exchanges and non-crypto brokers. Renaming persisted entities now would create unnecessary migration and ownership risk.

## Decision

Introduce a domain-level `TradingProviderDefinition` registry in `@risexpto/shared`. It describes provider identity, supported market types, capabilities, authentication type, enabled state and availability status. Existing Binance adapters remain the only operational implementation. Future providers are registry entries marked `COMING_SOON`, with no SDK, credentials or network client.

The persisted `ExchangeConnection` name remains temporarily for compatibility. New application surfaces use “Connections” and provider-neutral concepts. Adapters, not provider conditionals spread through services, own provider-specific behavior.

## Consequences

- Binance remains available only for CRYPTO/Spot and existing Testnet safeguards remain authoritative.
- Bybit, Coinbase, Alpaca, Interactive Brokers and Moomoo can be shown as roadmap options without implying integration.
- A later rename can be introduced behind an explicit migration once provider-neutral persistence is proven.

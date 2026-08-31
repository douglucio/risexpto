# Architecture

The MVP is a modular monorepo with three deployable processes:

```text
Browser → Next.js web → NestJS API → PostgreSQL
                         │      └→ Redis/BullMQ → workers
                         └→ OIDC/Keycloak
```

The mandatory trading dependency direction is:

```text
Market Data → Strategy → Trade Proposal → Risk → Execution → Connector → Binance
```

Strategies never import execution or connector packages and never receive credentials. PostgreSQL is authoritative; queues and caches are recoverable infrastructure.

ADRs record binding choices. A new ADR supersedes an accepted decision; history is not rewritten.

The PostgreSQL entities, aggregate relationships, and financial invariants are documented in [`domain-model.md`](./domain-model.md).

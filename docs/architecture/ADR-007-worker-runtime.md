# ADR-007 — Runtime assíncrono idempotente

## Contexto

Bots precisam sobreviver a requisições HTTP, reinícios e falhas transitórias. A execução deve ter retry controlado, lock e uma saída explícita para jobs que não podem mais ser processados.

## Decisão

Criar um runtime com handlers registrados, IDs idempotentes, lock com TTL, retries com backoff exponencial, heartbeat, graceful shutdown e dead-letter collection. O contrato é independente do Redis/BullMQ; um adapter distribuído poderá substituir as estruturas locais sem alterar os handlers.

## Consequências e riscos

O runtime local cobre semântica e testes determinísticos, mas não é armazenamento durável ou lock distribuído. Em produção, Redis/BullMQ deve fornecer persistência, leases e escalabilidade horizontal antes de ativar múltiplos workers.

# ADR-008 — Execução LIVE fail-closed e idempotente

## Decisão

O `@risexpto/live-execution` aceita apenas ordens já aprovadas pelo Risk Engine, exige habilitação explícita, usa `clientOrderId` idempotente e consulta a exchange quando o submit falha de forma ambígua. Cancelamento reconcilia o estado antes de reenviar qualquer comando.

## Consequências

O connector Binance real permanece um adapter futuro; mocks permitem validar timeout, fills e estados terminais sem credenciais ou operação financeira real.

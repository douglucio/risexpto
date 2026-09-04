# Paper Trading E2E

Este smoke test valida a infraestrutura persistente do worker sem criar ordens reais. Ele usa uma fila BullMQ real em Redis e um worker real.

## Pré-requisitos

1. Subir Redis e PostgreSQL local com `docker compose up -d redis postgres`.
2. Aplicar migrations com `DATABASE_URL=... pnpm --filter @risexpto/database db:deploy`.
3. Instalar dependências com `pnpm install`.
4. Definir `E2E_REDIS_URL` e `E2E_DATABASE_URL`.

## Execução

```bash
E2E_REDIS_URL=redis://localhost:6379 \
E2E_DATABASE_URL=postgresql://risexpto:local-development-only@localhost:5432/risexpto \
pnpm --filter @risexpto/worker test:integration
```

Sem uma das variáveis E2E, o respectivo teste é marcado como skipped para que a suíte unitária continue determinística. O teste PostgreSQL cria fixtures isoladas, executa um ciclo e verifica proposal, risk event, order, trade, position e saldo. Isso ainda não substitui o E2E completo de usuário e navegador; o Gate B permanece bloqueado até esse fluxo ser coberto.

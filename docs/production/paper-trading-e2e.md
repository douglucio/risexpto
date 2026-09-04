# Paper Trading E2E

Este smoke test valida a infraestrutura persistente do worker sem criar ordens reais. Ele usa uma fila BullMQ real em Redis e um worker real.

## Pré-requisitos

1. Subir Redis local com `docker compose up -d redis`.
2. Instalar dependências com `pnpm install`.
3. Definir `E2E_REDIS_URL`, por exemplo `redis://localhost:6379`.

## Execução

```bash
E2E_REDIS_URL=redis://localhost:6379 pnpm --filter @risexpto/worker exec vitest run src/queue.integration.test.ts
```

Sem `E2E_REDIS_URL`, o teste é marcado como skipped para que a suíte unitária continue determinística. Esse smoke test ainda não substitui o E2E completo de usuário, banco, worker e navegador; o Gate B permanece bloqueado até esse fluxo ser coberto.

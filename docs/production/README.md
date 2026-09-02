# Production Readiness

## Pré-requisitos

- Node.js `>=22.12.0` e pnpm `10.34.5`;
- PostgreSQL e Redis persistentes;
- secrets fornecidos pelo ambiente de deploy, nunca versionados;
- Stripe em modo live somente após validar webhooks;
- Binance com chave sem permissão de saque.

## Deploy

1. Copiar `.env.example` para o secret manager do ambiente.
2. Executar `corepack pnpm install --frozen-lockfile`.
3. Aplicar migrations com `corepack pnpm --filter @risexpto/database exec prisma migrate deploy`.
4. Executar `corepack pnpm build`.
5. Subir API, web e worker com imagens imutáveis.
6. Confirmar readiness, métricas, filas e logs sem secrets.

## Backup e restore

Usar backup consistente do PostgreSQL, incluindo retenção e criptografia gerenciadas pelo provedor. Testar restore em ambiente isolado regularmente e validar migrations após a restauração. Redis deve ser tratado como estado recuperável; jobs críticos precisam permanecer reproduzíveis no PostgreSQL/outbox.

## Rollback

1. Pausar novos deploys e avaliar health/readiness.
2. Acionar Kill Switch para LIVE se houver risco de execução.
3. Reverter para a imagem anterior compatível com o schema.
4. Nunca fazer downgrade destrutivo de migration sem backup e revisão.
5. Reconciliar ordens e posições antes de reabrir execução.

## Incidente

Preservar correlation IDs, ativar Kill Switch quando necessário, registrar impacto e timeline no Audit Trail, proteger evidências e comunicar usuários. Após mitigação, reconciliar Binance, revisar Risk Engine e só então desativar o bloqueio.

## Limites do MVP

O ambiente local usa mocks e PAPER. LIVE real exige secrets de produção, Binance testnet/sandbox quando disponível, valores mínimos controlados e aprovação operacional humana; esta fase não habilita trading financeiro automaticamente.

# RiseXPTO — Pre-Live Readiness

## Objetivo e regra de leitura

As fases 01–30 do `RISEXPTO_IMPLEMENTATION_PLAN.md` concluíram a foundation implementation. Esta etapa valida integração real, persistência, segurança operacional e readiness comercial. A existência de um package ou de testes unitários não é considerada evidência de uma feature pronta para produção.

Status usados neste documento:

- `IMPLEMENTED`: existe código funcional, mas o escopo de produção ainda pode exigir integração adicional.
- `PARTIALLY_IMPLEMENTED`: há parte funcional, porém faltam persistência, integração ou cobertura relevante.
- `MOCK_ONLY`: o caminho disponível usa mock/fake/in-memory.
- `NOT_INTEGRATED`: o domínio existe como biblioteca, mas não é consumido por uma aplicação executável.
- `BLOCKED_EXTERNAL`: depende de serviço, credencial, ambiente ou decisão externa não disponível nesta auditoria.
- `PRODUCTION_READY`: somente após evidência de integração, testes e operação segura.

## Estado auditado em 2026-09-03

### Applications e integração efetiva

| Área       | Estado real                                  | Evidência                                                                                                                                                                |
| ---------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web        | `PARTIALLY_IMPLEMENTED`                      | Next.js possui landing, login, sessão e páginas de área autenticada; as páginas de domínio ainda são demonstrativas. Usa `@risexpto/ui`, mas não consome API de negócio. |
| API        | `PARTIALLY_IMPLEMENTED`                      | NestJS expõe somente `GET /health` e `GET /profile`; não há módulos/controllers para bots, trades, conexões, risco, billing ou admin.                                    |
| Worker     | `NOT_INTEGRATED`                             | `apps/worker/src/main.ts` exporta apenas `workerIdentity`; não inicia fila, scheduler, Redis, handlers ou recuperação.                                                   |
| PostgreSQL | `PARTIALLY_IMPLEMENTED`                      | Prisma schema, migration, seed e cliente são usados pelo provisioning da API; os demais domínios ainda não possuem repositories/casos de uso integrados.                 |
| Redis      | `NOT_INTEGRATED`                             | Serviço existe no Compose, mas não há cliente/queue runtime conectado às aplicações.                                                                                     |
| Keycloak   | `PARTIALLY_IMPLEMENTED` / `BLOCKED_EXTERNAL` | OIDC, PKCE, JWKS e RBAC existem; login funcional depende de realm, scopes, SMTP e usuários configurados no ambiente.                                                     |

### Packages de domínio

| Domínio                        | Estado real                    | Observação                                                                                                                                             |
| ------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UI/config                      | `IMPLEMENTED`                  | Componentes e tokens consumidos pelo Web.                                                                                                              |
| Database                       | `PARTIALLY_IMPLEMENTED`        | Persistência e migration existem, mas sem repositórios/casos de uso integrados à API.                                                                  |
| Market data                    | `PARTIALLY_IMPLEMENTED`        | Cliente Binance público, filtros e resiliência existem; não há endpoint nem worker consumindo-o.                                                       |
| Binance connection/vault       | `PARTIALLY_IMPLEMENTED`        | Assinatura, health, mascaramento e AES-GCM têm testes mockados; não há CRUD persistido, rotação/revogação integrada nem connector Testnet operacional. |
| Paper trading                  | `MOCK_ONLY` / `NOT_INTEGRATED` | Motor usa `Map` e `number`; não há ciclo iniciado pela API/worker nem persistência de ordens, trades ou posições.                                      |
| Risk engine                    | `NOT_INTEGRATED`               | Biblioteca determinística isolada; nenhuma rota ou execução persistida a chama.                                                                        |
| Strategies/catalog/backtesting | `NOT_INTEGRATED`               | DCA, Grid, Trend, catálogo e backtesting têm contratos/testes isolados; não há casos de uso, jobs ou endpoints.                                        |
| Bot manager/wizard             | `MOCK_ONLY` / `NOT_INTEGRATED` | Estado de bots fica em `Map`; não há persistência, ownership real ou scheduler.                                                                        |
| Worker runtime                 | `MOCK_ONLY`                    | Handlers, locks, timer e dead-letter são locais em memória; ADR-007 já reconhece adapter Redis futuro.                                                 |
| Live execution                 | `MOCK_ONLY`                    | `Map` é fonte de verdade e o connector Binance real não existe; não executar LIVE.                                                                     |
| Kill switch                    | `MOCK_ONLY` / `NOT_INTEGRATED` | Estado hierárquico fica em `Map`; não alcança workers nem execução.                                                                                    |
| Portfolio                      | `NOT_INTEGRATED`               | Relatórios determinísticos isolados, sem dados persistidos/runtime.                                                                                    |
| Notifications                  | `MOCK_ONLY` / `NOT_INTEGRATED` | Adapters e deduplicação local; sem outbox, persistência ou entrega operacional.                                                                        |
| Audit trail                    | `NOT_INTEGRATED`               | Sanitização/hash chain existem no package, sem gravação via API/worker.                                                                                |
| Billing                        | `MOCK_ONLY`                    | `MockStripeProvider`, `Set` e `Map`; SDK Stripe, webhook real e idempotência PostgreSQL ausentes.                                                      |
| Admin console                  | `NOT_INTEGRATED`               | Serviço de leitura isolado; UI `/admin` é placeholder e não possui endpoint operacional.                                                               |
| Observability                  | `NOT_INTEGRATED`               | Checks/métricas/logging existem no package, mas não estão ligados ao runtime Nest/Next/worker.                                                         |
| Security                       | `PARTIALLY_IMPLEMENTED`        | Helpers e testes existem; a API ainda não configura globalmente validation pipe, CORS restrito, Helmet, rate limit e exception filter.                 |
| i18n                           | `NOT_INTEGRATED`               | Package existe, porém telas têm textos hardcoded em inglês.                                                                                            |

## Auditoria de autenticação

O fluxo atual é:

```text
Browser → Next.js BFF → Keycloak Authorization Code + PKCE
                      ↓
             troca de code por tokens
                      ↓
          validação ID token e access token
                      ↓
             cookie de sessão selado
```

Achados:

- `issuer`, `client_id`, redirect URI, state e PKCE estão implementados.
- O access token deve ser validado com `KEYCLOAK_API_AUDIENCE` (`risexpto-api`); o ID token, com `KEYCLOAK_CLIENT_ID` (`risexpto-web`). Esta separação foi corrigida e não deve ser revertida.
- O callback rejeita corretamente `email_verified !== true`, mas converte todas as causas em `authentication_failed`; falta diagnóstico operacional seguro e mensagens específicas.
- O cookie selado contém access token e refresh token. Não há revogação server-side nem sessão opaca em Redis/database.
- API e Web têm parsing de roles `USER`, `SUPPORT`, `ADMIN`; a rota Web `/admin` atualmente exige apenas `ADMIN`.
- Provisioning inicial por `externalAuthId` agora existe na API; integração E2E, conflito de e-mail e teste contra PostgreSQL real continuam pendentes.
- Refresh/logout dependem da sessão local; não há revogação de refresh token no Keycloak.
- O realm exige SMTP para verificação de e-mail e precisa ser importado com os client scopes. O SMTP e usuário verificado são dependências de ambiente.

Classificação: `PARTIALLY_IMPLEMENTED`, `BLOCKED_EXTERNAL`; não é `PRODUCTION_READY`.

## Riscos críticos encontrados

1. Não existe fluxo executável Web → API → PostgreSQL para nenhum domínio de trading.
2. Não existe worker real; `Map`, `Set` e timers são fontes de estado em vários packages.
3. Não há isolamento multi-tenant implementado em controllers/repositories, porque os recursos ainda não possuem endpoints.
4. Paper Trading, Risk Engine, Kill Switch, portfolio e reconciliação não formam um fluxo E2E.
5. `number` é usado em Paper Trading e Risk Engine para valores financeiros.
6. Live execution não possui connector Binance real, persistência de Order, `clientOrderId` persistido ou reconciliação após crash.
7. Binance connection não possui endpoints, persistência criptografada, rotação de master key ou bloqueio operacional integrado para `canWithdraw=true`.
8. Billing é mock-only e não pode liberar acesso comercial; Stripe Test Mode ainda não está integrado.
9. Admin, notifications, audit e observability não estão ligados a endpoints/runtime.
10. As páginas autenticadas em `apps/web/app/[section]/page.tsx` contêm dados e controles demonstrativos/hardcoded.
11. Testes existentes são majoritariamente unitários; não há Playwright E2E, integração com Keycloak real, PostgreSQL real ou Redis real.
12. A configuração local apresentou problemas de carregamento de `.env`, scopes do Keycloak e SMTP; esses caminhos precisam de smoke tests documentados.

## Gates de release

| Gate                            | Estado                                | Bloqueios atuais                                                                                    |
| ------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| A — Authentication              | `PARTIALLY_IMPLEMENTED`               | Diagnóstico callback, provisioning, refresh/logout E2E e testes reais pendentes.                    |
| B — Paper Trading               | `NOT_INTEGRATED`                      | API, banco, worker, risk, execução e dashboard não conectados.                                      |
| C — Binance Spot Testnet        | `NOT_INTEGRATED` / `BLOCKED_EXTERNAL` | Connector, filters, credentials persistidas, idempotência e reconciliação pendentes.                |
| D — Stripe Test Mode            | `MOCK_ONLY`                           | SDK, checkout, portal, webhook e idempotência persistida pendentes.                                 |
| E — Production Security         | `PARTIALLY_IMPLEMENTED`               | Hardening de runtime, secrets, backup/restore executado, observability e deployment real pendentes. |
| F — Controlled Production Pilot | `BLOCKED_EXTERNAL`                    | Não autorizado nesta execução; depende de todos os gates anteriores e aprovação explícita.          |

## Próxima ordem de implementação

1. Diagnóstico e observabilidade segura do callback OIDC; testes de audience, claims, email verification, state/PKCE, expiry, refresh e logout.
2. User provisioning e sessão server-side.
3. API NestJS com módulos, DTOs, ownership e repositories Prisma.
4. Binance vault/connections e ambiente Spot Testnet, sem produção.
5. Decimal, filtros Binance, reservas transacionais e Risk Engine integrado.
6. Worker Redis/BullMQ, outbox, idempotência, Paper Trading E2E e kill switch persistente.
7. Dados reais no frontend e Admin operacional.
8. Stripe Test Mode, webhooks e entitlements.
9. Hardening, observability, integração/E2E, backup/restore e gates finais.

## Limite desta auditoria

Nenhuma ordem Binance foi enviada, nenhuma credencial real foi usada e Stripe Live não foi habilitado. A tentativa de criar a branch local de auditoria falhou porque o ambiente bloqueou a escrita em `.git/refs`; as alterações de trabalho permanecem preservadas na branch `develop` e devem ser movidas para uma branch `feature/*` em um ambiente com Git gravável antes de commit/merge.

## Validações executadas

- `git status` e branch: executados; branch atual `develop`, com alterações locais pré-existentes preservadas.
- JSON do realm e `git diff --check`: OK.
- Testes OIDC direcionados: 5 testes passaram.
- API provisioning/auth guard unitário: 10 testes passaram; API lint e typecheck passaram.
- O pacote `@risexpto/database` foi ligado à API; seu export foi corrigido de `dist/index.js` para o caminho efetivamente gerado `dist/src/index.js`.
- PostgreSQL local: containers healthy; migration inicial aplicada e seed executado.
- API runtime: build passou; smoke `GET http://127.0.0.1:3001/health` retornou `{"service":"api","status":"ok"}`.
- Typecheck do Web: OK.
- Suíte Turbo: 16 tarefas passaram; os testes HTTP da API falharam neste executor com `listen EPERM: operation not permitted 0.0.0.0`, impedindo a abertura do servidor usado pelo Supertest. O resultado global não é considerado verde.
- Criação da branch `feature/pre-live-audit`: bloqueada pelo ambiente porque `.git/refs` está somente leitura; nenhum commit ou push foi realizado.

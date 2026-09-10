# RiseXPTO — Pre-Live Readiness

## Current status — 2026-09-09 browser regression audit

Esta é a matriz vigente. `CODE_IMPLEMENTED` indica caminho implementado; `LOCALLY_VALIDATED` exige teste ou execução local; `BROWSER_VALIDATED` exige fluxo autenticado no navegador; `EXTERNAL_TEST_VALIDATED` exige exercício da dependência externa; `PRODUCTION_READY` exige todos os gates e aprovação humana.

| Domínio                         |                                                   CODE_IMPLEMENTED |                                                       LOCALLY_VALIDATED | BROWSER_VALIDATED |         EXTERNAL_TEST_VALIDATED | PRODUCTION_READY |
| ------------------------------- | -----------------------------------------------------------------: | ----------------------------------------------------------------------: | ----------------: | ------------------------------: | ---------------: |
| Bootstrap/env                   |                                                                 ✅ | ✅ `pnpm install --frozen-lockfile`, `dev:secrets`, validação fail-fast |               N/A |              ⬜ Docker/serviços |               ❌ |
| Keycloak login/provisioning     |                                                                 ✅ |                                                            ✅ unitários |                ⬜ |                ⬜ Keycloak real |               ❌ |
| Seed DCA/Grid/Trend             |                                                                 ✅ |                                                  ✅ testes idempotentes |                ⬜ |                             N/A |               ❌ |
| Market Data runtime             |                                       ✅ worker + `MarketSnapshot` |                                            ✅ testes/upsert idempotente |               N/A | ⬜ Binance pública + PostgreSQL |               ❌ |
| Bot Wizard + Risk Profile       |                                                    ✅ transacional |                                                     ✅ testes/typecheck |                ⬜ |                             N/A |               ❌ |
| Paper Scheduler + DCA           |                                 ✅ BullMQ/claim/job determinístico |                                                  ✅ testes/smoke opt-in |                ⬜ |       ⬜ Redis/PostgreSQL reais |               ❌ |
| Portfolio/Trade/Position        |                                              ✅ leitura persistida |                                                            ✅ contratos |                ⬜ |                 ⬜ E2E completo |               ❌ |
| Binance Connection/Vault        |                          ✅ UI Testnet, key masked, secret cifrado |                                                               ✅ testes |                ⬜ |          ⬜ credenciais Testnet |               ❌ |
| Binance LIVE Testnet            |                                            ✅ pipeline fail-closed |                                                   ✅ testes sanitizados |                ⬜ |    ⬜ smoke/ordem/reconciliação |               ❌ |
| Stripe Test Mode                | ✅ provider, Checkout, Portal, webhook, subscription, entitlements |                                            ✅ lint/typecheck/test/build |                ⬜ |             ⬜ Stripe Test real |               ❌ |
| Notifications                   |                                                   ⬜ não integrada |                                                                      ⬜ |               N/A |                             N/A |               ❌ |
| Admin/auditoria/observabilidade |                                                         🟨 parcial |                                                    🟨 contratos/pacotes |                ⬜ |           ⬜ operação integrada |               ❌ |

O caminho atual está em `TESTABLE MVP READINESS`, não em `PRODUCTION_READY`. Binance Production e Stripe Live continuam proibidos.

### Authentication UX validation note — 2026-09-10

The previous Keycloak theme foundation (historical V2) was superseded by the
V3 refinement after manual browser validation found an oversized auth layout,
incomplete branding, an intrusive native locale selector, and duplicate logout
actions in the authenticated topbar. V3 is local/CDN-independent, targets the
Keycloak 26.3 DOM, and keeps OIDC/PKCE, `ui_locales`, RBAC and logout behavior
unchanged. Binance Production and Stripe Live remain prohibited.

### Current status — nova rodada de estabilização pública

Regressões confirmadas no último teste manual: `IntersectionObserver` com `rootMargin` inválido em `rem`, `/api/public/plans` interceptado pelo proxy, consulta anônima obrigatória de `/auth/session` na landing e i18n ainda parcial. As fases 58–68 do plano tratam esses pontos. Até sua validação, os domínios afetados permanecem `CODE_IMPLEMENTED`/`LOCALLY_VALIDATED` conforme evidência, nunca `BROWSER_VALIDATED` por inferência.

### Historical audit notes

O texto de auditorias anteriores abaixo é histórico. Quando mencionar ausência de runtime ou integração que já foi corrigida, vale o estado atual acima e a matriz vigente; não são dois estados simultâneos.

### Manual browser findings

- Keycloak login, callback and `/auth/session` succeeded, but authenticated domain requests repeatedly returned `401`.
- The shared cause was the Web server-rendered section loader reading the sealed session with refresh disabled, while `/auth/session` refreshed the access token. The API proxy also allowed an incoming `Authorization` header to override the session token.
- Phase 49 now refreshes the access token before API calls, gives the session token precedence over forwarded headers, and emits only safe diagnostics (`missing/present`, token kind, audience, issuer host and expiry; never the token).
- Browser validation must still confirm `/profile`, `/strategies`, `/bots`, `/exchange-connections`, `/trades`, `/positions` and `/billing` against the live local stack.
- The first browser regression also identified routing/navigation, provider-neutral Connections, locale persistence and public pricing gaps; these are tracked as phases 50–57 in the implementation plan.
- The current stabilization browser run passed the four public Playwright scenarios (locale, section navigation, Back from login, no page exception, and anonymous pricing) against the local Web. Authenticated endpoint browser validation still requires a configured Keycloak user/session.
- Phase 49 is code-validated, but browser confirmation of all authenticated endpoints remains required; no browser or external-test checkbox is being promoted from code evidence alone.

## Historical audit notes

As seções seguintes preservam auditorias anteriores. Quando houver divergência, a matriz `Current status` acima é a fonte da verdade; classificações antigas abaixo são históricas e não devem ser interpretadas como o estado atual.

## Objetivo e regra de leitura

As fases 01–30 do `RISEXPTO_IMPLEMENTATION_PLAN.md` concluíram a foundation implementation. Esta etapa valida integração real, persistência, segurança operacional e readiness comercial. A existência de um package ou de testes unitários não é considerada evidência de uma feature pronta para produção.

Status usados neste documento:

- `IMPLEMENTED`: existe código funcional, mas o escopo de produção ainda pode exigir integração adicional.
- `PARTIALLY_IMPLEMENTED`: há parte funcional, porém faltam persistência, integração ou cobertura relevante.
- `MOCK_ONLY`: o caminho disponível usa mock/fake/in-memory.
- `NOT_INTEGRATED`: o domínio existe como biblioteca, mas não é consumido por uma aplicação executável.
- `BLOCKED_EXTERNAL`: depende de serviço, credencial, ambiente ou decisão externa não disponível nesta auditoria.
- `PRODUCTION_READY`: somente após evidência de integração, testes e operação segura.

## Estado auditado em 2026-09-08

Esta matriz foi reavaliada contra o código executável, testes existentes e grau de integração. Checkboxes históricos do plano não são tratados como evidência suficiente.

### Applications e integração efetiva

| Área       | Estado real                                  | Evidência                                                                                                                                                                                                        |
| ---------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web        | `PARTIALLY_IMPLEMENTED`                      | Next.js possui landing, login, sessão e páginas autenticadas; bots, strategies, conexões, trades, posições, wizard, risco e billing consomem caminhos reais; notificações, backtests e admin exibem Coming Soon. |
| API        | `PARTIALLY_IMPLEMENTED`                      | NestJS possui health, auth/provisioning, strategies, bots, conexões, trades/positions, fila e kill switch; faltam API de RiskProfile, billing Stripe real, readiness e fluxo completo de criação/scheduler.      |
| Worker     | `PARTIALLY_IMPLEMENTED`                      | `apps/worker/src/main.ts` inicia PostgreSQL + Redis/BullMQ, processa Paper Cycle/Paper Fill/reconciliation e jobs LIVE; scheduler automático de bots e market-data runtime ainda faltam.                         |
| PostgreSQL | `PARTIALLY_IMPLEMENTED`                      | Schema, migrations, seed e cliente existem; Paper e LIVE possuem testes de integração opt-in, mas não foram executados neste ambiente com banco real e o seed não cria estratégias MVP.                          |
| Redis      | `PARTIALLY_IMPLEMENTED` / `BLOCKED_EXTERNAL` | API rate limit, BullMQ worker e testes de integração existem; confirmação contra Redis real depende de `E2E_REDIS_URL`/serviço disponível.                                                                       |
| Keycloak   | `PARTIALLY_IMPLEMENTED` / `BLOCKED_EXTERNAL` | OIDC, PKCE, JWKS, RBAC, realm e provisioning existem; login E2E depende de Keycloak, SMTP e usuário verificado configurados.                                                                                     |

### Packages de domínio

| Domínio                        | Estado real                                  | Observação                                                                                                                                                                                        |
| ------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI/config                      | `IMPLEMENTED`                                | Componentes e tokens consumidos pelo Web.                                                                                                                                                         |
| Database                       | `PARTIALLY_IMPLEMENTED`                      | Persistência e migration existem, mas sem repositórios/casos de uso integrados à API.                                                                                                             |
| Market data                    | `PARTIALLY_IMPLEMENTED`                      | Worker agenda coleta pública de candles para símbolos de bots RUNNING e faz upsert idempotente em `MarketSnapshot`; execução contra Binance e observabilidade externa ainda dependem do ambiente. |
| Binance connection/vault       | `PARTIALLY_IMPLEMENTED` / `BLOCKED_EXTERNAL` | CRUD, vault AES-GCM e teste de permissões existem; connector privado Testnet está integrado ao worker, mas faltam credenciais e execução real.                                                    |
| Paper trading                  | `PARTIALLY_IMPLEMENTED`                      | Worker gera proposals, avalia risco, rejeita market data stale e persiste Order/Trade/Position/balances; DCA é o caminho executável, mas scheduler de bots e E2E autenticado ainda faltam.        |
| Risk engine                    | `PARTIALLY_IMPLEMENTED`                      | Worker avalia proposals Paper e LIVE, usa Decimal em partes críticas e reserva capital; RiskProfile API/UI, market freshness e E2E completo ainda faltam.                                         |
| Strategies/catalog/backtesting | `PARTIALLY_IMPLEMENTED`                      | Pacotes DCA/Grid/Trend e catálogo existem; `GET /strategies` depende de seed e o worker Paper executa somente o caminho DCA.                                                                      |
| Bot manager/wizard             | `PARTIALLY_IMPLEMENTED` / `NOT_INTEGRATED`   | API possui lifecycle/ownership básico e pacotes isolados existem; wizard real, criação atômica completa e scheduler ainda não estão integrados.                                                   |
| Worker runtime                 | `PARTIALLY_IMPLEMENTED`                      | BullMQ/Redis real, retries, graceful shutdown e scheduler persistente de ciclos PAPER existem; heartbeat/readiness, DLQ operacional e validação Redis real ainda faltam.                          |
| Live execution                 | `PARTIALLY_IMPLEMENTED` / `BLOCKED_EXTERNAL` | Connector Testnet, `PrismaLiveOrderStore`, idempotência, fills, risco, reconciliação e smoke protegido existem; PostgreSQL/Redis/Binance reais ainda não foram validados.                         |
| Kill switch                    | `PARTIALLY_IMPLEMENTED`                      | Estado `SYSTEM/USER/BOT` persiste em PostgreSQL, possui endpoints ADMIN e é consultado antes do ciclo Paper; testes de restart e integração com todas as execuções ainda pendentes.               |
| Portfolio                      | `PARTIALLY_IMPLEMENTED`                      | `GET /positions` e a área `portfolio` consomem posições Paper persistidas; valuation, histórico completo e atualização em tempo real ainda pendentes.                                             |
| Notifications                  | `MOCK_ONLY` / `NOT_INTEGRATED`               | Adapters e deduplicação local; sem outbox, persistência ou entrega operacional.                                                                                                                   |
| Audit trail                    | `NOT_INTEGRATED`                             | Sanitização/hash chain existem no package, sem gravação via API/worker.                                                                                                                           |
| Billing                        | `PARTIALLY_IMPLEMENTED` / `BLOCKED_EXTERNAL` | SDK oficial restrito a `sk_test_`, endpoints billing, persistência de eventos e UI TEST MODE existem; checkout/webhook/entitlement precisam de Stripe Test real.                                  |
| Admin console                  | `PARTIALLY_IMPLEMENTED` / `NOT_INTEGRATED`   | Pacote de leitura e kill switch API existem; UI `/admin` não é console operacional completo.                                                                                                      |
| Observability                  | `PARTIALLY_IMPLEMENTED` / `NOT_INTEGRATED`   | Logging/correlation e métricas existem em pacotes e alguns runtimes; não há stack operacional integrada com alertas.                                                                              |
| Security                       | `PARTIALLY_IMPLEMENTED`                      | API possui ValidationPipe global, CORS configurável, Helmet e exception filter seguro com correlation ID; rate limit distribuído e revisão completa ainda pendentes.                              |
| i18n                           | `PARTIALLY_IMPLEMENTED` / `NOT_INTEGRATED`   | Package possui fallback e formatação, mas telas ainda têm textos hardcoded em inglês.                                                                                                             |

### Matriz de evidência

| Domínio          | Classificação auditada                       | Evidência mínima                                                                                                                                                                                | Próxima prova necessária                                                                                      |
| ---------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Ambiente local   | `PARTIALLY_IMPLEMENTED`                      | Loader raiz e `pnpm db:setup` agora são usados pelos comandos executáveis; serviços healthy, secrets reais locais e execução completa ainda dependem do ambiente do operador.                   | Bootstrap reproduzível com Docker/Keycloak/PostgreSQL/Redis disponíveis e variáveis locais válidas.           |
| Autenticação     | `PARTIALLY_IMPLEMENTED` / `BLOCKED_EXTERNAL` | OIDC/PKCE, sessão selada, guards e provisioning têm testes unitários.                                                                                                                           | Login/refresh/logout/provisioning E2E contra Keycloak real.                                                   |
| Seed e catálogo  | `IMPLEMENTED`                                | Seed idempotente agora cria Plans/Entitlements e DCA/Grid/Trend com versão ativa, `parameterSchema` e `implementationKey`; execução em instalação limpa ainda depende de PostgreSQL disponível. | Executar `pnpm db:setup` em clone limpo e confirmar `GET /strategies`.                                        |
| Market Data      | `PARTIALLY_IMPLEMENTED`                      | Job periódico público do worker deriva símbolos de bots RUNNING, faz upsert de `MarketSnapshot` e rejeita dados stale.                                                                          | Executar contra Binance pública e PostgreSQL reais, observando freshness, retry e rate limit.                 |
| Bot/Risk         | `PARTIALLY_IMPLEMENTED`                      | API cria PAPER atomicamente com configuração, RiskProfile e allocation; endpoints autenticados, wizard PAPER com presets revisáveis e tela `/risk` com dados reais existem.                     | E2E autenticado e validação com instalação limpa, sem fixture/manual DB.                                      |
| Paper E2E        | `PARTIALLY_IMPLEMENTED`                      | Ciclo persistente, scheduler automático e integrações opt-in existem; browser e execução com serviços reais não foram comprovados.                                                              | Fresh clone → login → bot PAPER → ciclo automático → trade/position visíveis.                                 |
| Binance Testnet  | `BLOCKED_EXTERNAL`                           | Connector, runtime, smoke, preflight e testes sanitizados existem.                                                                                                                              | Credenciais Testnet, PostgreSQL/Redis reais, leitura e ordem mínima/cancelamento/reconciliação.               |
| Stripe Test Mode | `PARTIALLY_IMPLEMENTED` / `BLOCKED_EXTERNAL` | SDK oficial restrito a `sk_test_`, endpoints, evento persistido e UI TEST MODE existem.                                                                                                         | Checkout/webhook real, atualização fora de ordem e enforcement completo de entitlements.                      |
| Produção         | `BLOCKED_EXTERNAL`                           | Guardas fail-closed e checklists existem.                                                                                                                                                       | Gates anteriores, revisão humana e aprovação explícita; Binance Production e Stripe Live continuam proibidos. |

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
- O callback rejeita corretamente `email_verified !== true` e possui códigos seguros para audiência, issuer, expiração, claims ausentes, state/PKCE e erros do provedor.
- O cookie selado contém access token e refresh token. Não há revogação server-side nem sessão opaca em Redis/database.
- API e Web têm parsing de roles `USER`, `SUPPORT`, `ADMIN`; a rota Web `/admin` atualmente exige apenas `ADMIN`.
- Provisioning inicial por `externalAuthId` agora existe na API; integração E2E, conflito de e-mail e teste contra PostgreSQL real continuam pendentes.
- Refresh/logout dependem da sessão local; não há revogação de refresh token no Keycloak.
- O realm exige SMTP para verificação de e-mail e precisa ser importado com os client scopes. O SMTP e usuário verificado são dependências de ambiente.

Classificação: `PARTIALLY_IMPLEMENTED`, `BLOCKED_EXTERNAL`; não é `PRODUCTION_READY`.

## Riscos críticos encontrados

1. Ainda não existe fluxo executável Web → API → PostgreSQL para execução de trading; strategies/bots possuem apenas o slice de leitura/criação.
2. Não existe worker real; `Map`, `Set` e timers são fontes de estado em vários packages.
3. Não há isolamento multi-tenant implementado em controllers/repositories, porque os recursos ainda não possuem endpoints.
4. O smoke test do Paper Trading já executa um ciclo persistido contra PostgreSQL/Redis reais, valida retry e entrega duplicada sem segunda ordem; o fluxo de usuário via navegador e restart recovery de processo ainda não formam um E2E completo.
5. `number` é usado em Paper Trading e Risk Engine para valores financeiros.
6. Live execution não possui connector Binance real, persistência de Order, `clientOrderId` persistido ou reconciliação após crash.
7. Binance connection possui CRUD/test/revoke persistidos e vault AES-GCM, mas rotação de master key e validação contra Testnet ainda estão pendentes.
8. Billing é mock-only e não pode liberar acesso comercial; Stripe Test Mode ainda não está integrado.
9. Admin, notifications, audit e observability não estão ligados a endpoints/runtime.
10. As páginas autenticadas em `apps/web/app/[section]/page.tsx` ainda contêm dados e controles demonstrativos/hardcoded nos domínios não integrados (risco, notificações, billing e admin).
11. Testes de contrato da API cobrem lifecycle, ownership e enfileiramento PAPER; smoke tests BullMQ/worker, ciclo persistido contra Redis/PostgreSQL reais e um teste Playwright de lifecycle existem, mas o browser E2E ainda requer execução autenticada com Keycloak real.
12. A configuração local apresentou problemas de carregamento de `.env`, scopes do Keycloak e SMTP; esses caminhos precisam de smoke tests documentados.
13. O bootstrap da API exigiu declarar `class-validator` e `class-transformer`; o start com `.env` carregado agora inicializa corretamente, mas o E2E autenticado permanece bloqueado por credencial de teste Keycloak não configurada.

## Gates de release

| Gate                            | Estado                                | Bloqueios atuais                                                                                                               |
| ------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| A — Authentication              | `PARTIALLY_IMPLEMENTED`               | Diagnóstico e provisioning iniciais existem; refresh/logout E2E, sessão server-side e testes reais pendentes.                  |
| B — Paper Trading               | `PARTIALLY_IMPLEMENTED`               | Ciclo persistido, retry e idempotência têm smoke tests reais; navegador, dashboard e recuperação após restart ainda pendentes. |
| C — Binance Spot Testnet        | `NOT_INTEGRATED` / `BLOCKED_EXTERNAL` | Connector, filters, credentials persistidas, idempotência e reconciliação pendentes.                                           |
| D — Stripe Test Mode            | `MOCK_ONLY`                           | SDK, checkout, portal, webhook e idempotência persistida pendentes.                                                            |
| E — Production Security         | `PARTIALLY_IMPLEMENTED`               | Hardening de runtime, secrets, backup/restore executado, observability e deployment real pendentes.                            |
| F — Controlled Production Pilot | `BLOCKED_EXTERNAL`                    | Não autorizado nesta execução; depende de todos os gates anteriores e aprovação explícita.                                     |

## Próxima ordem de implementação

1. Sessão server-side e testes reais de audience, claims, email verification, state/PKCE, expiry, refresh e logout.
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

### Regressões manuais do review(6) — 2026-09-10

Previously implemented. Manual browser regression found on 2026-09-10.
Superseded by Phases 69–86. O Access Token pode ser assinado e ter audience
correta, mas ainda falhar por claims ausentes; use `pnpm keycloak:check` e o
diagnóstico development-only antes de qualquer teste autenticado. Locale,
conteúdo interno do workspace, tema e full-bleed navbar receberam correções de
código nesta rodada, mas validação de browser/Keycloak real continua um gate
separado. O erro `reportAllChanges/startTime` deve ser tratado como script
externo se não existir no código/bundle local.

Validação real posterior: Keycloak 26.3, PostgreSQL e Redis locais ficaram
saudáveis; o realm foi reconciliado sem apagar usuários; internacionalização,
tema, mapper `sub` e locale `ui_locales` foram validados no Chromium; login real
e BFF autenticado retornaram `200` para session, strategies, bots, connections e
billing. O gate PAPER também persistiu snapshots, propostas, ordens, trades,
posição e saldos usando exclusivamente o endpoint público Spot Testnet, com
`LIVE_TRADING_ENABLED=false`. Binance Production e Stripe Live continuam fora
do teste.

## Validações executadas

- `git status` e branch: executados; branch atual `develop`, com alterações locais pré-existentes preservadas.
- JSON do realm e `git diff --check`: OK.
- Testes OIDC direcionados: 5 testes passaram.
- API provisioning/auth guard unitário: 10 testes passaram; API lint e typecheck passaram.
- API strategies/bots: 12 testes direcionados passaram; ownership é aplicado por `User.id` interno e criação LIVE é rejeitada.
- Binance safety foundation: 4 testes do adapter passaram; `canWithdraw=true` resulta em `UNSAFE_PERMISSIONS` e a migration foi aplicada no PostgreSQL local.
- O pacote `@risexpto/database` foi ligado à API; seu export foi corrigido de `dist/index.js` para o caminho efetivamente gerado `dist/src/index.js`.
- PostgreSQL local: containers healthy; migration inicial aplicada e seed executado.
- API runtime: build passou; smoke `GET http://127.0.0.1:3001/health` retornou `{"service":"api","status":"ok"}`.
- Typecheck do Web: OK.
- Bots e strategies no Web: leitura real da API, sem dados hardcoded nesses dois domínios; a URL da API é configurável por `API_BASE_URL`.
- Kill switch persistente: migration, serviço e endpoints ADMIN adicionados; testes do serviço cobrem scopes SYSTEM/USER/BOT. O gate permanece bloqueado enquanto o worker não consultar esse estado e não houver teste de restart.
- Hardening API: ValidationPipe global, CORS configurável, Helmet, exception filter seguro e correlation ID; rate limit distribuído e revisão completa ainda pendentes.
- Commercial readiness: checklist criado em `docs/production/commercial-readiness.md`; status permanece `NOT_READY`.
- Suíte Turbo: 16 tarefas passaram; os testes HTTP da API falharam neste executor com `listen EPERM: operation not permitted 0.0.0.0`, impedindo a abertura do servidor usado pelo Supertest. O resultado global não é considerado verde.
- Criação da branch `feature/pre-live-audit`: bloqueada pelo ambiente porque `.git/refs` está somente leitura; nenhum commit ou push foi realizado.

## Atualização da auditoria em 2026-09-08

- `scripts/root-env.mjs` carrega o `.env` da raiz e preserva variáveis já definidas no ambiente;
- `pnpm dev`, API e worker usam o loader automaticamente; `pnpm db:setup` aplica migrations e executa o seed com o mesmo ambiente;
- a API falha rápido sem `DATABASE_URL` fora de testes, eliminando o fallback silencioso para PostgreSQL inválido;
- a documentação anterior foi corrigida para não classificar o worker atual como `NOT_INTEGRATED` nem o LIVE Testnet como `MOCK_ONLY`;
- a classificação continua parcial porque o ambiente não comprovou Docker/Keycloak/Redis/PostgreSQL em execução e o seed/market-data/PAPER E2E ainda não foram fechados.
- o seed agora inclui as estratégias MVP DCA, Grid e Trend Following com versões ativas compatíveis com os `implementationKey` existentes;
- a criação de bot agora é transacional e exige RiskProfile; há `GET/PATCH /bots/:id/risk-profile` com ownership, validação financeira e bloqueio enquanto o bot está RUNNING;
- o wizard PAPER web busca estratégias reais, oferece presets revisáveis e cria bots através do BFF/API; a tela `/risk` deixou de exibir limites hardcoded e lê/edita o RiskProfile real;
- conexões privadas Binance agora falham fechadas fora de `TESTNET` e aceitam somente `BINANCE_TESTNET_BASE_URL=https://testnet.binance.vision`; `BINANCE_BASE_URL` ambígua foi removida;
- API expõe `/health` para liveness e `/ready` para readiness; o segundo verifica PostgreSQL e Redis e retorna `503` sem dependências saudáveis;
- o worker agora possui scheduler persistente de ciclos PAPER, com `Bot.nextRunAt`, claim atômico, respeito a RUNNING/PAPER e `jobId` determinístico; PAUSED/STOPPED não recebem novos ciclos;

Validações desta atualização:

- loader raiz: OK (`root env loaded`);
- API lint/typecheck/build: OK;
- worker test: OK (28 testes, 8 integrações ignoradas), lint/typecheck/build: OK;
- database typecheck/build: OK;
- suíte API: testes unitários passam; testes HTTP continuam bloqueados neste executor por `listen EPERM` do sandbox ao abrir `0.0.0.0`.

# Local MVP smoke test

Este roteiro valida o caminho local do RiseXPTO sem Binance Production, Stripe Live ou dinheiro real.

## Bootstrap

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev:secrets
docker compose up -d
docker compose ps
pnpm db:setup
pnpm dev
```

Serviços esperados: Web `http://localhost:3000`, API `http://localhost:3001`, Keycloak `http://localhost:8080`, PostgreSQL `localhost:5432` e Redis `localhost:6379`.

Após o login, o destino esperado é `http://localhost:3000/dashboard`. O browser chama as rotas `/api/*` do Web; o BFF lê a sessão, renova o access token quando necessário e o encaminha para NestJS como `Authorization: Bearer <access-token>`. Não copie ID Token para chamadas da API. Se ocorrer `401`, consulte os logs por `web_api_auth_failed` e `api_authentication_failed`; eles informam apenas presença, tipo, audience, host do issuer e expiração, nunca o token.

Na landing pública, `/auth/session` não é uma dependência obrigatória e `GET /api/public/plans` deve funcionar sem cookie e sem redirecionar para `/login`. Para reproduzir a regressão corrigida, abra `/`, entre em `/login`, use Back e confirme que a landing retorna sem erro de runtime; depois navegue até Pricing e confirme que os planos carregam anonimamente.

## Claims e realm efetivo

Depois de subir o Keycloak, compare o realm versionado com o realm efetivo:

```bash
pnpm keycloak:check
pnpm keycloak:reconcile
pnpm keycloak:check
```

`reconcile` é não destrutivo: atualiza cliente, scopes, mappers e roles ausentes,
mas nunca remove usuários. O diagnóstico da API registra somente `typ`, presença
de claims, audience, issuer, `azp`, scope, roles e expiração quando
`NODE_ENV=development`; nunca copie ou registre o token completo.

O scope `openid` deve conter o mapper `sub`. Esse mapper é importante porque o
Keycloak realm exportado pelo projeto define um scope `openid` próprio; sem ele,
um Access Token pode ter audience/email corretos e ainda falhar na API por
`CLAIMS` com `subPresent=false`.

Para a regressão de locale, selecione `PT-BR` ou `ES` na landing, faça login,
navegue por Dashboard → Bots → Strategies → Connections → Trades → Settings e
recarregue a página. O idioma escolhido deve permanecer; o mesmo seletor da
topbar e Settings atualiza cookie, sessão e `UserProfile`.

Se `rg -n "reportAllChanges|startTime" . --glob '!node_modules'` não encontrar
ocorrência no código e o teste Chromium limpo não reproduzir o erro, classifique
o achado como `EXTERNAL_BROWSER_SCRIPT`, sem alterar a aplicação às cegas.

Para executar os testes de browser pela primeira vez, instale o navegador do Playwright com `pnpm exec playwright install chromium` e então rode `pnpm test:e2e`. Nesta rodada o Chromium foi instalado e os quatro cenários públicos passaram; ambientes sem o binário devem classificar essa evidência como `BLOCKED_EXTERNAL`.

Com a stack local ativa, `E2E_WEB_URL=http://localhost:3000 pnpm exec playwright test e2e/public-navigation.spec.ts --workers=1` deve concluir quatro testes públicos. O teste autenticado opt-in usa um usuário Keycloak local verificado:

```bash
E2E_WEB_URL=http://localhost:3000 \
E2E_AUTH_USERNAME='usuario-local@risexpto.test' \
E2E_AUTH_PASSWORD='senha-local' \
pnpm exec playwright test e2e/authenticated-regression.spec.ts --workers=1
```

O cenário confirma `200` em session/strategies/bots/connections/billing, seeds
`dca`, `grid` e `trend-following`, estados vazios e locale PT-BR após
PT-BR → ES → navegação → Settings → PT-BR → reload.

Valide manualmente, sem alterar o cookie ou inserir bearer no DevTools:

```text
/profile · /strategies · /bots · /exchange-connections · /trades · /positions · /billing
```

Uma lista vazia deve aparecer como estado vazio (`No ... yet`), enquanto indisponibilidade de API deve aparecer como erro. `GET /` deve permanecer no site público, mesmo com sessão existente.

Valide a API:

```bash
curl -fsS http://localhost:3001/health
curl -i http://localhost:3001/ready
```

`/ready` só deve retornar `200` com PostgreSQL e Redis disponíveis.

## Usuário Keycloak

Abra `http://localhost:8080`, entre no console administrativo e selecione o realm `risexpto`. Crie um usuário de desenvolvimento com:

- `Enabled`: ON;
- e-mail informado;
- `Email verified`: ON;
- role `USER` (adicione `ADMIN` somente para testar a área administrativa).

O login exige e-mail verificado; não remova essa exigência para facilitar o teste.

## PAPER DCA

1. Abra `http://localhost:3000` e faça login.
2. Confirme `Strategies` e os registros DCA, Grid e Trend Following.
3. Se a conta não tiver subscription local, conceda um plano explicitamente:

   ```bash
   pnpm dev:grant-plan <email> STARTER
   ```

   Esse comando só funciona em `NODE_ENV=development`, cria/atualiza uma subscription local e marca `source=development-local-grant`; não é Stripe.

4. Em `Bots`, crie um bot DCA `PAPER` para `BTCUSDT`, revise capital e risco, e crie-o.
5. Faça `Start` e aguarde o worker: `market-data-sync`, `paper-scheduler` e o ciclo do bot.
6. Use `Run cycle` para forçar um ciclo depois de um snapshot recente e confirme em `Bots`, `Trades` e `Portfolio` os dados persistidos. O gate validado em 2026-09-10 persistiu propostas `EXECUTED`, ordens `FILLED`, trades, posição PAPER e saldos BTC/USDT.
7. A primeira execução DCA exige um `MarketSnapshot` recente; sem sinal ou mercado disponível o bot deve mostrar o estado correspondente, não dados fictícios.

Para validar o worker sem Binance Production, inicie-o explicitamente com:

```bash
BINANCE_MARKET_DATA_BASE_URL=https://testnet.binance.vision pnpm --filter @risexpto/worker start
```

Mantenha `LIVE_TRADING_ENABLED=false`; não são necessárias credenciais Binance
para candles públicos da Testnet e nenhuma ordem é enviada.

Para verificar persistência diretamente, use PostgreSQL e procure `MarketSnapshot`, `TradeProposal`, `RiskEvent`, `Order`, `Trade`, `Position` e `PaperBalance` associados ao usuário/bot.

### Regressão visual da autenticação

Com a stack local ativa, execute:

```bash
E2E_WEB_URL=http://localhost:3000 pnpm exec playwright test e2e/keycloak-locale-theme.spec.ts e2e/keycloak-auth-flows.spec.ts --workers=1
```

Os testes verificam o lockup local `[R] RiseXPTO`, EN/PT/ES, card responsivo,
registration, forgot password e ausência de overflow horizontal. O teste
autenticado opcional também verifica que o logout existe somente no menu do
avatar e que Escape fecha o menu.

## Binance Spot Testnet

Configure somente credenciais descartáveis da Testnet no `.env`, mantenha `BINANCE_TRADING_ENVIRONMENT=TESTNET`, `LIVE_TRADING_ENABLED=false` inicialmente e siga [binance-testnet-smoke.md](../production/binance-testnet-smoke.md). Nunca configure `BINANCE_PRODUCTION_BASE_URL` como endpoint de execução.

## Stripe Test Mode

Use somente `STRIPE_SECRET_KEY=sk_test_...`, preços `STRIPE_TEST_PRICE_*` e `STRIPE_WEBHOOK_SECRET` de Test Mode. O checkout, webhook e entitlements podem ser validados após o PAPER; uma chave `sk_live_` deve falhar fechada.

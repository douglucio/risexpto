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

Para executar os testes de browser pela primeira vez, instale o navegador do Playwright com `pnpm exec playwright install chromium` e então rode `pnpm test:e2e`. Nesta rodada o Chromium foi instalado e os quatro cenários públicos passaram; ambientes sem o binário devem classificar essa evidência como `BLOCKED_EXTERNAL`.

Com a stack local ativa, `E2E_WEB_URL=http://localhost:3000 pnpm exec playwright test e2e/public-navigation.spec.ts --workers=1` deve concluir quatro testes públicos. O teste autenticado opt-in exige `E2E_STORAGE_STATE` gerado após o usuário Keycloak verificado.

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
6. Confirme em `Bots`, `Trades` e `Portfolio` os dados persistidos. A primeira execução DCA exige um `MarketSnapshot` recente; sem sinal ou mercado disponível o bot deve mostrar o estado correspondente, não dados fictícios.

Para verificar persistência diretamente, use PostgreSQL e procure `MarketSnapshot`, `TradeProposal`, `RiskEvent`, `Order`, `Trade`, `Position` e `PaperBalance` associados ao usuário/bot.

## Binance Spot Testnet

Configure somente credenciais descartáveis da Testnet no `.env`, mantenha `BINANCE_TRADING_ENVIRONMENT=TESTNET`, `LIVE_TRADING_ENABLED=false` inicialmente e siga [binance-testnet-smoke.md](../production/binance-testnet-smoke.md). Nunca configure `BINANCE_PRODUCTION_BASE_URL` como endpoint de execução.

## Stripe Test Mode

Use somente `STRIPE_SECRET_KEY=sk_test_...`, preços `STRIPE_TEST_PRICE_*` e `STRIPE_WEBHOOK_SECRET` de Test Mode. O checkout, webhook e entitlements podem ser validados após o PAPER; uma chave `sk_live_` deve falhar fechada.

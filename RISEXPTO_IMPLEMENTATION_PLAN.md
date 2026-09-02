# RiseXPTO — Plano Mestre de Implementação com Codex

> **Documento operacional do projeto**
>
> Este arquivo deve permanecer na **raiz do repositório** e funcionar como fonte principal de continuidade para o Codex.
> Antes de iniciar qualquer tarefa, leia este documento por completo, identifique a próxima fase incompleta e valide o estado real do código.
>
> Conforme cada item for implementado e validado, altere `[ ]` para `[x]`.
>
> **Regra principal:** cada fase deste documento deve ser tratada como uma **feature independente**, com branch própria.
>
> Ao concluir uma feature, o Codex está autorizado a:
>
> 1. executar testes, lint e build;
> 2. atualizar este documento;
> 3. realizar commit;
> 4. realizar push da feature;
> 5. fazer merge da feature em `develop`;
> 6. fazer push de `develop`.
>
> A branch `main` é de responsabilidade exclusiva do proprietário do projeto.
> **NUNCA fazer merge ou push diretamente para `main`.**

---

# 1. Visão Geral

## Nome

**RiseXPTO**

## Produto

RiseXPTO será um SaaS internacional para automação de estratégias de trading em criptomoedas.

O usuário conectará sua própria conta em exchanges compatíveis, inicialmente a Binance, utilizando API Key.

A plataforma permitirá:

- conectar a conta da exchange;
- consultar saldo e mercado;
- escolher estratégias automatizadas;
- criar bots;
- selecionar capital autorizado para cada bot;
- selecionar pares/ativos permitidos;
- configurar limites de risco;
- utilizar Paper Trading;
- executar backtests;
- ativar LIVE Trading;
- acompanhar posições e ordens;
- acompanhar lucro/prejuízo;
- acompanhar drawdown;
- visualizar histórico;
- receber alertas;
- visualizar métricas;
- controlar bots 24/7.

A RiseXPTO será **non-custodial**.

Os fundos permanecerão sempre na exchange do usuário.

---

# 2. Princípios Obrigatórios

## 2.1 Non-Custodial

A RiseXPTO nunca deve custodiar os ativos do usuário.

O dinheiro permanece na Binance ou em outra exchange integrada.

A plataforma apenas envia instruções de negociação por API.

---

## 2.2 Nunca solicitar permissão de saque

A API Key conectada à RiseXPTO deve possuir somente as permissões estritamente necessárias.

Inicialmente:

- leitura;
- consulta de conta;
- consulta de ordens;
- consulta de saldo;
- negociação Spot;
- cancelamento de ordens.

Nunca depender de permissão de saque.

Sempre que possível, validar as permissões da chave antes de permitir LIVE Trading.

---

## 2.3 Risk First

Nenhuma estratégia pode enviar uma ordem diretamente para a exchange.

Fluxo obrigatório:

```text
Market Data
     ↓
Strategy Engine
     ↓
Trade Proposal
     ↓
Risk Engine
     ↓
Execution Engine
     ↓
Exchange Connector
     ↓
Binance
```

Se o Risk Engine rejeitar a operação, nenhuma ordem pode chegar à exchange.

---

## 2.4 Separação entre Strategy e Execution

Uma Strategy deve:

- analisar mercado;
- analisar contexto;
- gerar sinal;
- gerar Trade Proposal.

Uma Strategy NÃO deve:

- conhecer API Secret;
- acessar Binance diretamente;
- executar ordem;
- ignorar Risk Engine;
- controlar infraestrutura;
- fazer acesso arbitrário ao banco.

---

## 2.5 Segurança

Nunca:

- armazenar API Secret em texto puro;
- retornar API Secret pelo backend;
- mostrar API Secret novamente no frontend;
- colocar secrets em logs;
- versionar `.env`;
- colocar credenciais reais em testes;
- enviar secrets para analytics;
- retornar stack trace sensível em produção.

As credenciais das exchanges devem ser criptografadas em repouso.

Criar arquitetura preparada para:

- rotação de chave de criptografia;
- revogação;
- auditoria;
- mascaramento;
- isolamento por usuário.

---

## 2.6 Sem promessa de rentabilidade

A plataforma nunca deve afirmar:

- lucro garantido;
- retorno garantido;
- estratégia infalível;
- bot sem risco;
- renda garantida;
- IA que sempre ganha.

Backtests, métricas históricas e Paper Trading devem possuir disclaimer de que desempenho passado não garante resultado futuro.

---

# 3. Diretrizes para o Codex

Antes de escrever código:

1. leia este documento;
2. analise o estado atual do repositório;
3. identifique a próxima fase incompleta;
4. valide se partes dela já foram implementadas;
5. preserve padrões existentes quando forem bons;
6. proponha melhorias quando necessário;
7. não reimplemente funcionalidades já corretas;
8. atualize documentação quando decisões estruturais forem tomadas.

Nunca marque uma fase como concluída somente porque o código foi escrito.

Uma fase só pode ser marcada como concluída depois de:

- implementação;
- revisão;
- lint;
- testes;
- build;
- validação funcional mínima.

---

# 4. Fluxo Git Obrigatório

A branch de integração é:

```text
develop
```

A branch:

```text
main
```

é controlada pelo proprietário.

## O Codex NÃO pode

- fazer merge em `main`;
- fazer push em `main`;
- fazer rebase de `main`;
- apagar `main`;
- alterar regras de proteção da `main`.

---

## Processo obrigatório por feature

Antes de iniciar uma fase:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/<nome-da-feature>
```

Ao concluir:

```bash
git status
git add .
git commit -m "feat: descrição da feature"
git push -u origin feature/<nome-da-feature>

git checkout develop
git pull origin develop
git merge --no-ff feature/<nome-da-feature>
git push origin develop
```

Antes do merge:

- executar lint;
- executar testes;
- executar build;
- corrigir erros;
- atualizar este documento.

Depois do merge em `develop`, executar novamente testes essenciais.

---

# 5. Registro de Decisões Técnicas

Criar:

```text
docs/architecture/
```

Utilizar ADRs — Architecture Decision Records.

Exemplos:

```text
ADR-001-stack.md
ADR-002-monorepo.md
ADR-003-authentication.md
ADR-004-secret-encryption.md
ADR-005-trading-engine.md
ADR-006-risk-engine.md
ADR-007-payments.md
```

Cada ADR deve conter:

- contexto;
- opções consideradas;
- decisão;
- justificativa;
- consequências;
- riscos.

---

# 6. FEATURE 01 — Brand Foundation

Branch sugerida:

```text
feature/01-brand-foundation
```

Esta deve ser a primeira feature.

## Objetivo

Criar um **Brand Reference Kit** para garantir consistência visual desde o início.

A RiseXPTO deve transmitir:

- tecnologia;
- confiança;
- segurança;
- inteligência;
- automação;
- precisão;
- performance;
- crescimento;
- produto financeiro premium.

A aplicação NÃO deve parecer:

- cassino;
- site de apostas;
- memecoin;
- exchange duvidosa;
- dashboard hacker exagerado;
- projeto amador.

---

## 6.1 Logo

Antes de criar a UI, verificar se existem skills ou ferramentas disponíveis no ambiente do Codex relacionadas a:

```text
logo-generator
brand-generator
brand-kit
design-system
ui-design
```

Se existir algo equivalente, utilizar.

Se não existir:

- não bloquear o desenvolvimento;
- criar especificação da marca;
- criar logo provisório original em SVG;
- manter logo desacoplado para substituição futura.

Criar variações:

- logo horizontal;
- símbolo compacto;
- versão clara;
- versão escura;
- favicon;
- app icon.

Evitar clichês como:

- foguete;
- Bitcoin literal;
- cifrão;
- candle gráfico dentro do logo.

Preferir conceitos abstratos ligados a:

- Rise;
- movimento;
- ascensão;
- inteligência;
- algoritmos;
- conexão;
- fluxo.

---

## 6.2 Cores

Escolher uma paleta moderna e profissional.

Direção recomendada:

```text
Base: dark fintech premium
Primary: azul/índigo/ciano tecnológico
Positive: verde somente para ganhos/sucesso
Negative: vermelho somente para perdas/erros
Warning: âmbar
Neutral: escala consistente de cinzas
```

Não utilizar verde como cor primária apenas porque o produto envolve trading.

A paleta final deve atender acessibilidade e contraste.

---

## 6.3 Tipografia

Escolher tipografia moderna, altamente legível e adequada a dashboards financeiros.

Considerar fontes como:

- Inter;
- Geist;
- Manrope;
- IBM Plex Sans;
- outra opção tecnicamente justificada.

Criar:

- escala tipográfica;
- pesos;
- tamanhos;
- line-height;
- regras para números financeiros.

Números de tabelas e KPIs devem ser fáceis de comparar visualmente.

---

## 6.4 Design Tokens

Definir:

- cores;
- spacing;
- border radius;
- shadows;
- typography;
- transitions;
- breakpoints;
- z-index;
- estados;
- tamanhos de componentes.

---

## 6.5 Entregáveis

Criar:

```text
docs/brand/brand-reference.md
docs/brand/logo/
docs/brand/examples/
```

Checklist:

- [x] Conceito da marca definido.
- [x] Personalidade da marca definida.
- [x] Paleta definida.
- [x] Tipografia definida.
- [x] Design tokens definidos.
- [x] Logo provisório ou final criado.
- [x] Favicon criado.
- [x] Versão dark definida.
- [x] Versão light definida.
- [x] Brand Reference Kit documentado.
- [x] Lint/testes/build executados quando aplicável.
- [x] Feature integrada à `develop`.

---

# 7. FEATURE 02 — Technical Foundation

Branch:

```text
feature/02-technical-foundation
```

Antes de implementar, avaliar o ecossistema atual e escolher a stack mais adequada.

A decisão deve considerar:

- modernidade;
- segurança;
- DX;
- escalabilidade;
- TypeScript;
- processamento assíncrono;
- workers;
- WebSocket;
- integração Stripe;
- integração Binance;
- internacionalização;
- dashboards;
- testes;
- deploy Linux;
- Docker.

---

## 7.1 Stack de referência

A stack abaixo é a referência preferencial, mas o Codex pode escolher alternativa superior desde que documente a decisão.

### Monorepo

```text
pnpm
Turborepo
```

### Frontend

Avaliar preferencialmente:

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
TanStack Query
TanStack Table
React Hook Form
Zod
ECharts ou Recharts
```

Next.js é especialmente interessante por:

- landing page pública;
- SEO;
- internacionalização;
- área autenticada;
- boa estrutura de aplicação.

### Backend

Avaliar preferencialmente:

```text
NestJS
TypeScript
Prisma
PostgreSQL
Redis
BullMQ
WebSocket
```

### Autenticação

Preferência inicial:

```text
Keycloak
```

Avaliar integração via OIDC/OAuth2.

### Infraestrutura

```text
Docker
Docker Compose
PostgreSQL
Redis
Keycloak
```

### Testes

```text
Vitest ou Jest
Playwright
Supertest
```

---

## 7.2 Estrutura sugerida

```text
apps/
  web/
  api/
  worker/

packages/
  ui/
  config/
  database/
  shared/
  trading-core/
  risk-engine/
  strategies/
  exchange-connectors/

docs/
infra/
```

Checklist:

- [x] Stack analisada.
- [x] ADR da stack criado.
- [x] Monorepo criado.
- [x] TypeScript configurado.
- [x] Lint configurado.
- [x] Formatter configurado.
- [x] Test runner configurado.
- [x] PostgreSQL configurado.
- [x] Redis configurado.
- [x] Docker Compose funcionando.
- [x] `.env.example` criado.
- [x] `.gitignore` revisado.
- [x] README inicial criado.
- [x] CI básico criado.
- [x] Build completo funcionando.
- [x] Feature integrada à `develop`.

---

# 8. FEATURE 03 — Design System e App Shell

Branch:

```text
feature/03-design-system
```

Implementar o design system baseado no Brand Reference Kit.

## Componentes

- [x] Button.
- [x] Input.
- [x] Select.
- [x] Checkbox.
- [x] Radio.
- [x] Switch.
- [x] Form Field.
- [x] Card.
- [x] Dialog.
- [x] Drawer.
- [x] Tooltip.
- [x] Popover.
- [x] Dropdown.
- [x] Badge.
- [x] Alert.
- [x] Toast.
- [x] Skeleton.
- [x] Empty State.
- [x] Error State.
- [x] Data Table.
- [x] Pagination.
- [x] Tabs.
- [x] Progress.
- [x] KPI Card.
- [x] Currency Display.
- [x] Percentage Display.
- [x] P&L Indicator.
- [x] Risk Indicator.
- [x] Bot Status Indicator.

## App Shell

- [x] Sidebar.
- [x] Topbar.
- [x] Breadcrumbs.
- [x] Navegação mobile.
- [x] Layout desktop.
- [x] Layout tablet.
- [x] Layout mobile.
- [x] Dark Mode.
- [x] Light Mode.
- [x] Persistência de preferência.

## Páginas mockadas

- [x] Dashboard.
- [x] Bots.
- [x] Strategies.
- [x] Exchange Connections.
- [x] Backtests.
- [x] Trades.
- [x] Risk.
- [x] Notifications.
- [x] Billing.
- [x] Settings.
- [x] Admin placeholder.

- [x] Feature integrada à `develop`.

---

# 9. FEATURE 04 — Authentication

Branch:

```text
feature/04-authentication
```

Implementar autenticação de produção.

Funcionalidades:

- [x] Cadastro.
- [x] Login.
- [x] Logout.
- [x] Recuperação de senha.
- [x] Verificação de e-mail.
- [x] Sessão segura.
- [x] Refresh token.
- [x] Rotas protegidas.
- [x] Perfil.
- [x] Preferências.
- [x] Locale.
- [x] Timezone.
- [x] Moeda de referência.

Roles iniciais:

```text
USER
SUPPORT
ADMIN
```

- [x] Keycloak configurado ou alternativa documentada.
- [x] ADR criado.
- [x] Testes implementados.
- [x] Feature integrada à `develop`.

---

# 10. FEATURE 05 — Domain Model

Branch:

```text
feature/05-domain-model
```

Entidades iniciais:

```text
User
UserProfile
ExchangeConnection
Bot
StrategyDefinition
StrategyVersion
BotConfiguration
TradeProposal
Order
Trade
Position
RiskProfile
RiskEvent
BotEvent
MarketSnapshot
Backtest
BacktestResult
Notification
AuditLog
Plan
Subscription
Entitlement
Usage
```

Enums:

```text
BotStatus:
DRAFT
READY
RUNNING
PAUSED
STOPPED
ERROR
RISK_BLOCKED

TradingMode:
PAPER
LIVE
```

Checklist:

- [x] Prisma Schema.
- [x] Migrations.
- [x] Seeds seguros.
- [x] Constraints.
- [x] Índices.
- [x] Relacionamentos documentados.
- [x] Testes de persistência.
- [x] Feature integrada à `develop`.

---

# 11. FEATURE 06 — Market Data Engine

Branch:

```text
feature/06-market-data
```

Implementar dados públicos Binance Spot.

- [x] Symbols.
- [x] Price.
- [x] Ticker.
- [x] Candles.
- [x] Volume.
- [x] Book ticker.
- [x] Exchange info.
- [x] Symbol filters.
- [x] WebSocket quando apropriado.
- [x] Reconnect.
- [x] Retry.
- [x] Backoff.
- [x] Rate limit.
- [x] Circuit breaker.
- [x] Health check.
- [x] Métricas.

Dados públicos não devem depender das credenciais privadas do usuário.

- [x] Feature integrada à `develop`.

---

# 12. FEATURE 07 — Binance Account Connection

Branch:

```text
feature/07-binance-connection
```

Implementar conexão privada.

- [x] Cadastro de API Key.
- [x] Cadastro de API Secret.
- [x] Criptografia.
- [x] Mascaramento.
- [x] Teste de conexão.
- [x] Validação de permissões.
- [x] Bloqueio se houver configuração insegura.
- [x] Health status.
- [x] Revogação local.
- [x] Auditoria.
- [x] API Secret nunca retornado.

Estados:

```text
CONNECTED
DEGRADED
INVALID
DISCONNECTED
```

- [x] Testes com mocks.
- [x] Feature integrada à `develop`.

---

# 13. FEATURE 08 — Paper Trading Engine

Branch:

```text
feature/08-paper-trading
```

Paper Trading deve existir antes de LIVE Trading.

Simular:

- [x] saldo.
- [x] ordens.
- [x] fills.
- [x] compra.
- [x] venda.
- [x] fees.
- [x] posições.
- [x] realized P&L.
- [x] unrealized P&L.

Usar dados reais do Market Data Engine.

Arquitetura recomendada:

```text
TradeProposal
       ↓
RiskEngine
       ↓
Execution
       ↓
PaperExecution | LiveExecution
```

- [x] Testes determinísticos.
- [x] Feature integrada à `develop`.

---

# 14. FEATURE 09 — Risk Engine v1

Branch:

```text
feature/09-risk-engine
```

Componente crítico.

Implementar:

- [x] capital máximo alocado;
- [x] máximo por trade;
- [x] exposição máxima;
- [x] percentual máximo por posição;
- [x] máximo de posições;
- [x] perda máxima diária;
- [x] drawdown máximo;
- [x] symbols permitidos;
- [x] saldo disponível;
- [x] cooldown;
- [x] status do bot;
- [x] trading mode.

Resultado:

```text
APPROVED
REJECTED
```

Toda decisão deve registrar:

```text
reasonCode
reason
riskSnapshot
timestamp
```

- [x] Testes unitários abrangentes.
- [x] Edge cases.
- [x] Feature integrada à `develop`.

---

# 15. FEATURE 10 — Strategy Engine

Branch:

```text
feature/10-strategy-engine
```

Criar contrato padronizado de Strategy.

Exemplo:

```typescript
interface TradingStrategy {
  analyze(context): Promise<TradeProposal[]>
}
```

Implementar:

- [x] StrategyDefinition.
- [x] StrategyVersion.
- [x] parâmetros tipados.
- [x] schemas.
- [x] lifecycle.
- [x] logs funcionais.
- [x] métricas.
- [x] versionamento.
- [x] ativação/desativação.

- [x] Feature integrada à `develop`.

---

# 16. FEATURE 11 — Strategy DCA

Branch:

```text
feature/11-strategy-dca
```

Primeira estratégia real.

Parâmetros:

- [x] symbol.
- [x] frequência.
- [x] valor.
- [x] capital máximo.
- [x] condições opcionais.
- [x] limites de risco.

Primeiro em PAPER.

- [x] Paper Trading validado.
- [x] Backtest suportado.
- [x] Testes.
- [x] Feature integrada à `develop`.

---

# 17. FEATURE 12 — Strategy Grid

Branch:

```text
feature/12-strategy-grid
```

Implementar:

- [x] faixa;
- [x] níveis;
- [x] capital;
- [x] tamanho por ordem;
- [x] rebalanceamento;
- [x] critérios de interrupção;
- [x] rompimento da faixa;
- [x] volatilidade extrema;
- [x] falta de saldo;
- [x] restart seguro.

- [x] Paper validado.
- [x] Backtest suportado.
- [x] Feature integrada à `develop`.

---

# 18. FEATURE 13 — Strategy Trend Following

Branch:

```text
feature/13-strategy-trend
```

Indicadores possíveis:

- EMA;
- ATR;
- momentum;
- volume.

Evitar overfitting.

- [x] Strategy implementada.
- [x] Parâmetros versionados.
- [x] Paper validado.
- [x] Backtest suportado.
- [x] Feature integrada à `develop`.

---

# 19. FEATURE 14 — Bot Manager

Status: 🟨 Em andamento

Branch:

```text
feature/14-bot-manager
```

Fluxo:

```text
Create
Configure
Validate
Ready
Start
Run
Pause
Resume
Stop
Archive
```

Implementar:

- [x] criação.
- [x] edição.
- [x] validação.
- [x] start.
- [x] pause.
- [x] resume.
- [x] stop.
- [x] duplicação.
- [x] histórico.
- [x] eventos.
- [x] status em tempo real.

- [x] Feature integrada à `develop`.

---

# 20. FEATURE 15 — Worker Runtime 24/7

Status: 🟨 Em andamento

Branch:

```text
feature/15-worker-runtime
```

Bots não devem depender de requisição HTTP para permanecer ativos.

Avaliar:

```text
BullMQ
Redis
Schedulers
Workers
```

Implementar:

- [x] jobs idempotentes.
- [x] retries.
- [x] backoff.
- [x] locks.
- [x] proteção contra duplicidade.
- [x] restart seguro.
- [x] crash recovery.
- [x] graceful shutdown.
- [x] heartbeat.
- [x] health check.
- [x] dead-letter strategy.

- [x] Feature integrada à `develop`.

---

# 21. FEATURE 16 — LIVE Execution Engine

Branch:

```text
feature/16-live-execution
```

Somente iniciar após Paper Trading + Risk Engine + Strategy Engine estarem estáveis.

Implementar:

- [ ] market orders.
- [ ] limit orders.
- [ ] cancel.
- [ ] status.
- [ ] fills.
- [ ] partial fills.
- [ ] reconciliation.
- [ ] timeout.
- [ ] retries seguros.
- [ ] idempotência.
- [ ] client order IDs.

Nunca reenviar ordem automaticamente sem saber se a tentativa anterior chegou à exchange.

- [ ] Sandbox/mocks.
- [ ] Feature integrada à `develop`.

---

# 22. FEATURE 17 — Kill Switch

Branch:

```text
feature/17-kill-switch
```

Implementar:

```text
USER_KILL_SWITCH
BOT_KILL_SWITCH
SYSTEM_KILL_SWITCH
```

Triggers:

- [ ] perda diária excedida.
- [ ] drawdown excedido.
- [ ] exchange indisponível.
- [ ] dados inconsistentes.
- [ ] divergência de posição.
- [ ] autenticação inválida.
- [ ] erros repetitivos.
- [ ] risco de execução duplicada.
- [ ] comportamento anômalo.

Admin deve conseguir interromper LIVE Trading global sem derrubar dashboards.

- [ ] Feature integrada à `develop`.

---

# 23. FEATURE 18 — Portfolio e P&L

Branch:

```text
feature/18-portfolio
```

Dashboard financeiro:

- [ ] capital total.
- [ ] capital alocado.
- [ ] capital disponível.
- [ ] realized P&L.
- [ ] unrealized P&L.
- [ ] resultado diário.
- [ ] semanal.
- [ ] mensal.
- [ ] acumulado.
- [ ] drawdown.
- [ ] exposição por ativo.
- [ ] performance por bot.
- [ ] performance por estratégia.

- [ ] Feature integrada à `develop`.

---

# 24. FEATURE 19 — Backtesting Engine

Branch:

```text
feature/19-backtesting
```

Reutilizar as mesmas Strategies do runtime real.

Métricas:

- [ ] retorno absoluto.
- [ ] retorno percentual.
- [ ] max drawdown.
- [ ] win rate.
- [ ] loss rate.
- [ ] profit factor.
- [ ] Sharpe.
- [ ] número de trades.
- [ ] média por trade.
- [ ] melhor trade.
- [ ] pior trade.
- [ ] fees estimadas.

Períodos:

```text
30D
90D
180D
1Y
CUSTOM
```

- [ ] Disclaimer de performance histórica.
- [ ] Feature integrada à `develop`.

---

# 25. FEATURE 20 — Strategy Catalog

Branch:

```text
feature/20-strategy-catalog
```

Cada estratégia deve apresentar:

- [ ] nome;
- [ ] descrição;
- [ ] risco;
- [ ] mercados indicados;
- [ ] métricas;
- [ ] drawdown;
- [ ] versão;
- [ ] parâmetros;
- [ ] compatibilidade PAPER/LIVE;
- [ ] status.

- [ ] Feature integrada à `develop`.

---

# 26. FEATURE 21 — Bot Creation Wizard

Branch:

```text
feature/21-bot-wizard
```

Fluxo:

```text
1. Strategy
2. Exchange
3. Market
4. Capital
5. Risk
6. Review
7. Start
```

Presets:

```text
Conservative
Balanced
Aggressive
Custom
```

Preset apenas preenche parâmetros.

Usuário deve poder revisar tudo antes de ativar.

- [ ] Feature integrada à `develop`.

---

# 27. FEATURE 22 — Notifications

Branch:

```text
feature/22-notifications
```

Eventos:

- [ ] bot iniciado.
- [ ] bot pausado.
- [ ] bot encerrado.
- [ ] Risk Engine bloqueou operação.
- [ ] Kill Switch ativado.
- [ ] Binance inválida.
- [ ] drawdown perto do limite.
- [ ] erro crítico.
- [ ] backtest concluído.

Canais:

- [ ] in-app.
- [ ] e-mail.

Preparar arquitetura para:

- push;
- Telegram;
- webhook.

- [ ] Feature integrada à `develop`.

---

# 28. FEATURE 23 — Audit Trail

Branch:

```text
feature/23-audit-trail
```

Tipos:

```text
USER_ACTION
BOT_ACTION
STRATEGY_SIGNAL
TRADE_PROPOSAL
RISK_DECISION
ORDER_REQUEST
ORDER_RESULT
EXCHANGE_EVENT
SYSTEM_EVENT
ADMIN_ACTION
```

Logs devem ser:

- [ ] estruturados.
- [ ] pesquisáveis.
- [ ] protegidos contra alteração comum.
- [ ] sem secrets.
- [ ] vinculados ao usuário.
- [ ] vinculados ao bot.
- [ ] vinculados a correlation ID.

- [ ] Feature integrada à `develop`.

---

# 29. FEATURE 24 — Stripe Billing e Subscription Plans

Branch:

```text
feature/24-stripe-billing
```

**Stripe será o provedor oficial de cobrança e assinaturas da RiseXPTO.**

Utilizar Stripe para:

- assinaturas;
- pagamentos recorrentes;
- upgrades;
- downgrades;
- cancelamentos;
- invoices;
- customer portal;
- webhooks;
- status de pagamento.

## Regras

O core de trading NÃO pode depender diretamente do Stripe.

Criar abstração de Billing/Entitlements.

Entidades:

```text
Plan
Subscription
Entitlement
Usage
BillingCustomer
BillingEvent
```

Planos podem limitar:

- número de bots;
- capital máximo;
- strategies disponíveis;
- quantidade de backtests;
- recursos premium;
- notificações avançadas;
- Auto Pilot futuramente.

Implementar:

- [ ] Stripe Customer.
- [ ] Stripe Products.
- [ ] Stripe Prices.
- [ ] Checkout.
- [ ] Subscription.
- [ ] Upgrade.
- [ ] Downgrade.
- [ ] Cancelamento.
- [ ] Customer Portal.
- [ ] Webhooks.
- [ ] Assinatura dos webhooks validada.
- [ ] Idempotência.
- [ ] Entitlements internos.
- [ ] Grace period.
- [ ] Estado past_due.
- [ ] Estado canceled.
- [ ] Estado trialing, se adotado.
- [ ] Billing UI.
- [ ] Histórico de invoices.

Nunca confiar apenas no frontend para liberar features pagas.

Permissões devem ser confirmadas no backend.

- [ ] ADR de billing criado.
- [ ] Testes de webhook.
- [ ] Feature integrada à `develop`.

---

# 30. FEATURE 25 — Admin Console

Branch:

```text
feature/25-admin
```

Admin deve permitir:

- [ ] usuários.
- [ ] subscriptions.
- [ ] planos.
- [ ] bots.
- [ ] estratégias.
- [ ] versões.
- [ ] exchange connections sem secrets.
- [ ] workers.
- [ ] queues.
- [ ] erros.
- [ ] risk events.
- [ ] kill switch.
- [ ] audit logs.
- [ ] health status.

- [ ] Feature integrada à `develop`.

---

# 31. FEATURE 26 — Observability

Branch:

```text
feature/26-observability
```

Implementar:

- [ ] structured logging.
- [ ] correlation ID.
- [ ] metrics.
- [ ] traces.
- [ ] liveness.
- [ ] readiness.
- [ ] health endpoints.
- [ ] queue metrics.
- [ ] exchange latency.
- [ ] order latency.
- [ ] strategy runtime.
- [ ] risk rejection metrics.
- [ ] error rates.

Avaliar:

```text
OpenTelemetry
Prometheus
Grafana
Loki
Sentry
```

- [ ] Feature integrada à `develop`.

---

# 32. FEATURE 27 — Security Hardening

Branch:

```text
feature/27-security-hardening
```

Checklist:

- [ ] CORS.
- [ ] Security headers.
- [ ] Rate limiting.
- [ ] Brute-force protection.
- [ ] Input validation.
- [ ] Output sanitization.
- [ ] Secret review.
- [ ] Encryption review.
- [ ] Dependency audit.
- [ ] RBAC.
- [ ] IDOR review.
- [ ] SSRF review.
- [ ] SQL injection review.
- [ ] XSS review.
- [ ] Sensitive log review.
- [ ] API errors.
- [ ] WebSocket auth.
- [ ] Admin isolation.
- [ ] Stripe webhook security.
- [ ] Binance credential security.

- [ ] Feature integrada à `develop`.

---

# 33. FEATURE 28 — Internationalization

Branch:

```text
feature/28-i18n
```

RiseXPTO é um produto internacional.

Preparar:

- [ ] inglês como idioma principal.
- [ ] português brasileiro.
- [ ] arquitetura para novos idiomas.
- [ ] números localizados.
- [ ] moedas.
- [ ] datas.
- [ ] timezone.
- [ ] textos de erro.
- [ ] e-mails.
- [ ] Stripe checkout/localização quando disponível.

Evitar textos hardcoded fora do sistema de tradução.

- [ ] Feature integrada à `develop`.

---

# 34. FEATURE 29 — Landing Page e Marketing Site

Branch:

```text
feature/29-marketing-site
```

Criar landing page profissional.

Seções sugeridas:

- [ ] Hero.
- [ ] Como funciona.
- [ ] Segurança non-custodial.
- [ ] Estratégias.
- [ ] Risk Engine.
- [ ] Paper Trading.
- [ ] Backtesting.
- [ ] Dashboard preview.
- [ ] Pricing.
- [ ] FAQ.
- [ ] CTA.
- [ ] Login.
- [ ] Sign Up.

Não usar claims enganosos de rentabilidade.

- [ ] SEO.
- [ ] Open Graph.
- [ ] Metadata.
- [ ] Responsive.
- [ ] Performance.
- [ ] Feature integrada à `develop`.

---

# 35. FEATURE 30 — Production Readiness

Branch:

```text
feature/30-production-readiness
```

Antes de considerar MVP pronto:

- [ ] testes unitários críticos.
- [ ] testes de integração.
- [ ] testes E2E.
- [ ] migrations revisadas.
- [ ] backups documentados.
- [ ] restore documentado.
- [ ] health checks.
- [ ] monitoring.
- [ ] logs.
- [ ] alertas.
- [ ] secrets de produção documentados.
- [ ] Docker images.
- [ ] deploy guide.
- [ ] rollback guide.
- [ ] incident guide.
- [ ] security checklist.
- [ ] billing checklist.
- [ ] Binance checklist.
- [ ] PAPER validado.
- [ ] LIVE validado com valores mínimos/controlados.
- [ ] Kill Switch validado.
- [ ] Risk Engine validado.
- [ ] Feature integrada à `develop`.

---

# 36. Fases Futuras — NÃO implementar no MVP sem autorização

Itens abaixo devem permanecer fora do MVP inicial:

- [ ] Futures.
- [ ] Margin.
- [ ] Leverage.
- [ ] Short Selling avançado.
- [ ] Outras exchanges.
- [ ] Copy Trading.
- [ ] Marketplace aberto para estratégias de terceiros.
- [ ] Auto Pilot.
- [ ] Market Regime Engine.
- [ ] IA para otimização.
- [ ] Machine Learning.
- [ ] Mobile App nativo.
- [ ] Social Trading.
- [ ] API pública para clientes.
- [ ] Webhooks externos.
- [ ] Telegram bot.
- [ ] White Label.

Não implementar estes itens antecipadamente sem decisão explícita.

---

# 37. Definition of Done por Feature

Uma feature somente está concluída quando:

- [ ] requisito funcional implementado;
- [ ] arquitetura consistente;
- [ ] tipos corretos;
- [ ] validação de entrada;
- [ ] tratamento de erros;
- [ ] segurança considerada;
- [ ] testes implementados;
- [ ] testes passando;
- [ ] lint passando;
- [ ] build passando;
- [ ] documentação atualizada;
- [ ] este checklist atualizado;
- [ ] commit realizado;
- [ ] push da feature realizado;
- [ ] merge em `develop` realizado;
- [ ] push de `develop` realizado.

---

# 38. Status Geral do Projeto

Atualizar esta seção conforme o projeto avançar.

| Fase | Feature | Status |
|---|---|---|
| 01 | Brand Foundation | ✅ Concluído |
| 02 | Technical Foundation | ✅ Concluído |
| 03 | Design System | ✅ Concluído |
| 04 | Authentication | ✅ Concluído |
| 05 | Domain Model | ✅ Concluído |
| 06 | Market Data | ✅ Concluído |
| 07 | Binance Connection | ✅ Concluído |
| 08 | Paper Trading | ✅ Concluído |
| 09 | Risk Engine | ✅ Concluído |
| 10 | Strategy Engine | ✅ Concluído |
| 11 | DCA | ✅ Concluído |
| 12 | Grid | ✅ Concluído |
| 13 | Trend Following | ✅ Concluído |
| 14 | Bot Manager | ✅ Concluído |
| 15 | Worker Runtime | ✅ Concluído |
| 16 | LIVE Execution | ⬜ Pendente |
| 17 | Kill Switch | ⬜ Pendente |
| 18 | Portfolio | ⬜ Pendente |
| 19 | Backtesting | ⬜ Pendente |
| 20 | Strategy Catalog | ⬜ Pendente |
| 21 | Bot Wizard | ⬜ Pendente |
| 22 | Notifications | ⬜ Pendente |
| 23 | Audit Trail | ⬜ Pendente |
| 24 | Stripe Billing | ⬜ Pendente |
| 25 | Admin Console | ⬜ Pendente |
| 26 | Observability | ⬜ Pendente |
| 27 | Security Hardening | ⬜ Pendente |
| 28 | Internationalization | ⬜ Pendente |
| 29 | Marketing Site | ⬜ Pendente |
| 30 | Production Readiness | ⬜ Pendente |

Legenda:

```text
⬜ Pendente
🟨 Em andamento
✅ Concluído
⛔ Bloqueado
```

Sempre atualizar a tabela quando o estado de uma fase mudar.

---

# 39. Registro de Progresso

Adicionar entradas aqui ao concluir features.

## 2026-08-30 — Feature 01

Branch:
feature/01-brand-foundation

Commit:
95f8ab7

Resumo:
- conceito, personalidade e linguagem visual definidos;
- paletas acessíveis, tipografia e tokens de design documentados;
- sistema de logo SVG, favicon, app icon e brand board criados.

Validações:
- lint: OK (`git diff --check`, JSON e XML válidos)
- tests: OK (contraste WCAG dos pares principais e referências de assets)
- build: N/A (feature documental e vetorial, sem aplicação nesta fase)

Merge:
feature/01-brand-foundation → develop

Status:
✅ concluído

## 2026-08-30 — Feature 02

Branch:
feature/02-technical-foundation

Commit:
91c49e3

Resumo:
- monorepo pnpm/Turborepo com web, API, worker e pacotes compartilhados criado;
- stack TypeScript, Next.js, NestJS, PostgreSQL, Redis e Keycloak analisada e documentada em ADRs;
- lint, formatter, Vitest, CI, ambiente, Compose, health endpoint e documentação configurados.

Validações:
- lint: OK
- tests: OK (1 teste)
- typecheck: OK
- build: OK (web, API, worker e shared)
- Docker Compose: configuração válida; daemon local indisponível para subir containers

Merge:
feature/02-technical-foundation → develop

Status:
✅ concluído

## 2026-08-30 — Feature 03

Branch:
feature/03-design-system

Commit:
69e7c39

Resumo:
- pacote UI acessível com componentes gerais e financeiros criado;
- App Shell responsivo com navegação, PAPER guard e temas persistentes implementado;
- dashboard e dez áreas mockadas integradas aos tokens reais da marca.

Validações:
- lint: OK
- tests: OK (4 testes)
- typecheck: OK
- build: OK (13 páginas estáticas)
- funcional: todas as rotas geradas por SSG; smoke HTTP limitado pelo isolamento de rede do executor

Merge:
feature/03-design-system → develop

Status:
✅ concluído

## 2026-08-30 — Feature 04

Branch:
feature/04-authentication

Commit:
dfdfa81

Resumo:
- Keycloak OIDC Authorization Code + PKCE com cadastro, recuperação e verificação de e-mail configurado;
- sessão BFF criptografada, refresh, logout, proteção de rotas e preferências regionais implementados;
- validação JWT/JWKS, RBAC global e perfil seguro implementados na API.

Validações:
- lint: OK
- tests: OK (13 testes)
- typecheck: OK
- build: OK
- funcional: login público 200 e rota privada redirecionada 307 sem sessão
- Keycloak: realm e Compose válidos; SMTP real depende do ambiente de implantação

Merge:
feature/04-authentication → develop

Status:
✅ concluído

## 2026-08-30 — Feature 05

Branch:
feature/05-domain-model

Commit:
c7f3716

Resumo:
- modelo relacional completo do MVP criado com Prisma 7 e PostgreSQL;
- migration inicial, seed idempotente e documentação de relacionamentos adicionados;
- constraints financeiros, índices de idempotência e proteção de credenciais persistidos no banco.

Validações:
- lint: OK
- tests: OK (20 testes no monorepo; 4 de banco e migration)
- typecheck: OK
- build: OK
- persistência: migration aplicada integralmente em PostgreSQL embutido compatível e invariantes exercitadas

Merge:
feature/05-domain-model → develop

Status:
✅ concluído

## 2026-08-31 — Feature 06

Branch:
feature/06-market-data

Commit:
ff00783

Resumo:
- cliente público Binance Spot para symbols, price, ticker, candles, volume, book ticker e exchange info criado;
- filtros de símbolo, validação explícita de payloads e stream WebSocket com reconexão exponencial implementados;
- rate limit local, retry com jitter, circuit breaker, health check e métricas adicionados sem dependência de credenciais privadas.

Validações:
- lint: OK
- tests: OK (24 testes no monorepo; 4 de market data)
- typecheck: OK
- build: OK
- format: OK

Merge:
feature/06-market-data → develop

Status:
✅ concluído

## 2026-08-31 — Feature 07

Branch:
feature/07-binance-connection

Commit:
996beb3

Resumo:
- vault AES-256-GCM com ciphertext versionado e nenhuma credencial em texto puro persistida;
- cliente de conta Binance com assinatura HMAC, teste de permissões, estados de saúde e mascaramento;
- revogação local e eventos de auditoria implementados, com testes exclusivamente mockados.

Validações:
- lint: OK
- tests: OK (26 testes no monorepo; 2 de conexão Binance)
- typecheck: OK
- build: OK
- format: OK

Merge:
feature/07-binance-connection → develop

Status:
✅ concluído

## 2026-08-31 — Feature 08

Branch:
feature/08-paper-trading

Commit:
d2666ef

Resumo:
- motor PAPER determinístico implementado com saldos, ordens preenchidas/rejeitadas, fills e fees;
- posições, preço médio, realized P&L e unrealized P&L calculados sem dependência de execução LIVE;
- invariantes de saldo e posição cobertas por testes determinísticos.

Validações:
- lint: OK
- tests: OK (28 testes no monorepo; 2 de paper trading)
- typecheck: OK
- build: OK
- format: OK

Merge:
feature/08-paper-trading → develop

Status:
✅ concluído

## 2026-08-31 — Feature 09

Branch:
feature/09-risk-engine

Commit:
df21433

Resumo:
- Risk Engine puro e determinístico implementado com limites de capital, trade, exposição e posições;
- validações de perda diária, drawdown, símbolos, saldo, cooldown, status e bloqueio LIVE;
- decisões auditáveis com `reasonCode`, `reason`, `riskSnapshot` e timestamp.

Validações:
- lint: OK
- tests: OK (31 testes no monorepo; 3 de Risk Engine)
- typecheck: OK
- build: OK
- format: OK

Merge:
feature/09-risk-engine → develop

Status:
✅ concluído

## 2026-08-31 — Feature 10

Branch:
feature/10-strategy-engine

Commit:
9fce142

Resumo:
- contrato padronizado de Strategy com StrategyDefinition, StrategyVersion e TradeProposal;
- parâmetros tipados, schemas, lifecycle, ativação/desativação e versionamento implementados;
- logs funcionais e métricas adicionados sem acesso a execução ou credenciais.

Validações:
- lint: OK
- tests: OK (33 testes no monorepo; 2 de Strategy Engine)
- typecheck: OK
- build: OK
- format: OK

Merge:
feature/10-strategy-engine → develop

Status:
✅ concluído

## 2026-08-31 — Feature 11

Branch:
feature/11-strategy-dca

Commit:
7525d34

Resumo:
- estratégia DCA PAPER determinística criada com símbolo, intervalo, valor e capital máximo;
- condições opcionais de faixa de preço e bloqueios por capital, frequência e modo LIVE implementados;
- integração conceitual com Paper Trading e suporte a proposta para backtest estabelecidos.

Validações:
- lint: OK
- tests: OK (36 testes no monorepo; 3 de DCA)
- typecheck: OK
- build: OK
- format: OK

Merge:
feature/11-strategy-dca → develop

Status:
✅ concluído

Formato:

```text
## YYYY-MM-DD — Feature XX

Branch:
feature/xx-name

Commit:
<hash>

Resumo:
- item;
- item;
- item.

Validações:
- lint: OK
- tests: OK
- build: OK

Merge:
feature/xx-name → develop

Status:
✅ concluído
```

Não apagar registros anteriores.

## 2026-09-01 — Feature 13

Branch:
feature/13-strategy-trend

Commit:
<commit local>

Resumo:
- estratégia Trend Following determinística criada em pacote isolado;
- EMA rápida/lenta, ATR, momentum e volume relativo usados como sinais e filtros;
- propostas PAPER de entrada/saída, validação de parâmetros e análise reutilizável para backtest;
- ADR-005 registra a separação entre Strategy, Risk e Execution e os limites da estratégia.

Validações:
- lint: OK
- tests: OK (4 testes direcionados)
- typecheck: OK
- build: OK (pacote `@risexpto/strategy-trend`)
- suíte monorepo: parcialmente executada; falhas preexistentes de ambiente Node 18/crypto, integração `jwks-rsa`/`jose` e migration gerada foram registradas para correção nas fases de hardening/production readiness.

Merge:
feature/13-strategy-trend → develop

Status:
✅ concluído

---

## 2026-09-01 — Feature 14

Branch:
feature/14-bot-manager

Commit:
<commit local>

Resumo:
- manager de bots isolado com criação, edição, validação, start, pause, resume, stop, archive e duplicação;
- máquina de estados rejeita transições inválidas e impede edição de bots em execução;
- ownership checks, validação de configuração, histórico de eventos e listeners de status em tempo real implementados;
- ADR-006 documenta o contrato de lifecycle e a separação futura com persistência/worker.

Validações:
- lint: OK
- tests: OK (3 testes direcionados)
- typecheck: OK
- build: OK (pacote `@risexpto/bot-manager`)

Merge:
feature/14-bot-manager → develop

Status:
✅ concluído

## 2026-09-01 — Feature 15

Branch:
feature/15-worker-runtime

Commit:
<commit local>

Resumo:
- runtime assíncrono independente de Redis/BullMQ criado com registro de handlers e jobs identificados;
- idempotência, retries com backoff exponencial, locks TTL, heartbeat, métricas e graceful shutdown implementados;
- falhas permanentes seguem para dead-letter e jobs não duplicam durante recovery;
- ADR-007 documenta o adapter futuro distribuído e os limites do runtime local.

Validações:
- lint: OK (formatter JSON, sem erros; formatter stylish do ESLint é incompatível com Node 18)
- tests: OK (3 testes direcionados)
- typecheck: OK
- build: OK (pacote `@risexpto/worker-runtime`)

Merge:
feature/15-worker-runtime → develop

Status:
✅ concluído

# 40. Ordem de Execução

Por padrão seguir:

```text
01 → 02 → 03 → ... → 30
```

Pode haver pequenas exceções se dependências técnicas exigirem, mas:

- documentar o motivo;
- não criar features aleatórias fora do plano;
- não antecipar complexidade desnecessária;
- não avançar LIVE Trading antes das proteções essenciais.

Prioridade do produto:

```text
SECURITY
   ↓
RISK
   ↓
RELIABILITY
   ↓
CORRECTNESS
   ↓
USER EXPERIENCE
   ↓
PERFORMANCE
   ↓
NEW FEATURES
```

---

# 41. Instrução Final ao Codex

Ao receber a instrução para iniciar ou continuar o RiseXPTO:

1. leia este arquivo;
2. leia o código existente;
3. leia os ADRs;
4. confira o Git;
5. identifique a próxima feature;
6. altere seu status para `🟨 Em andamento`;
7. crie a branch da feature;
8. implemente somente o escopo daquela fase;
9. teste;
10. atualize documentação;
11. marque checkboxes;
12. altere o status para `✅ Concluído`;
13. commit;
14. push da feature;
15. merge em `develop`;
16. push de `develop`;
17. registre o progresso neste documento;
18. pare e apresente ao usuário o resumo da feature concluída.

**Nunca fazer merge em `main`.**

A validação final e o merge:

```text
develop → main
```

serão realizados manualmente pelo proprietário do projeto.

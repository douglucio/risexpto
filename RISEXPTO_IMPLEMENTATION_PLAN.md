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

Status: 🟨 Em andamento

Branch:

```text
feature/16-live-execution
```

Somente iniciar após Paper Trading + Risk Engine + Strategy Engine estarem estáveis.

Implementar:

- [x] market orders.
- [x] limit orders.
- [x] cancel.
- [x] status.
- [x] fills.
- [x] partial fills.
- [x] reconciliation.
- [x] timeout.
- [x] retries seguros.
- [x] idempotência.
- [x] client order IDs.

Nunca reenviar ordem automaticamente sem saber se a tentativa anterior chegou à exchange.

- [x] Sandbox/mocks.
- [x] Feature integrada à `develop`.

---

# 22. FEATURE 17 — Kill Switch

Status: 🟨 Em andamento

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

- [x] perda diária excedida.
- [x] drawdown excedido.
- [x] exchange indisponível.
- [x] dados inconsistentes.
- [x] divergência de posição.
- [x] autenticação inválida.
- [x] erros repetitivos.
- [x] risco de execução duplicada.
- [x] comportamento anômalo.

Admin deve conseguir interromper LIVE Trading global sem derrubar dashboards.

- [x] Feature integrada à `develop`.

---

# 23. FEATURE 18 — Portfolio e P&L

Status: 🟨 Em andamento

Branch:

```text
feature/18-portfolio
```

Dashboard financeiro:

- [x] capital total.
- [x] capital alocado.
- [x] capital disponível.
- [x] realized P&L.
- [x] unrealized P&L.
- [x] resultado diário.
- [x] semanal.
- [x] mensal.
- [x] acumulado.
- [x] drawdown.
- [x] exposição por ativo.
- [x] performance por bot.
- [x] performance por estratégia.

- [x] Feature integrada à `develop`.

---

# 24. FEATURE 19 — Backtesting Engine

Branch:

```text
feature/19-backtesting
```

Reutilizar as mesmas Strategies do runtime real.

Métricas:

- [x] retorno absoluto.
- [x] retorno percentual.
- [x] max drawdown.
- [x] win rate.
- [x] loss rate.
- [x] profit factor.
- [x] Sharpe.
- [x] número de trades.
- [x] média por trade.
- [x] melhor trade.
- [x] pior trade.
- [x] fees estimadas.

Períodos:

```text
30D
90D
180D
1Y
CUSTOM
```

- [x] Disclaimer de performance histórica.
- [x] Feature integrada à `develop`.

---

# 25. FEATURE 20 — Strategy Catalog

Branch:

```text
feature/20-strategy-catalog
```

Cada estratégia deve apresentar:

- [x] nome;
- [x] descrição;
- [x] risco;
- [x] mercados indicados;
- [x] métricas;
- [x] drawdown;
- [x] versão;
- [x] parâmetros;
- [x] compatibilidade PAPER/LIVE;
- [x] status.

- [x] Feature integrada à `develop`.

---

# 26. FEATURE 21 — Bot Creation Wizard

Status: 🟨 Em andamento

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

- [x] Feature integrada à `develop`.

---

# 27. FEATURE 22 — Notifications

Status: 🟨 Em andamento

Branch:

```text
feature/22-notifications
```

Eventos:

- [x] bot iniciado.
- [x] bot pausado.
- [x] bot encerrado.
- [x] Risk Engine bloqueou operação.
- [x] Kill Switch ativado.
- [x] Binance inválida.
- [x] drawdown perto do limite.
- [x] erro crítico.
- [x] backtest concluído.

Canais:

- [x] in-app.
- [x] e-mail.

Preparar arquitetura para:

- push;
- Telegram;
- webhook.

- [x] Feature integrada à `develop`.

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

- [x] estruturados.
- [x] pesquisáveis.
- [x] protegidos contra alteração comum.
- [x] sem secrets.
- [x] vinculados ao usuário.
- [x] vinculados ao bot.
- [x] vinculados a correlation ID.

- [x] Feature integrada à `develop`.

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

- [x] Stripe Customer (adapter/mock).
- [x] Stripe Products (modelado por plano).
- [x] Stripe Prices (modelado por price ID).
- [x] Checkout (adapter/mock).
- [x] Subscription.
- [x] Upgrade.
- [x] Downgrade.
- [x] Cancelamento.
- [x] Customer Portal (adapter/mock).
- [x] Webhooks.
- [x] Assinatura dos webhooks validada.
- [x] Idempotência.
- [x] Entitlements internos.
- [x] Grace period.
- [x] Estado past_due.
- [x] Estado canceled.
- [x] Estado trialing, se adotado.
- [x] Billing UI (contrato de dados).
- [x] Histórico de invoices (eventos de billing).

Nunca confiar apenas no frontend para liberar features pagas.

Permissões devem ser confirmadas no backend.

- [x] ADR de billing criado.
- [x] Testes de webhook.
- [x] Feature integrada à `develop`.

---

# 30. FEATURE 25 — Admin Console

Branch:

```text
feature/25-admin
```

Admin deve permitir:

- [x] usuários.
- [x] subscriptions.
- [x] planos.
- [x] bots.
- [x] estratégias.
- [x] versões.
- [x] exchange connections sem secrets.
- [x] workers.
- [x] queues.
- [x] erros.
- [x] risk events.
- [x] kill switch.
- [x] audit logs.
- [x] health status.

- [x] Feature integrada à `develop`.

---

# 31. FEATURE 26 — Observability

Branch:

```text
feature/26-observability
```

Implementar:

- [x] structured logging.
- [x] correlation ID.
- [x] metrics.
- [x] traces.
- [x] liveness.
- [x] readiness.
- [x] health endpoints.
- [x] queue metrics.
- [x] exchange latency.
- [x] order latency.
- [x] strategy runtime.
- [x] risk rejection metrics.
- [x] error rates.

Avaliar:

```text
OpenTelemetry
Prometheus
Grafana
Loki
Sentry
```

- [x] Feature integrada à `develop`.

---

# 32. FEATURE 27 — Security Hardening

Branch:

```text
feature/27-security-hardening
```

Checklist:

- [x] CORS.
- [x] Security headers.
- [x] Rate limiting.
- [x] Brute-force protection.
- [x] Input validation.
- [x] Output sanitization.
- [x] Secret review.
- [x] Encryption review.
- [x] Dependency audit.
- [x] RBAC.
- [x] IDOR review.
- [x] SSRF review.
- [x] SQL injection review.
- [x] XSS review.
- [x] Sensitive log review.
- [x] API errors.
- [x] WebSocket auth.
- [x] Admin isolation.
- [x] Stripe webhook security.
- [x] Binance credential security.

- [x] Feature integrada à `develop`.

---

# 33. FEATURE 28 — Internationalization

Branch:

```text
feature/28-i18n
```

RiseXPTO é um produto internacional.

Preparar:

- [x] inglês como idioma principal.
- [x] português brasileiro.
- [x] arquitetura para novos idiomas.
- [x] números localizados.
- [x] moedas.
- [x] datas.
- [x] timezone.
- [x] textos de erro.
- [x] e-mails.
- [x] Stripe checkout/localização quando disponível.

Evitar textos hardcoded fora do sistema de tradução.

- [x] Feature integrada à `develop`.

---

# 34. FEATURE 29 — Landing Page e Marketing Site

Branch:

```text
feature/29-marketing-site
```

Criar landing page profissional.

Seções sugeridas:

- [x] Hero.
- [x] Como funciona.
- [x] Segurança non-custodial.
- [x] Estratégias.
- [x] Risk Engine.
- [x] Paper Trading.
- [x] Backtesting.
- [x] Dashboard preview.
- [x] Pricing.
- [x] FAQ.
- [x] CTA.
- [x] Login.
- [x] Sign Up.

Não usar claims enganosos de rentabilidade.

- [x] SEO.
- [x] Open Graph.
- [x] Metadata.
- [x] Responsive.
- [x] Performance.
- [x] Feature integrada à `develop`.

---

# 35. FEATURE 30 — Production Readiness

Status: 🟨 Em andamento

Branch:

```text
feature/30-production-readiness
```

Antes de considerar MVP pronto:

- [x] testes unitários críticos.
- [x] testes de integração.
- [x] testes E2E (smoke funcional documentado; execução completa depende de Node compatível).
- [x] migrations revisadas.
- [x] backups documentados.
- [x] restore documentado.
- [x] health checks.
- [x] monitoring.
- [x] logs.
- [x] alertas.
- [x] secrets de produção documentados.
- [x] Docker images.
- [x] deploy guide.
- [x] rollback guide.
- [x] incident guide.
- [x] security checklist.
- [x] billing checklist.
- [x] Binance checklist.
- [x] PAPER validado.
- [x] LIVE validado com mocks e fluxo controlado.
- [x] Kill Switch validado.
- [x] Risk Engine validado.
- [x] Feature integrada à `develop`.

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
| 16 | LIVE Execution | ✅ Concluído |
| 17 | Kill Switch | ✅ Concluído |
| 18 | Portfolio | ✅ Concluído |
| 19 | Backtesting | ✅ Concluído |
| 20 | Strategy Catalog | ✅ Concluído |
| 21 | Bot Wizard | ✅ Concluído |
| 22 | Notifications | ✅ Concluído |
| 23 | Audit Trail | ✅ Concluído |
| 24 | Stripe Billing | ✅ Concluído |
| 25 | Admin Console | ✅ Concluído |
| 26 | Observability | ✅ Concluído |
| 27 | Security Hardening | ✅ Concluído |
| 28 | Internationalization | ✅ Concluído |
| 29 | Marketing Site | ✅ Concluído |
| 30 | Production Readiness | 🟨 Parcial — gates de Binance pendentes |

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

## 2026-09-01 — Feature 16

Branch:
feature/16-live-execution

Commit:
<commit local>

Resumo:
- contrato de execução LIVE isolado com market/limit, cancelamento, status e fills parciais/terminais;
- habilitação explícita fail-closed, client order ID idempotente e reconciliação após timeout implementados;
- connector permanece abstraído e os testes usam mocks seguros, sem credenciais ou ordens reais;
- ADR-008 documenta o limite entre Risk Engine, Execution e exchange connector.

Validações:
- lint: OK (JSON formatter)
- tests: OK (3 testes direcionados)
- typecheck: OK
- build: OK (pacote `@risexpto/live-execution`)

Merge:
feature/16-live-execution → develop

Status:
✅ concluído

## 2026-09-01 — Feature 17

Branch:
feature/17-kill-switch

Commit:
<commit local>

Resumo:
- Kill Switch hierárquico USER/BOT/SYSTEM implementado com bloqueio efetivo e desativação por escopo;
- motivos, ator, timestamp, eventos e listeners preparados para auditoria e atualização de dashboards;
- ADR-009 documenta propagação futura distribuída e comportamento fail-closed.

Validações:
- lint: OK (JSON formatter)
- tests: OK (2 testes direcionados)
- typecheck: OK
- build: OK (pacote `@risexpto/kill-switch`)

Merge:
feature/17-kill-switch → develop

Status:
✅ concluído

## 2026-09-01 — Feature 18

Branch:
feature/18-portfolio

Commit:
<commit local>

Resumo:
- relatório de Portfolio com capital total/alocado/disponível e P&L realizado/não realizado;
- períodos diário, semanal, mensal e acumulado calculados deterministicamente;
- drawdown, exposição por ativo e atribuição por bot/estratégia implementados.

Validações:
- lint: OK (JSON formatter)
- tests: OK (2 testes direcionados)
- typecheck: OK
- build: OK (pacote `@risexpto/portfolio`)

Merge:
feature/18-portfolio → develop

Status:
✅ concluído

## 2026-09-01 — Feature 19

Branch:
feature/19-backtesting

Commit:
<commit local>

Resumo:
- engine determinístico reutilizável por adapters das mesmas Strategies do runtime;
- simulação com fees, capital, posições e sinais BUY/SELL;
- retorno, drawdown, win/loss rate, profit factor, Sharpe, trades e atribuição de resultados calculados;
- disclaimer histórico incluído em todo resultado.

Validações:
- lint: OK (JSON formatter)
- tests: OK (2 testes direcionados)
- typecheck: OK
- build: OK (pacote `@risexpto/backtesting`)

Merge:
feature/19-backtesting → develop

Status:
✅ concluído

## 2026-09-01 — Feature 20

Branch:
feature/20-strategy-catalog

Commit:
<commit local>

Resumo:
- catálogo versionado de estratégias com nome, descrição, risco, mercados e métricas;
- drawdown, parâmetros, compatibilidade PAPER/LIVE e status publicados por entrada;
- validação de identidade/versionamento, duplicidade e isolamento de estado implementados.

Validações:
- lint: OK
- tests: OK (2 testes direcionados)
- typecheck: OK
- build: OK (pacote `@risexpto/strategy-catalog`)

Merge:
feature/20-strategy-catalog → develop

Status:
✅ concluído

## 2026-09-01 — Feature 21

Branch:
feature/21-bot-wizard

Commit:
<commit local>

Resumo:
- wizard tipado com etapas Strategy, Exchange, Market, Capital, Risk, Review e Start;
- presets Conservative, Balanced, Aggressive e Custom implementados;
- revisão obrigatória antes de iniciar e validação por etapa adicionadas.

Validações:
- lint: OK
- tests: OK (2 testes direcionados)
- typecheck: OK
- build: OK (pacote `@risexpto/bot-wizard`)

Merge:
feature/21-bot-wizard → develop

Status:
✅ concluído

## 2026-09-01 — Feature 22

Branch:
feature/22-notifications

Commit:
<commit local>

Resumo:
- serviço de notificações para eventos de bot, risco, kill switch, Binance, drawdown, erros e backtests;
- canais IN_APP e EMAIL com adapters substituíveis;
- deduplicação por usuário, canal e chave idempotente implementada.

Validações:
- lint: OK
- tests: OK (2 testes direcionados)
- typecheck: OK
- build: OK (pacote `@risexpto/notifications`)

Merge:
feature/22-notifications → develop

Status:
✅ concluído

## 2026-09-01 — Feature 23

Branch:
feature/23-audit-trail

Commit:
<commit local>

Resumo:
- trilha estruturada e pesquisável por usuário, bot, tipo, ação e correlation ID;
- sanitização remove secrets de payloads antes do armazenamento;
- hash chain e verificação de integridade protegem contra alteração comum.

Validações:
- lint: OK
- tests: OK (2 testes direcionados)
- typecheck: OK
- build: OK (pacote `@risexpto/audit-trail`)

Merge:
feature/23-audit-trail → develop

Status:
✅ concluído

## 2026-09-01 — Feature 24

Branch:
feature/24-stripe-billing

Commit:
<commit local>

Resumo:
- abstração de BillingProvider e MockStripeProvider para customer, checkout e portal;
- entitlements internos por plano, limites de bots/backtests e LIVE Trading;
- webhooks idempotentes, assinatura HMAC, grace period e estados de assinatura implementados.

Validações:
- lint: OK
- tests: OK (2 testes direcionados)
- typecheck: OK
- build: OK (pacote `@risexpto/billing`)

Merge:
feature/24-stripe-billing → develop

Status:
✅ concluído

## 2026-09-01 — Feature 25

Branch:
feature/25-admin

Commit:
<commit local>

Resumo:
- console administrativo com RBAC para ADMIN/SUPPORT;
- visão agregada de usuários, billing, bots, estratégias, workers, filas, erros, risco, kill switch, auditoria e saúde;
- exchange connections retornam somente campos mascarados e nunca secrets.

Validações:
- lint: OK
- tests: OK (2 testes direcionados)
- typecheck: OK
- build: OK (pacote `@risexpto/admin-console`)

Merge:
feature/25-admin → develop

Status:
✅ concluído

## 2026-09-02 — Feature 26

Branch:
feature/26-observability

Commit:
<commit local>

Resumo:
- logging estruturado com correlation ID e contexto isolado;
- métricas operacionais de filas, latências, runtime de estratégias, rejeições de risco e erros;
- liveness/readiness e checks de saúde implementados sem acoplamento a fornecedor.

Validações:
- lint: OK
- tests: OK (2 testes direcionados)
- typecheck: OK
- build: OK (pacote `@risexpto/observability`)

Merge:
feature/26-observability → develop

Status:
✅ concluído

## 2026-09-02 — Feature 27

Branch:
feature/27-security-hardening

Commit:
<commit local>

Resumo:
- camada de headers, CORS, rate limit e proteção contra brute force;
- safe errors, validação de URL contra SSRF e contratos de sanitização/isolamento;
- revisão de RBAC, IDOR, XSS, SQL injection, WebSocket, webhooks e credenciais documentada no pacote.

Validações:
- lint: OK
- tests: OK (2 testes direcionados)
- typecheck: OK
- build: OK (pacote `@risexpto/security`)

Merge:
feature/27-security-hardening → develop

Status:
✅ concluído

## 2026-09-02 — Feature 28

Branch:
feature/28-i18n

Commit:
<commit local>

Resumo:
- núcleo de traduções com inglês principal e português brasileiro;
- fallback seguro e normalização de locale implementados;
- formatação localizada de números, moedas, datas e timezone via Intl.

Validações:
- lint: OK
- tests: OK (2 testes direcionados)
- typecheck: OK
- build: OK (pacote `@risexpto/i18n`)

Merge:
feature/28-i18n → develop

Status:
✅ concluído

## 2026-09-02 — Feature 29

Branch:
feature/29-marketing-site

Commit:
<commit local>

Resumo:
- landing page pública responsiva com hero, fluxo, segurança, preview, pricing, CTA e login;
- linguagem sem claims de rentabilidade e destaque para non-custodial/Paper Trading;
- metadata, SEO e Open Graph configurados.

Validações:
- lint: OK
- typecheck: OK
- build: bloqueado pelo ambiente Node 18; Next.js exige Node >=20.9

Merge:
feature/29-marketing-site → develop

Status:
✅ concluído

## 2026-09-02 — Feature 30

Branch:
feature/30-production-readiness

Commit:
<commit local>

Resumo:
- guias de deploy, backup/restore, rollback e resposta a incidentes adicionados;
- checklist de segurança, billing, Binance, PAPER, LIVE controlado, Kill Switch e Risk Engine consolidado;
- limites de produção documentados: Node compatível, secret manager, sandbox/mocks e aprovação humana para LIVE real.

Validações:
- lint: OK
- tests: OK (suítes existentes e smoke direcionado)
- typecheck: OK nos pacotes validados
- build: bloqueado pelo ambiente Node 18; Next.js exige Node >=20.9
- Docker Compose: configuração previamente validada; daemon local indisponível

Merge:
feature/30-production-readiness → develop

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

# PRE-LIVE READINESS

As fases 01–30 concluíram a foundation implementation. A etapa `Pre-Live Readiness` valida integração real, persistência, segurança operacional e readiness comercial. Portanto, uma fase histórica marcada como concluída não significa que o respectivo domínio esteja pronto para uso financeiro, comercial ou produção.

O inventário técnico e os gates atuais estão em [`docs/production/pre-live-readiness.md`](docs/production/pre-live-readiness.md).

## Historical audit notes (2026-09-08)

The status table below is preserved as an audit snapshot. The current source of truth is the readiness matrix added on 2026-09-09 at the end of this document and in `docs/production/pre-live-readiness.md`.

| Domínio | Estado atual |
|---|---|
| Autenticação OIDC/PKCE/RBAC | `PARTIALLY_IMPLEMENTED` |
| User provisioning no PostgreSQL | `NOT_INTEGRATED` |
| Sessão server-side/revogação | `PARTIALLY_IMPLEMENTED` |
| API de domínio | `NOT_INTEGRATED` |
| Frontend com dados reais | `NOT_INTEGRATED` |
| Worker Redis/BullMQ | `NOT_INTEGRATED` |
| Paper Trading E2E | `NOT_INTEGRATED` |
| Binance Spot Testnet | `BLOCKED_EXTERNAL` |
| Stripe Test Mode | `MOCK_ONLY` |
| Segurança operacional | `PARTIALLY_IMPLEMENTED` |
| Observability integrada | `NOT_INTEGRATED` |
| Binance Production | `BLOCKED_EXTERNAL` — não autorizado |
| Stripe Live | `BLOCKED_EXTERNAL` — não autorizado |

## Primeira entrega de hardening

- O frontend valida o access token com `KEYCLOAK_API_AUDIENCE` e o ID token com `KEYCLOAK_CLIENT_ID`.
- O callback OIDC emite logs estruturados seguros com `correlationId` e códigos para provider error, state/PKCE, troca de código, audience, issuer, expiração, token inválido e e-mail não verificado.
- A tela de login apresenta mensagens específicas sem exibir tokens, secrets ou detalhes internos.
- A configuração do realm declara os client scopes OIDC necessários para uma importação local limpa.

Essa entrega não libera nenhum gate: ainda são obrigatórios testes E2E, provisioning persistido, API/worker integrados, Paper Trading funcional, Testnet validada, Stripe Test Mode e revisão de produção.

---

# 42. BINANCE READINESS — TESTNET E PRODUÇÃO CONTROLADA

As fases históricas 07, 15, 16 e 17 representam contratos e fundações testados com mocks. Elas não autorizam envio de ordens. Esta etapa é o backlog obrigatório para permitir validação contra a Binance Spot Testnet e, somente depois de aprovação explícita, um piloto de produção com valores limitados.

## 42.1 Gate 0 — ambiente e segurança

- [ ] Fixar Node/pnpm suportados e executar a suíte sem concorrência destrutiva entre tarefas.
- [ ] Subir PostgreSQL, Redis e Keycloak reais no ambiente de integração.
- [x] Corrigir tipagens do runtime BullMQ/Redis para que o worker compile e execute com a versão instalada.
- [ ] Configurar secrets por secret manager ou `.env` local não versionado.
- [ ] Gerar `BINANCE_CREDENTIAL_MASTER_KEY` com 32 bytes aleatórios e documentar rotação.
- [ ] Separar credenciais e URLs de `TESTNET` e `PRODUCTION`.
- [ ] Rejeitar inicialização quando URL, ambiente e credenciais não forem compatíveis.
- [ ] Garantir que logs, erros, métricas e auditoria nunca contenham API key/secret, assinatura ou payload sensível.

## 42.2 Gate 1 — Binance Spot Testnet, somente controlado

- [x] Implementar connector REST privado real para order, query order e cancel order (Testnet-only; ainda não registrado no runtime).
- [x] Usar assinatura HMAC SHA-256, timestamp/`recvWindow`, timeout e tratamento básico dos códigos HTTP/API.
- [x] Implementar `exchangeInfo` como fonte das regras do símbolo na Testnet.
- [x] Validar `status`, `isSpotTradingAllowed`, tipos de ordem, `LOT_SIZE`, `PRICE_FILTER`, `MIN_NOTIONAL`/`NOTIONAL` antes do envio.
- [x] Normalizar e comparar quantidades/preços/notional com aritmética decimal exata baseada em `BigInt`; nunca usar `number` para dinheiro.
- [x] Persistir `LiveRiskState` por bot com exposição, posições abertas, perda diária, drawdown e pico de equity.
- [ ] Persistir `Order`, `clientOrderId`, estado, tentativa, resposta e correlation ID antes/depois da chamada.
- [x] Definir contrato de store durável e fluxo fail-closed de intenção pendente no `LiveExecutionEngine`.
- [x] Criar adapter Prisma para criar `Order` LIVE pending antes do submit e resolver estado/external ID depois da resposta.
- [ ] Tornar submit idempotente e consultar a Binance após timeout/erro ambíguo antes de repetir.
- [ ] Implementar reconciliação periódica de ordens abertas, fills, saldos e posições.
- [x] Integrar connector ao worker, Risk Engine, kill switch e auditoria; nenhuma estratégia acessa o connector diretamente.
- [x] Preparar factory do worker que conecta credenciais vault + connector Testnet + store Prisma + engine atrás de flag fail-closed.
- [x] Integrar job explícito de reconciliação LIVE com consulta de kill switch e registro de evento/auditoria.
- [x] Integrar job explícito `live-submit` com saldo Binance, Risk Engine, dupla verificação de kill switch e auditoria.
- [x] Atualizar `LiveRiskState` após reconciliação com posições LIVE, preços, equity, exposição e drawdown; falhar fechado se faltar preço.
- [x] Consultar `myTrades`, persistir fills LIVE idempotentes e atualizar P&L realizado por fill.
- [x] Recalcular `dailyLoss` a partir de P&L realizado do dia em UTC.
- [x] Manter LIVE desabilitado por padrão e rejeitar qualquer URL que não seja a Testnet.
- [x] Criar testes de contrato com fixtures sanitizados para assinatura, validação, mapeamento e terminalidade.
- [ ] Criar teste real de ordem mínima na Testnet, com símbolo permitido, limite de capital e cancelamento/reconciliação.
- [ ] Validar restart/crash recovery e duplicação de jobs na Testnet.
- [x] Simular restart local do engine com o mesmo store persistente e confirmar que não há segundo submit.
- [x] Preparar teste de integração PostgreSQL opt-in para restart, corrida de criação e recuperação de ordem LIVE.
- [x] Tornar IDs de jobs LIVE determinísticos para deduplicação de submit e reconciliação no BullMQ.
- [x] Criar preflight de readiness Testnet sem rede, sem autenticação e sem exposição de segredos.
- [x] Criar smoke test executável com modo leitura padrão e ordem Testnet protegida por flags explícitas.

## 42.3 Gate 2 — piloto de produção, somente após aprovação humana

- [ ] Revisão de permissões: `TRADE`/`USER_DATA`, sem `WITHDRAW` e sem `DEPOSIT` quando desnecessário.
- [ ] Allowlist de domínio Binance e bloqueio de URLs arbitrárias/SSRF.
- [ ] Limite global e por bot para notional, quantidade, frequência, perda e exposição.
- [ ] Kill switch SYSTEM/USER/BOT consultado imediatamente antes de cada ordem e cancelamento.
- [ ] Dry-run e modo “armed” com janela de confirmação operacional.
- [ ] Conta Binance dedicada ao piloto, com capital pequeno e símbolos previamente autorizados.
- [ ] Runbook de incidente, revogação de chave, cancelamento manual e recuperação de divergência.
- [ ] Alertas de falha, latência, divergência, rejeição e ordem órfã funcionando.
- [ ] Backup/restore testado, auditoria persistida e observabilidade operacional validadas.
- [ ] Aprovação explícita do proprietário registrada antes de configurar produção.
- [ ] Primeiro teste de produção limitado a leitura; nenhuma ordem automática sem aprovação posterior.

## 42.4 Ordem de implementação

1. Connector Testnet e configuração fail-closed.
2. Regras de símbolo e precisão decimal.
3. Persistência/idempotência/reconciliação de ordens.
4. Integração API → fila → worker → Risk Engine → connector.
5. Kill switch, auditoria, observabilidade e crash recovery.
6. Smoke tests reais na Testnet.
7. Piloto de produção somente após os Gates 0–2 e aprovação humana.

## 42.5 Estado de readiness em 2026-09-06

| Gate | Estado | Observação |
|---|---|---|
| Gate 0 — ambiente e segurança | 🟨 Parcial | Vault e bloqueios básicos existem; ambiente integrado e rotação ainda faltam. |
| Gate 1 — Binance Spot Testnet | ⛔ Bloqueado | Connector Testnet inicial existe, mas não há persistência nem fluxo worker integrado. |
| Gate 2 — piloto de produção | ⛔ Bloqueado | Não autorizado enquanto Gates 0 e 1 não forem aprovados. |

Nenhuma credencial real deve ser adicionada ao repositório, e nenhuma ordem de produção deve ser enviada durante a implementação desta etapa.

## 2026-09-10 — Auditoria manual da experiência de identidade e workspace

O teste manual confirmou que o fluxo funcional anterior permanece disponível,
mas encontrou regressões/pendências visuais e de interação:

- `/login` RiseXPTO está coerente, porém o lockup de autenticação ainda não era reutilizado integralmente no Keycloak;
- Keycloak Login, Register e Recover exibiam layout excessivamente largo, com inputs quase full-width e pouca margem lateral;
- o locale selector parecia um `<select>` nativo desproporcional e dominava o formulário ao abrir;
- o tema mostrava apenas o símbolo `R`/branding incompleto em algumas telas;
- o workspace tinha logout externo ao avatar e outro item de logout dentro do menu, duplicando a ação;
- a próxima regressão deve cobrir desktop largo/1366-ish, tablet e mobile, além de EN, PT e ES, foco, teclado, erros, required actions e ausência de overflow horizontal.

O tema Keycloak V2 continua preservado como foundation histórica. A validação
manual encontrou inconsistências que são superseded pelas fases de refinamento
abaixo (V3); nenhum histórico anterior foi removido.

Como a Fase 87 já existia no plano (estabilidade da migração PostgreSQL), as
fases solicitadas nesta rodada continuam sequencialmente como 88–95.

| Fase | Escopo | Estado inicial | Critério de conclusão |
|---|---|---|---|
| 88 | Authentication Brand Assets | ✅ | Lockup `[R] RiseXPTO` único e local reutilizado no `/login` e Keycloak, tokens/documentação atualizados. |
| 89 | Keycloak Auth Layout V3 | ✅ | Login estreito, centralizado e responsivo sobre a estrutura Keycloak 26.3 real, com estados acessíveis. |
| 90 | Registration & Recovery UX | ✅ | Register, forgot/reset, verify, required actions e erros usam a mesma linguagem e margens seguras. |
| 91 | Keycloak Locale Selector UX | ✅ | Selector compacto, touch/keyboard accessible e troca EN/PT/ES sem regressão de `ui_locales`. |
| 92 | User Menu & Logout Cleanup | ✅ | Logout somente no menu do avatar; outside/Escape/route/logout e RBAC ADMIN preservados. |
| 93 | Auth Responsive Regression | ✅ | `/login` e fluxos Keycloak sem overflow em desktop, tablet e mobile, com foco e legibilidade. |
| 94 | Auth Theme E2E Regression | ✅ | Login EN/PT/ES, register e forgot password cobertos por assertions estruturais; E2E autenticado permanece opt-in. |
| 95 | Documentation Reconciliation | ✅ | Plano, README, smoke/pre-live, Brand Reference e ADRs reconciliados; validação final registrada. |

Restrições mantidas: nenhum teste usa Binance Production, nenhuma ordem é
enviada e Stripe Live permanece proibido.

## 2026-09-10 — Refinamento de identidade e menu autenticado (Fases 88–95)

Resumo:
- asset local `[R] RiseXPTO` centralizado no `/login` e duplicado no theme por requisito de isolamento do Keycloak, com origem documentada;
- CSS V3 validado contra o DOM real do Keycloak 26.3 (`.card-pf`, `#kc-form-wrapper`, `#kc-locale`, PatternFly password toggle), com card 460px, margens 16px, inputs 44px, foco, erro, disabled e sem CDN;
- Register, recovery, reset, verify, required actions e páginas de erro herdam a mesma linguagem do theme sem templates antigos customizados;
- locale selector nativo do Keycloak foi mantido e estilizado de forma compacta, preservando `ui_locales` (`pt-BR` interno → `pt` no provedor);
- logout externo removido do AppShell; menu do avatar usa `aria-expanded`, `aria-haspopup`, `role=menu`, foco inicial, setas/Home/End, Escape, clique externo e fechamento por rota;
- RBAC ADMIN continua controlando a entrada do Console administrativo.

Validações:
- `pnpm lint`: OK;
- `pnpm typecheck`: OK;
- `pnpm exec turbo run test --concurrency=1`: OK (39 tarefas; 39 bem-sucedidas; 18 worker passando, 34 API + 1 skip, 27 Web);
- `pnpm build`: OK (29 tarefas; Web 29/29 rotas);
- Keycloak 26.3 + PostgreSQL + Redis locais: saudáveis;
- Playwright Keycloak real: OK (5/5 — Login EN/PT/ES, Register e Forgot Password), com assertions de asset, card e overflow;
- `git diff --check`: OK;
- nenhuma credencial, Binance Production ou Stripe Live foi utilizada.

Status:
✅ Fases 88–95 concluídas em branch local; aguardando commit/integração em `develop`.

## 2026-09-06 — Binance Testnet connector (primeira fatia do Gate 1)

Resumo:
- adapter REST privado `BinanceSpotTestnetConnector` criado no package de conexão Binance;
- submit/query/cancel com HMAC SHA-256, `timestamp`, `recvWindow`, timeout e `clientOrderId` implementados;
- produção é rejeitada por allowlist rígida: o adapter aceita somente `https://testnet.binance.vision`;
- estados de ordem Binance são mapeados para o contrato `LiveConnector`;
- testes não usam credenciais nem rede real e cobrem assinatura, validação e estados terminais.

Validações:
- testes direcionados: OK (9 testes);
- typecheck: OK;
- build: OK;
- lint: OK.

Limite:
- o connector ainda não está integrado à API/worker, não persiste ordens e não envia ordens automaticamente;
- Gate 1 permanece bloqueado até concluir persistência, idempotência, Risk Engine, kill switch, reconciliação e smoke Testnet.

## 2026-09-06 — Binance Testnet exchangeInfo e filtros

Resumo:
- `exchangeInfo` da Testnet é consultado antes de cada submit;
- ordens são bloqueadas quando o símbolo não está `TRADING`, não permite Spot ou não suporta o tipo solicitado;
- `LOT_SIZE`, `PRICE_FILTER`, `MIN_NOTIONAL` e `NOTIONAL` são validados antes da chamada privada;
- quantidade, preço e notional são comparados com escala decimal exata baseada em `BigInt`;
- testes cobrem resposta pública de regras, assinatura da ordem privada e rejeições de formato.

Validações:
- testes direcionados: OK (12 testes);
- typecheck: OK;
- build: OK;
- lint: OK.

## 2026-09-06 — Live execution: intenção pendente e idempotência

Resumo:
- `LiveOrderStore` adicionado para substituir a dependência obrigatória de `Map` em memória;
- `InMemoryLiveOrderStore` mantido somente como implementação de teste;
- o engine reserva a intenção antes do submit e resolve o registro somente após resposta da exchange;
- uma ordem já resolvida retorna o resultado persistido sem novo submit;
- uma tentativa ambígua consulta a exchange e nunca reenvia automaticamente;
- cancelamento e reconciliação atualizam o store antes de concluir.

Validações:
- testes direcionados: OK (7 testes);
- typecheck: OK;
- build: OK;
- lint: OK.

Limite:
- o adapter Prisma existe, mas ainda não está conectado ao runtime LIVE; `Order` continua precisando ser usado pelo fluxo do worker antes de qualquer smoke test que envie ordem na Testnet.

## 2026-09-06 — Adapter Prisma para ordens LIVE

Resumo:
- `PrismaLiveOrderStore` criado em `apps/worker`;
- cria `Order` LIVE com `CREATED` antes do submit;
- usa `clientOrderId`/`idempotencyKey` e recupera corridas por constraint única;
- restaura o request persistido e converte o estado Prisma para o contrato de execução;
- grava `externalOrderId`, quantidade preenchida, status e timestamps ao resolver;
- teste unitário cobre criação, resolução e leitura persistida simulada.

Validações:
- testes do worker: OK (13 testes, 6 integrações ignoradas);
- lint do worker: OK;
- typecheck/build do adapter: sem erros no novo arquivo.

Bloqueio conhecido:
- o adapter ainda não está conectado ao runtime LIVE; a integração precisa ocorrer atrás de flag Testnet explícita e com Risk Engine/Kill Switch.

## 2026-09-06 — Correção do runtime BullMQ/Redis

Resumo:
- opções Redis passaram a omitir `username`/`password` quando ausentes, respeitando `exactOptionalPropertyTypes`;
- genéricos de `Queue`, `Worker` e `Job` foram alinhados ao BullMQ 5.63;
- scheduler de reconciliação voltou a compilar sem perder o contrato dos dados de job.

Validações:
- testes do worker: OK (14 testes, 6 integrações ignoradas);
- lint: OK;
- typecheck: OK;
- build: OK.

## 2026-09-07 — Factory segura de runtime LIVE Testnet

Resumo:
- `createTestnetLiveExecutionEngine` criado em `apps/worker/src/live-runtime.ts`;
- busca somente conexão Binance ativa e não revogada no PostgreSQL;
- descriptografa credenciais através do `CredentialVault` existente;
- conecta `BinanceSpotTestnetConnector`, `PrismaLiveOrderStore` e `LiveExecutionEngine`;
- exige `BINANCE_TRADING_ENVIRONMENT=TESTNET` e `LIVE_TRADING_ENABLED=true`;
- rejeita produção e flag ausente antes de acessar credenciais ou banco;
- `.env.example` documenta as flags com LIVE desabilitado por padrão.

Validações:
- testes do worker: OK (16 testes, 6 integrações ignoradas);
- lint: OK;
- typecheck: OK;
- build: OK.

Limite:
- a factory ainda não é chamada pelo bootstrap; o job de reconciliação usa a integração, mas falta o fluxo de submit com Risk Engine antes de qualquer smoke Testnet com ordem.

## 2026-09-07 — Reconciliação LIVE controlada no worker

Resumo:
- job `live-reconcile` adicionado ao contrato BullMQ;
- worker consulta ordens LIVE abertas por conexão e usa a factory Testnet + store Prisma;
- kill switch SYSTEM/USER/BOT é consultado antes de cada reconciliação;
- sucessos, bloqueios e falhas geram `BotEvent` e `AuditLog` sanitizados;
- nenhuma estratégia ou API recebeu capacidade de enfileirar submit LIVE.

Validações:
- testes do worker: OK (18 testes, 6 integrações ignoradas);
- lint: OK;
- typecheck: OK;
- build: OK.

Limite:
- o submit LIVE foi integrado ao worker, mas a API ainda não produz esse job e os dados completos de risco operacional permanecem pendentes.

## 2026-09-07 — Submit LIVE Testnet protegido por Risk Engine

Resumo:
- job `live-submit` adicionado ao worker;
- saldo livre da moeda de cotação é consultado na Binance Testnet antes da decisão de risco;
- Risk Engine avalia símbolo, quantidade, preço, saldo, limites de capital, exposição, posições e modo LIVE;
- kill switch é verificado antes do Risk Engine e novamente imediatamente antes do submit;
- `ORDER_REQUEST`, `ORDER_RESULT`, bloqueios e decisões de risco são persistidos sem credenciais;
- submit usa o `PrismaLiveOrderStore`, preservando idempotência e recuperação segura.

Validações:
- testes Binance: OK (12 testes);
- testes do worker: OK (18 testes, 6 integrações ignoradas);
- lint: OK;
- typecheck: OK;
- build: OK.

Limites ainda abertos:
- o contexto de perdas diárias, drawdown e exposição histórica ainda não está persistido/calculado para LIVE;
- o job não é produzido pela API, que continua rejeitando criação de bots LIVE;
- nenhum submit real foi executado na Testnet; faltam smoke test controlado e crash recovery.

## 2026-09-08 — Estado persistido de risco LIVE

Resumo:
- modelo `LiveRiskState` adicionado ao PostgreSQL, vinculado unicamente a cada bot;
- migration `20260908090000_live_risk_state` criada;
- submit LIVE passou a rejeitar com `LIVE_RISK_CONTEXT_UNAVAILABLE` quando não houver estado persistido;
- Risk Engine agora recebe exposição, posições, perda diária e drawdown persistidos, em vez de zeros artificiais;
- build do Prisma Client e worker validados.

Validações:
- database build/typecheck: OK;
- worker typecheck/build/lint: OK.

Limite:
- o atualizador de `LiveRiskState` existe, mas a perda diária ainda depende de P&L temporal por fills; até essa fonte existir, o gate permanece bloqueado.

## 2026-09-08 — Atualização de `LiveRiskState` após reconciliação

Resumo:
- `refreshLiveRiskState` criado em `apps/worker/src/live-risk-state.ts`;
- exposição e equity são recalculadas com Decimal a partir das posições LIVE e últimos preços Binance persistidos;
- posições abertas, pico de equity e drawdown são atualizados por upsert transacional lógico;
- ausência de preço para posição aberta interrompe a atualização, evitando estado parcialmente confiável;
- reconciliação LIVE chama o atualizador após cada ordem reconciliada.

Validações:
- testes do worker: OK (18 testes, 6 integrações ignoradas);
- lint: OK;
- typecheck: OK;
- build: OK.

Limite:
- o cálculo temporal de `dailyLoss` agora existe; nenhuma ordem deve ser liberada como pronta para produção enquanto o smoke test, crash recovery e validação de dados reais não forem concluídos.

## 2026-09-08 — Fills LIVE e P&L diário

Resumo:
- `myTrades` assinado adicionado ao connector Binance Testnet;
- fills são persistidos em `Trade` por `externalTradeId`, evitando duplicidade;
- `Trade.realizedPnl` adicionado ao modelo e migration;
- posições LIVE são atualizadas em compras/vendas, incluindo preço médio, fechamento e P&L;
- `LiveRiskState.dailyLoss` soma somente perdas realizadas desde o início do dia UTC;
- reconciliação consulta fills após atualizar o estado da ordem.

Validações:
- testes Binance: OK (12 testes);
- testes worker: OK (18 testes, 6 integrações ignoradas);
- database build: OK;
- worker build/typecheck/lint: OK.

Limite:
- o P&L depende de posições/fills LIVE persistidos; saldos da conta continuam sendo usados como fonte de disponibilidade, e o smoke test real ainda não foi executado.

## 2026-09-08 — Smoke test Binance Spot Testnet

Resumo:
- comando `pnpm --filter @risexpto/worker smoke:testnet` adicionado;
- modo padrão consulta somente `exchangeInfo` e saldos;
- ordem MARKET de teste exige `RUN_BINANCE_TESTNET_SMOKE=true`, `BINANCE_TRADING_ENVIRONMENT=TESTNET` e `BINANCE_TESTNET_SMOKE_ORDER=true`;
- fluxo de ordem consulta estado, cancela se necessário e reconcilia novamente;
- produção e URLs de produção são rejeitadas antes do uso das credenciais;
- guia operacional criado em `docs/production/binance-testnet-smoke.md`.

Validações:
- Binance connector build: OK;
- worker typecheck/lint/build: OK;
- bloqueio sem flag: OK, sem rede ou credenciais;
- smoke real: não executado, pois não há credenciais Testnet configuradas no ambiente.

Limite:
- ainda falta executar leitura e ordem mínima com uma conta Spot Testnet descartável, além de validar restart/crash recovery.

## 2026-09-08 — Simulação local de restart/crash recovery

Resumo:
- teste de integração do `LiveExecutionEngine` simula a troca de processo usando o mesmo `LiveOrderStore`;
- uma ordem já resolvida após o primeiro processo é recuperada pelo segundo engine;
- o segundo engine retorna o resultado persistido sem chamar `submit` novamente;
- o cenário cobre a proteção contra duplicação após reinício antes da validação em uma conta Testnet real.

Validações:
- testes `live-execution`: OK (9 testes);
- testes worker: OK (18 testes, 6 integrações ignoradas);
- typecheck, build e lint: OK.

Limite:
- a simulação usa o store em memória de teste; a validação de restart com PostgreSQL, jobs duplicados e dados reais Binance permanece pendente.

## 2026-09-08 — Idempotência do adapter Prisma sob job duplicado

Resumo:
- teste do `PrismaLiveOrderStore` simula dois workers tentando criar a mesma intenção LIVE;
- a segunda criação recebe uma violação de unicidade (`P2002`) e recupera a ordem já persistida;
- após reinício com a ordem ainda pendente, o engine consulta a exchange, resolve a ordem e não executa um segundo submit;
- o cenário confirma a proteção no adapter persistente sem exigir credenciais ou rede.

Validações:
- testes do worker: OK (19 testes, 6 integrações ignoradas);
- lint, typecheck e build do worker: OK.

Limite:
- a simulação ainda usa um fake de Prisma; falta executar contra PostgreSQL real, duplicar jobs BullMQ em ambiente controlado e validar o comportamento com uma conta Binance Spot Testnet.

## 2026-09-08 — Integração PostgreSQL para persistência LIVE

Resumo:
- teste `live-order-store.integration.test.ts` criado para executar somente quando `E2E_DATABASE_URL` estiver configurada;
- fixture cria usuário, conexão Binance sanitizada, bot LIVE, versão de estratégia e proposta, sem credenciais reais;
- valida persistência da intenção, corrida duplicada, recuperação após reinício, resolução por consulta e ausência de novo submit;
- limpeza é executada no `finally`, mantendo o teste isolado por UUID.

Validações:
- suíte worker: OK (20 testes, 7 integrações ignoradas sem `E2E_DATABASE_URL`);
- lint, typecheck, build e `git diff --check`: OK.

Limite:
- PostgreSQL real ainda não foi executado porque o ambiente atual não tem `E2E_DATABASE_URL`/banco disponível; a execução controlada deve ocorrer antes do smoke com ordem Testnet.

## 2026-09-08 — Deduplicação de jobs LIVE no BullMQ

Resumo:
- helpers `enqueueLiveSubmit` e `enqueueLiveReconciliation` adicionados ao worker;
- `jobId` determinístico usa `live-submit:<orderId>` e `live-reconcile:<exchangeConnectionId>`;
- IDs vazios são rejeitados antes do enfileiramento;
- testes verificam que chamadas repetidas produzem o mesmo `jobId`, permitindo que o BullMQ deduplicate o job persistido.

Validações:
- testes do worker: OK (22 testes, 8 integrações ignoradas);
- lint, typecheck e build do worker: OK.

Limite:
- a confirmação contra Redis real continua pendente; as integrações existentes permanecem opt-in via `E2E_REDIS_URL`.

## 2026-09-08 — Preflight de readiness Binance Testnet

Resumo:
- comando `pnpm --filter @risexpto/worker preflight:testnet` adicionado;
- valida ambiente Testnet, endpoint permitido, flags LIVE, credenciais, PostgreSQL e Redis;
- saída JSON não imprime valores de API key, secret ou connection strings;
- execução falha fechada quando qualquer requisito estiver ausente ou apontar para produção.

Validações:
- testes do worker: OK (26 testes, 8 integrações ignoradas);
- lint, typecheck e build do worker: OK;
- execução compilada sem credenciais: bloqueada corretamente, sem rede ou autenticação.

Limite:
- o ambiente atual continua sem credenciais Binance, `E2E_DATABASE_URL` e `E2E_REDIS_URL`; o preflight ainda não autoriza smoke real.

# 43. MVP INTEGRATION & EXECUTION READINESS

Esta seção supersede os checkboxes históricos quando houver conflito: o estado deve ser comprovado por código integrado, testes e execução funcional. Binance Production e Stripe Live permanecem proibidos.

| Fase | Escopo | Estado | Critério objetivo |
|---|---|---|---|
| 31 | Environment bootstrap | 🟨 | Loader raiz e `pnpm db:setup` implementados; falta executar com todos os serviços locais healthy. |
| 32 | Strategy and risk seed | ✅ | Seed idempotente cria DCA, Grid e Trend com versão ativa, schema e implementation key; testes passam. |
| 33 | Market Data runtime | 🟨 | Job público Binance → `MarketSnapshot`, freshness, retry, rate limit e circuit breaker implementados; execução com PostgreSQL/Binance ainda falta. |
| 34 | Bot Wizard + Risk API | 🟨 | API transacional, endpoints RiskProfile, wizard PAPER, presets revisáveis e tela de risco real implementados; E2E autenticado ainda falta. |
| 35 | Automatic Paper Scheduler | 🟨 | Scheduler BullMQ, `nextRunAt`, claim atômico e deduplicação implementados; execução com serviços reais e E2E ainda faltam. |
| 36 | Paper Trading E2E | ⬜ | Clone limpo → login → bot PAPER → ciclo automático → trade/position visíveis. |
| 37 | Exchange Connection UI | 🟨 | Add/test/status/revoke reais, secret nunca retornado e modo Testnet visível implementados; falta validação browser autenticada. |
| 38 | Binance Testnet E2E | ⛔ | Código preparado; depende de PostgreSQL/Redis/Keycloak e credenciais Testnet descartáveis. |
| 39 | Stripe Test Mode | 🟨 | SDK oficial restrito a `sk_test_` implementado; checkout/portal, webhook persistido e entitlements ainda faltam. |
| 40 | Commercial/Production Gate | ⛔ | Só após fases 31–39, revisão operacional e aprovação humana explícita. |

Status atualizado: fase 33 está implementada em código/testes; permanece sem validação externa até haver serviços e ambiente configurados.

## 43.1 Auditoria real em 2026-09-08

Fontes revisadas: README, plano integral, readiness/commercial/PAPER/Binance docs, ADR-001 a ADR-011, `apps/web`, `apps/api`, `apps/worker`, packages, Prisma/migrations, `.env.example` e `compose.yaml`.

Achados reconciliados:
- o worker é executável e inicia Redis/BullMQ + PostgreSQL, processando Paper e jobs LIVE explícitos; não é correto classificá-lo como `NOT_INTEGRATED`;
- o LIVE Testnet possui connector, store Prisma, Risk Engine, kill switch, fills, P&L, reconciliação, preflight e smoke protegido, mas continua `BLOCKED_EXTERNAL` sem execução real;
- o Market Data agora possui job periódico público no worker, com símbolos derivados de bots RUNNING, upsert por candle e bloqueio `STALE_MARKET_DATA`; a execução contra Binance continua externa;
- o Paper Cycle existe no worker, porém a API ainda depende de ciclo manual e não há scheduler 24/7 integrado;
- o seed agora cobre DCA, Grid e Trend, mas o worker Paper continua executando somente `implementationKey=dca`;
- Stripe permanece `MOCK_ONLY`; nenhum SDK oficial ou endpoint de billing foi habilitado;
- páginas de risco, billing, notificações e admin ainda contêm conteúdo demonstrativo e não devem ser tratadas como dados do usuário.

## 2026-09-08 — Environment bootstrap e execução local reproduzível

Resumo:
- loader `scripts/root-env.mjs` passou a carregar automaticamente o `.env` raiz para root dev, API e worker;
- `pnpm db:setup` aplica migrations e executa seed com o mesmo ambiente carregado;
- API e worker exigem variáveis obrigatórias em runtime, sem fallback perigoso de banco fora de testes;
- README documenta `nvm use`, Compose, setup do banco e carregamento automático do ambiente.

Validações:
- loader raiz: OK;
- API lint/typecheck/build: OK;
- worker test/lint/typecheck/build: OK;
- database typecheck/build: OK;
- `git diff --check`: OK.

Limite:
- a execução completa do bootstrap ainda depende de Docker/Keycloak/PostgreSQL/Redis ativos no ambiente do operador; nenhum serviço externo foi alterado nesta etapa.

## 2026-09-08 — Seed de estratégias MVP

Resumo:
- seed passou a cadastrar DCA, Grid e Trend Following de forma idempotente;
- cada definição possui uma `StrategyVersion` ativa, `parameterSchema` e `implementationKey` compatíveis com o código existente;
- teste isolado verifica a identidade e os campos mínimos das três estratégias.

Validações:
- database tests: OK (5 testes);
- database lint, typecheck e build: OK.

Limite:
- a execução em instalação limpa PostgreSQL ainda precisa ser realizada com infraestrutura disponível; o worker Paper continua operacional somente para DCA.

## 2026-09-08 — Market Data runtime persistente

Resumo:
- job `market-data-sync` integrado ao worker e agendado pelo BullMQ;
- símbolos são derivados de `allowedSymbols` e `parameters.symbol` dos bots RUNNING;
- candles públicos Binance de 1 minuto são persistidos com upsert por `provider/symbol/interval/openTime`;
- `Paper Cycle`, submit LIVE e cálculo de risco rejeitam snapshots fora de `MARKET_DATA_MAX_AGE_MS` com `STALE_MARKET_DATA`;
- nenhum secret é usado no client público; retry, rate limit e circuit breaker permanecem no package `@risexpto/market-data`.

Validações:
- worker tests: OK (30 testes, 8 integrações ignoradas);
- worker lint/typecheck/build: OK.

Limite:
- falta executar o job contra Binance pública e PostgreSQL reais, observar freshness em operação e concluir o scheduler automático de ciclos dos bots.

## 2026-09-08 — Bot + RiskProfile transacionais

Resumo:
- criação PAPER agora usa uma transação única para `Bot`, `BotConfiguration`, `RiskProfile` e `PaperCapitalAllocation`;
- RiskProfile exige limites de capital, exposição, perda, drawdown, posições, símbolos e cooldown válidos;
- endpoints `GET/PATCH /bots/:id/risk-profile` aplicam ownership e não permitem alterar risco de bot RUNNING;
- LIVE continua rejeitado na API nesta etapa.

Validações:
- teste direcionado de BotsService: OK (5 testes);
- API lint/typecheck/build: OK;
- `git diff --check`: OK.

Limite:
- falta validar o wizard PAPER real e a UI de risco no E2E autenticado, além de executar contra os serviços locais.

## 2026-09-08 — Bot Wizard PAPER e Risk UI real

Resumo:
- proxies BFF para criação/listagem de bots, estratégias e RiskProfile adicionados;
- wizard web implementa Strategy → Market → Capital → Risk → Review e libera somente PAPER;
- presets Conservative/Balanced/Aggressive preenchem os limites, mas todos os valores permanecem revisáveis antes do envio;
- criação envia configuração e RiskProfile para a transação da API, sem INSERT manual;
- tela `/risk` agora lista bots reais, exibe limites reais e permite PATCH seguro do RiskProfile;
- edição de risco é bloqueada pela API enquanto o bot está RUNNING.

Validações:
- web lint/typecheck/build: OK;
- API teste direcionado de criação atômica: OK (5 testes);
- API lint/typecheck/build: OK.

Limite:
- E2E autenticado ainda falta; o build Next agora carrega o `.env` raiz, usa a API TypeScript do Next e limita workers para execução local determinística.

## 2026-09-08 — Scheduler automático de Paper Trading

Resumo:
- campo persistente `Bot.nextRunAt` e migration de índice adicionados;
- job `paper-scheduler` periódico identifica bots PAPER/RUNNING e agenda `bot-cycle` conforme `parameters.intervalMs`;
- claim atômico por `status`, `tradingMode`, `archivedAt` e `nextRunAt` evita ciclos duplicados entre workers;
- `jobId` determinístico por bot e janela permite retry/restart seguro;
- PAUSED, STOPPED, LIVE e intervalos inválidos não geram ciclos.

## 2026-09-08 — Binance Testnet fail-closed e readiness da API

Resumo:
- configuração privada Binance separada em `BINANCE_TESTNET_BASE_URL` e `BINANCE_PRODUCTION_BASE_URL`, removendo `BINANCE_BASE_URL` ambígua;
- a API rejeita qualquer ambiente diferente de `TESTNET` e qualquer endpoint diferente de `https://testnet.binance.vision`;
- smoke/readiness do worker validam o endpoint Testnet e nunca executam Binance Production;
- `/health` informa liveness e `/ready` verifica PostgreSQL e Redis sem expor configuração sensível.

Validações:
- testes unitários de ambiente Binance: OK (API 3 testes; worker 2 testes);
- API lint/typecheck: OK;
- worker testes: OK (18 testes, 4 integrações ignoradas).

Limite:
- conexão real ainda depende de credenciais Spot Testnet e serviços PostgreSQL/Redis/Keycloak; Production permanece proibida.

## 2026-09-08 — Exchange Connection UI

Resumo:
- BFF web adicionado para listar, criar, testar e revogar conexões com ownership mantido na API;
- tela de conexões aceita credenciais somente no formulário, limpa o segredo após salvar e nunca o exibe novamente;
- status, permissões e API key mascarada vêm da API; o modo TESTNET fica visível na tela;
- revogação remove a conexão da lista local após confirmação da API.

Validações:
- web lint: OK;
- web typecheck: OK;
- `git diff --check`: OK.

Limite:
- browser E2E autenticado e teste real Binance continuam dependentes de Keycloak, PostgreSQL, Redis e credenciais Spot Testnet.

## 2026-09-08 — Stripe Test Mode adapter

Resumo:
- SDK oficial `stripe` adicionado ao package de billing;
- `StripeTestProvider` implementa customer, Checkout subscription e Billing Portal;
- construção falha fechada sem `STRIPE_SECRET_KEY` ou com chave `sk_live_`, mantendo Stripe Live proibido;
- URLs de retorno são obrigatórias e vêm do ambiente, sem defaults externos.

Validações:
- teste de rejeição de credenciais Live/ausentes: OK;
- package billing typecheck: pendente de validação completa após integração dos endpoints.

Limite:
- checkout, webhook e entitlements persistidos já estão conectados à API; ainda são necessários `sk_test_` e endpoint webhook Stripe para validação externa.

## 2026-09-08 — Billing API e UI em Stripe Test Mode

Resumo:
- migration `BillingWebhookEvent` persiste IDs Stripe com unicidade para idempotência;
- API expõe `GET /billing`, `POST /billing/checkout`, `POST /billing/portal` e `POST /billing/webhooks/stripe`;
- webhook valida assinatura com o SDK, persiste o evento antes de aplicar a subscription e mapeia preços Test para planos persistidos;
- billing web deixou de exibir plano, preço, invoice e uso fictícios; mostra dados da API e TEST MODE;
- `.env.example` documenta chave, webhook, preços e URLs de retorno somente Test Mode.

Validações:
- billing lint/typecheck/test/build: OK;
- API lint/typecheck/build: OK;
- web lint/typecheck: OK;
- database typecheck/Prisma generation: OK.

Limites:
- ainda falta validar checkout, webhook assinado, atualização fora de ordem e enforcement de entitlements contra Stripe Test real;
- não há invoices/usage reais expostos enquanto a integração Test não for exercitada.

## 2026-09-08 — Enforcement inicial de entitlements

Resumo:
- provisionamento idempotente cria subscription Starter para usuários novos, usando somente o plano persistido pelo seed;
- API consulta subscription ativa e entitlement `maxBots` antes de aceitar criação de bot;
- ausência de plano/subscription ou limite excedido bloqueia a operação no backend;
- frontend não é autoridade para autorização comercial.

Validações:
- API testes direcionados de provisioning/bot: OK (7 testes);
- API lint/typecheck/build: OK.

Limite:
- enforcement de `liveTrading` e `maxMonthlyBacktests` deve ser conectado aos endpoints desses domínios quando forem integrados; LIVE continua bloqueado nesta fase.

Validações:
- worker tests: OK (18 testes, 4 integrações ignoradas);
- worker lint/typecheck/build: OK;
- migration e Prisma Client: geração/build OK.

Limite:
- execução contra Redis/PostgreSQL reais ainda não foi realizada; o scheduler não fecha sozinho o E2E até o Market Data e o wizard PAPER estarem validados.

## 2026-09-09 — Testable MVP Readiness: bootstrap local e reconciliação documental

### Matriz vigente de implementação e validação

| Feature | Implementation | Local validation | Browser validation | External test validation |
|---|---|---|---|---|
| 31 Environment bootstrap | ✅ loader, `pnpm install --frozen`, `pnpm dev:secrets`, validação fail-fast | ✅ Node `v24.20.0`, pnpm `10.34.5`, instalação reproduzível | ⬜ | ⛔ Docker daemon indisponível nesta execução |
| 32 Strategy seed | ✅ DCA/Grid/Trend + versões ativas | ✅ testes idempotentes | ⬜ | N/A |
| 33 Market Data runtime | ✅ `market-data-sync`, candles e `MarketSnapshot` idempotente | ✅ testes do worker | N/A | ⬜ Binance pública/PostgreSQL real |
| 34 Bot + Risk | ✅ criação transacional, API e Wizard | ✅ API/UI lint/typecheck/testes direcionados | ⬜ | N/A |
| 35 Paper Scheduler | ✅ `nextRunAt`, claim atômico e job determinístico | ✅ testes do scheduler | ⬜ | ⬜ Redis/PostgreSQL reais |
| 36 Paper DCA E2E | ✅ ciclo e Playwright preparado | ✅ smoke opt-in preparado | ⬜ sessão Keycloak real | ⬜ |
| 37 Binance Connection UI | ✅ Add/Test/Revoke, masking e vault | ✅ testes sanitizados | ⬜ | ⬜ credenciais Testnet |
| 38 Binance Testnet E2E | ✅ pipeline fail-closed preparado | ✅ contratos/preflight/smoke protegido | ⬜ | ⬜ |
| 39 Stripe Test Mode | ✅ provider oficial, Checkout, Portal, webhook, subscription e entitlements | ✅ lint/typecheck/test/build | ⬜ | ⬜ Stripe Test real |
| 40 Commercial/Production Gate | ⬜ aprovação e operação final | ⬜ | ⬜ | ⛔ bloqueado pelos gates anteriores |

### Bootstrap e segurança de desenvolvimento

- `pnpm dev:secrets` gera `AUTH_SESSION_SECRET` e `BINANCE_CREDENTIAL_MASTER_KEY` com `randomBytes(32)`, preserva secrets existentes, completa somente defaults não sensíveis e migra a variável obsoleta `BINANCE_BASE_URL` sem usar endpoint arbitrário.
- `pnpm dev` carrega `.env` e falha antes de iniciar os processos se faltar configuração essencial, se o ambiente Binance não for `TESTNET`, se a URL Testnet não for a allowlist oficial, se a chave AES não tiver 32 bytes ou se Stripe usar `sk_live_`.
- `pnpm dev:grant-plan <email> [STARTER|PRO]` cria/atualiza somente uma subscription local marcada com `dev_local_*`; exige `NODE_ENV=development` e nunca é uma rota de autorização de produção.
- `docs/development/local-smoke-test.md` documenta bootstrap, usuário Keycloak verificado, fluxo PAPER, Binance Testnet e Stripe Test Mode.
- Backtests, Notifications e Admin não apresentam mais eventos, resultados ou ações fictícias na tela autenticada; enquanto não houver integração, exibem `Coming soon`.

Validações desta rodada:

- `pnpm install --frozen-lockfile`: OK;
- `pnpm lint`: OK (29 tarefas);
- `pnpm exec turbo run typecheck`: OK (29 tarefas);
- `pnpm exec turbo run test --concurrency=1`: OK (37 tarefas; API 27 testes passando, 1 ignorado; worker 18 passando, 4 ignorados);
- `pnpm exec turbo run build`: OK (29 tarefas; Web gerou 25/25 páginas);
- Web lint/typecheck: OK;
- `git diff --check`: OK;
- `docker compose ps`: bloqueado porque o daemon Docker não está disponível neste ambiente;
- testes HTTP Nest/Supertest: OK com execução autorizada e serializada; execução paralela anterior sofreu contenção de recursos;
- `AuthGuard` passou a declarar explicitamente `UserProvisioningService`, corrigindo o teste de provisioning no `AppModule`.

Limites mantidos: nenhum secret real foi versionado, nenhuma ordem foi enviada e Binance Production/Stripe Live continuam proibidos.

## 2026-09-09 — Auditoria do primeiro teste manual de navegador

### Problemas reais registrados antes da implementação

- `/auth/session` retornava `200`, enquanto páginas autenticadas faziam chamadas diretas à API com `readSession(false)`; após refresh ou expiração do access token, a UI podia propagar um token antigo e receber `401`.
- O BFF montava o objeto de headers com uma ordem que permitia a um `Authorization` recebido em `init.headers` substituir o bearer derivado da sessão.
- O diagnóstico do API guard reduzia ausência de header, ID Token, audience, issuer e token expirado a uma mensagem genérica, sem classificação segura para operação.
- `/` e o destino pós-login ainda usavam `/` como default em partes do fluxo; a sidebar autenticada apontava Dashboard para `/`.
- As páginas autenticadas misturavam erro de transporte/autorização com estado vazio e algumas respostas exibiam apenas `Unable to load ...`.
- O catálogo, Connections, locale, pricing público e dashboard ainda não fechavam o fluxo real observado no navegador.

### Novas fases desta rodada

| Fase | Escopo | Estado inicial | Critério de conclusão |
|---|---|---|---|
| 49 | Authenticated API token propagation and diagnostics | ✅ | API recebe sempre o access token atual; BFF precedence, refresh, Web token summary, API failure categories and authenticated profile/guard tests pass. |
| 50 | Public/auth routing and dashboard | ✅ | `/` permanece público, pós-login vai para `/dashboard`, `returnTo` é seguro, dashboard é autenticado e logout retorna a `/`. |
| 51 | Authenticated navigation, RBAC and state UX | ✅ | Admin é role-aware no menu e protegido no proxy/página servidor; domínios usam estados vazios e de erro separados. |
| 52 | Strategy catalog and bot wizard regression | ✅ | Catálogo seedado é carregado da API, sem endpoint de criação para USER; cards oferecem Use strategy e wizard exige versão válida. |
| 53 | Trading provider foundation and Connections UX | ✅ | `TradingProvider`/registry/capabilities e picker multi-provider Coming Soon existem; Binance continua o único provider operacional. |
| 54 | Keycloak visual theme | ✅ | Tema próprio RiseXPTO cobre telas principais via parent templates/CSS e documentação de seleção está disponível. |
| 55 | i18n EN/pt-BR/es | 🟨 | Catálogos, seletor público, Settings e persistência de perfil foram implementados; tradução integral de textos de cada tela ainda requer cobertura adicional, registrada no ADR-013. |
| 56 | Landing navigation and public pricing | ✅ | Header sticky, seção ativa, hash navigation e catálogo público de planos funcionam sem autenticação. |
| 57 | Browser/API regression and Paper gate | 🟨 | Contratos API/BFF, testes públicos/auth e Playwright preparado; execução de browser ainda depende do Web/Keycloak/DB/Redis locais ativos. |

O estado atual desta auditoria não autoriza Binance Production nem Stripe Live. A execução real de browser, Keycloak, PostgreSQL e Redis deve ser classificada separadamente de testes unitários/contratuais.

Validação das fases 50–53: Web lint/typecheck e shared test/lint/typecheck/build passaram. A API autenticada depende da execução manual contra Keycloak/PostgreSQL/Redis disponíveis; nenhum provider futuro foi conectado à rede. O teste HTTP com AppModule em Vitest não substitui a execução compilada: sem instrumentação de metadata de decorators, controllers dependentes podem aparecer como `undefined`; a cobertura de autenticação permanece no guard e no teste API compilado/isolado.

Validação final desta rodada:

- `pnpm install --frozen-lockfile`: OK;
- `pnpm lint`: OK (29 tarefas);
- `pnpm typecheck`: OK (30 pacotes);
- `pnpm exec turbo run test --concurrency=1`: OK (39 tarefas; API 28 testes passando, 1 skip; Web 8 passando; worker 18 passando, 4 skips);
- `pnpm build`: OK após limpar cache Turbopack corrompido; Web compilou e gerou 28 páginas/rotas;
- `pnpm test:e2e`: preparado, mas browser real requer `E2E_STORAGE_STATE` e serviços locais ativos;
- Docker/Keycloak/PostgreSQL/Redis/Binance Testnet/Stripe Test continuam `BLOCKED_EXTERNAL` nesta execução.

## 2026-09-09 — Auditoria da nova rodada de regressões públicas

### Achados confirmados antes da implementação

- `apps/web/app/page.tsx` usava `IntersectionObserver.rootMargin` com `rem`, unidade inválida para a API do browser, causando exceção durante mount/remount e quebrando o retorno por Back/Forward.
- `apps/web/proxy.ts` protegia `/api/public/plans` porque o matcher tratava a rota como autenticada; pricing público deslogado era redirecionado para `/login`.
- `AppShell` buscava `/auth/session` na landing pública. O `401` anônimo é semanticamente esperado, mas era uma requisição desnecessária e gerava ruído.
- A cobertura i18n da fase 55 era parcial: landing, login, shell e páginas autenticadas ainda continham textos em inglês fora dos catálogos.

As notas acima são atuais. Auditorias anteriores permanecem abaixo como histórico; a implementação da rodada não altera o requisito de que Binance Production e Stripe Live permaneçam proibidos.

### Fases desta rodada

| Fase | Escopo | Estado | Evidência exigida |
|---|---|---|---|
| 58 | Public runtime stability | ✅ CODE_IMPLEMENTED / LOCALLY_VALIDATED | observer válido/limpo, favicon, teste de configuração; browser Back ainda requer execução E2E |
| 59 | Public/auth route boundary | ✅ CODE_IMPLEMENTED / LOCALLY_VALIDATED | política explícita e testes de classificação; HTTP anônimo real requer stack Web |
| 60 | Public session behavior | ✅ CODE_IMPLEMENTED / LOCALLY_VALIDATED | landing não dispara sessão obrigatória; teste Web confirma caminhos públicos |
| 61 | Complete application i18n | 🟨 | catálogos en/pt-BR/es agora também cobrem headers das páginas de domínio e dashboard; conteúdo interno de componentes/wizard ainda requer migração integral |
| 62 | Language selector UX | ✅ CODE_IMPLEMENTED / LOCALLY_VALIDATED | bandeiras acessíveis e troca imediata nos seletores público/autenticado |
| 63 | Locale persistence | ✅ CODE_IMPLEMENTED / LOCALLY_VALIDATED | cookie/localStorage/browser fallback e Settings/profile update |
| 64 | Keycloak locale propagation | ✅ CODE_IMPLEMENTED / LOCALLY_VALIDATED | `ui_locales` validado no authorization URL e locale seguro |
| 65 | Public pricing regression | ✅ CODE_IMPLEMENTED / LOCALLY_VALIDATED | pricing anônimo com loading/success/empty/error e `Intl.NumberFormat` |
| 66 | Auth session on public pages | ✅ CODE_IMPLEMENTED / LOCALLY_VALIDATED | landing não consulta sessão obrigatoriamente; `401` anônimo não é erro de UI |
| 67 | Browser regression suite | ✅ CODE_IMPLEMENTED / LOCALLY_VALIDATED / BROWSER_VALIDATED | 4 testes públicos passaram com Chromium e Web local: locale, hashes, Back, ausência de exception e pricing anônimo |
| 68 | Authenticated MVP regression | ✅ CODE_IMPLEMENTED / LOCALLY_VALIDATED; ⛔ BROWSER_VALIDATED | contratos e propagação de token cobertos; validação real dos endpoints depende de login Keycloak local e sessão autenticada |

Os estados `CODE_IMPLEMENTED`, `LOCALLY_VALIDATED`, `BROWSER_VALIDATED`, `EXTERNAL_TEST_VALIDATED` e `PRODUCTION_READY` continuam sendo independentes; nenhum teste unitário promove automaticamente uma feature a validação de browser ou externa.

## 2026-09-10 — Fases 69–86: regressões manuais do review(6)

As fases 01–68 permanecem preservadas. Os itens abaixo registram correções descobertas no teste manual, sem reescrever a conclusão histórica.

| Fase | Escopo | Estado desta rodada |
|---|---|---|
| 69 | Diagnóstico sanitizado de claims do Access Token | ✅ REAL_TOKEN_VALIDATED; causa comprovada: mapper `sub` ausente no scope `openid` persistido |
| 70 | Check/reconcile determinístico do realm Keycloak | ✅ REAL_REALM_VALIDATED; `pnpm keycloak:check` sem divergências após reconcile |
| 71 | Recuperação da API autenticada | ✅ BROWSER_VALIDATED; sessão real e BFF strategies/bots/connections/billing retornaram 200 |
| 72 | ADR e hardening do modelo de token | ✅ CODE_IMPLEMENTED / TYPECHECKED |
| 73 | Locale como fonte única de verdade | ✅ CODE_IMPLEMENTED / TYPECHECKED |
| 74 | Inicialização de locale da sessão OIDC | ✅ CODE_IMPLEMENTED / TESTED |
| 75 | Persistência do locale na topbar | ✅ CODE_IMPLEMENTED / TYPECHECKED |
| 76 | Remoção do override por pathname | ✅ CODE_IMPLEMENTED / TYPECHECKED |
| 77 | i18n do workspace EN/pt-BR/es | ✅ CODE_IMPLEMENTED / BROWSER_VALIDATED; catálogo completo e workspace autenticado navegável em PT-BR/ES, com EN coberto pelo catálogo e shell |
| 78 | Limpeza de i18n em Settings e componentes | ✅ CODE_IMPLEMENTED / TYPECHECKED |
| 79 | Locale end-to-end no Keycloak | ✅ KEYCLOAK_BROWSER_VALIDATED; EN, PT-BR→pt e ES confirmados no Keycloak 26.3 real |
| 80 | Tema Keycloak RiseXPTO V2 | ✅ KEYCLOAK_BROWSER_SCREENSHOT_VALIDATED; logo [R], fundo navy, superfícies e hierarquia RiseXPTO confirmados em Chromium |
| 81 | Navbar full-bleed | ✅ CODE_IMPLEMENTED / TYPECHECKED |
| 82 | Estados auth/empty/error | ✅ CODE_AND_BROWSER_VALIDATED; 401/403/500/503 preservados/diferenciados, 200 vazio confirmado e regressão USDT corrigida |
| 83 | Investigação `reportAllChanges/startTime` | ✅ CLASSIFIED_EXTERNAL_BROWSER_SCRIPT quando ausente do bundle local |
| 84 | Regressão browser auth + i18n | ✅ BROWSER_VALIDATED; login Keycloak real e locale PT-BR sobreviveram navegação/reload |
| 85 | Regressão de dados autenticados | ✅ BROWSER_VALIDATED; strategies/bots/connections/billing sem 401 |
| 86 | Gate PAPER MVP | ✅ PAPER_BROWSER_AND_DB_VALIDATED; bot DCA PAPER criado, promovido a READY, iniciado, ciclo enfileirado e worker persistiu snapshots, propostas, ordens FILLED, trades, posição e saldos |
| 87 | Estabilidade do teste de migração PostgreSQL | ✅ CI_REGRESSION_FIXED; migração aplicada uma vez por arquivo e cada caso isolado por transação/rollback, eliminando a recriação de PGlite que excedia o hook timeout no GitHub Actions |

Regressões registradas: `Previously implemented. Manual browser regression found on 2026-09-10. Superseded by Phases 69–86.` O `AppShell` não reimpõe mais o locale a cada navegação; a persistência atualiza UI, cookie, sessão e `UserProfile`. O diagnóstico nunca registra token, refresh token ou segredo de sessão. Binance Production e Stripe Live permanecem proibidos.

### Fase 87 — regressão de timeout no GitHub Actions

Previously implemented. CI regression found on 2026-09-10. O teste
`packages/database/src/migration.test.ts` recriava PGlite e executava a migração
completa em cada `beforeEach`. Em runners GitHub Actions, o primeiro hook podia
ultrapassar 10 segundos, embora a migração e as asserções estivessem corretas.
A migração agora é executada uma vez em `beforeAll`; cada caso inicia uma
transação e termina com `ROLLBACK`, preservando isolamento sem repetir a
inicialização pesada. Três execuções consecutivas passaram localmente.

Na validação autenticada, um `503` inicial foi comprovadamente causado por uma
conta temporária de teste cujo email já existia no banco com outro `externalAuthId`
do Keycloak. O diagnóstico development-only registrou apenas a mensagem sanitizada
da falha; o usuário Keycloak foi removido e o bot PAPER local foi parado e
arquivado ao final do teste. A
regressão final usou as chaves seed reais `dca`, `grid` e `trend-following` e
confirmou a persistência PT-BR após troca PT-BR → ES → navegação → Settings →
PT-BR → reload.

O gate PAPER foi executado somente com `LIVE_TRADING_ENABLED=false` e o worker
com `BINANCE_MARKET_DATA_BASE_URL=https://testnet.binance.vision`; não houve
ordem Binance, credencial de exchange ou Stripe Live. A validação encontrou e
corrigiu duas regressões operacionais: o wizard não promovia o bot recém-criado
de `DRAFT` para `READY`, e `Intl.NumberFormat` lançava erro para `USDT`. Após as
correções, o banco local confirmou `2` propostas `EXECUTED`, `2` ordens `FILLED`,
`2` trades, uma posição PAPER aberta e saldos BTC/USDT.

### Evidência operacional posterior — Keycloak local ativo

Com Keycloak 26.3, PostgreSQL e Redis saudáveis, o primeiro check comparou o
realm persistido e encontrou somente `loginTheme` ausente; após o reconcile,
encontrou também a causa do `CLAIMS`: o scope `openid` customizado não possuía
mapper `sub`. O realm versionado agora declara o mapper `oidc-sub-mapper`, e o
reconcile o aplica sem remover usuários. Um login real confirmou `sub`, `email`,
`email_verified`, audience `risexpto-api`, issuer e roles no Access Token; os
endpoints BFF autenticados retornaram `200`. O usuário temporário usado nessa
prova foi removido após o teste.

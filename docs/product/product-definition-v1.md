# RISEXPTO PRODUCT DEFINITION V1

## Positioning

RiseXPTO is a non-custodial platform of Digital Traders / Trading Specialists. The user creates an account, connects their own exchange or broker, chooses a specialist, chooses one asset, sets capital, chooses risk, activates the instance and monitors it continuously. RiseXPTO never directly custodies user capital and no connected credential may withdraw funds.

The product path is: **Choose a specialist → choose the asset → choose the connection → define capital → choose risk → activate → the trader works continuously.**

## Trader domain

The MVP has one Trader Instance for exactly one asset. Atlas BTCUSDT and Luna ETHUSDT are distinct instances. Multi-Asset, Portfolio and Basket Traders are future concepts and are not implemented. A commercial Digital Trader (persona) is separate from `StrategyDefinition`, `StrategyVersion` and the internal `Bot` entity. Existing technical entities remain where renaming would create cosmetic migrations.

The first market is CRYPTO SPOT and the first provider is Binance. The initial catalog is ATLAS (Grid Specialist), LUNA (Trend Following Specialist), DCA ONE (Accumulation / DCA Specialist) and PULSE (Breakout / Momentum Specialist). DCA One reuses the current DCA implementation; Atlas and Luna reuse existing Grid and Trend packages. Pulse is Paper-only until its breakout implementation is validated. The Strategy layer is provider-neutral and remains separate from Risk and Provider Adapter layers. Bybit, Coinbase, Bitget and Alpaca are future providers only.

US STOCKS SPOT and Alpaca are a future foundation/catalog concern, not an integration in this MVP. Planned specialists are INDEX, SWING, MOMENTUM and BREAKOUT; the same one-ticker instance rule will apply.

## Capital and risk

Capital allocation is hard: an instance may never use capital allocated to another instance. Allocation changes must be transactional and reject over-allocation or double allocation. `FIXED` is the default capital mode and keeps the base capital constant; `COMPOUND` permits realized gains to increase operational capital. The mode is selected when activating or editing an instance.

Risk presets are `CONSERVATIVE`, `BALANCED` and `AGGRESSIVE`. Each maps to real max trade, max position, max exposure, max daily loss, max drawdown and cooldown values. Advanced Settings remain available. Risk is hierarchical: Trader Risk (capital, drawdown, exposure, position and daily loss) must pass before Connection / Portfolio Risk (total allocation, account exposure, account daily loss and connection kill switch), followed by execution. A Strategy can never bypass either layer.

## Market regime and states

A Digital Trader never changes Strategy automatically. A Grid specialist that does not fit the market returns a structured `NO_OP` with `MARKET_REGIME_NOT_SUITABLE` (or another explicit waiting reason), persists a Bot event, and shows `WAITING`, never an error. `waitingReason` and `waitingSince` are durable runtime data.

Product states are SETUP, READY, WORKING, WAITING, PAUSED, RISK_PAUSED, MARKET_CLOSED, CONNECTION_LOST, STOPPED and ERROR. Technical `BotStatus` values may continue to back these states; UI language is product language.

## Connections and plans

A Trading Connection belongs to the user and can be shared by multiple Trader Instances; there is never one API key per trader. The provider adapter is shared, and Binance remains Testnet/local validation only.

Plans are FREE ($0: Paper only, 3 simultaneous Paper Traders, basic specialists, no Live), STARTER ($20/month: 1 Live Connection, 3 active Live Traders, Paper and basic features), PRO ($50/month: 2 Live Connections, 10 active Live Traders, Paper and advanced features) and ADVANCED ($100/month: 5 Live Connections, 25 active Live Traders, Paper and premium features). CUSTOM is not part of V1. Backend entitlements are authoritative. `maxActiveTraderInstances`, `maxLiveConnections`, `maxPaperTraderInstances` and `liveTrading` are the conceptual keys; `maxBots` remains as a compatibility key during migration.

Paper is the acquisition funnel. FREE can run three simultaneous Paper Trader Instances and every basic specialist is available in Paper. No frontend-only entitlement decision is permitted.

## Copilot and AI credits

RiseXPTO Copilot is an explanatory product surface only. It is outside Strategy Engine, Risk Engine and Execution Engine, can never execute an order, and no AI output authorizes execution. Future capabilities include trader, regime, trade, waiting, chart, market-data, comparison, performance, risk-block and report explanations.

The credit foundation has `SUBSCRIPTION_CREDITS` (renewed and replaced on the next period) and `PURCHASED_CREDITS` (purchased separately and non-expiring). Consumption is subscription credits first, then purchased credits. Final quantities and prices are intentionally unspecified in V1; no LLM is integrated by this phase.

## UX language

The catalog is **Explore Traders**, with identity, name, specialty, market, ideal regime, risk profile, strategy description, Paper/Live availability and supported providers. CTAs are **Try in Paper** and **Activate**. The workspace is **My Traders / My Team** and shows allocated capital, current exposure, today P&L, total P&L, status, provider, asset and risk preset. WAITING is explained as “waiting for suitable market conditions.”

## Safety boundaries

No Binance Production, no Stripe Live, no withdrawal permission and no live activation for a strategy that has only Paper validation. Existing DCA runtime and technical history must remain intact.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'SUPPORT', 'ADMIN');

-- CreateEnum
CREATE TYPE "ExchangeProvider" AS ENUM ('BINANCE');

-- CreateEnum
CREATE TYPE "ExchangeConnectionStatus" AS ENUM ('CONNECTED', 'DEGRADED', 'INVALID', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "BotStatus" AS ENUM ('DRAFT', 'READY', 'RUNNING', 'PAUSED', 'STOPPED', 'ERROR', 'RISK_BLOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TradingMode" AS ENUM ('PAPER', 'LIVE');

-- CreateEnum
CREATE TYPE "ProposalSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'EXECUTED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('MARKET', 'LIMIT');

-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'SUBMITTED', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED', 'REJECTED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PositionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "RiskDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BacktestStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('USER_ACTION', 'BOT_ACTION', 'STRATEGY_SIGNAL', 'TRADE_PROPOSAL', 'RISK_DECISION', 'ORDER_REQUEST', 'ORDER_RESULT', 'EXCHANGE_EVENT', 'SYSTEM_EVENT', 'ADMIN_ACTION');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('INCOMPLETE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "externalAuthId" VARCHAR(128) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "displayName" VARCHAR(120),
    "locale" VARCHAR(16) NOT NULL DEFAULT 'en',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "referenceCurrency" CHAR(3) NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeConnection" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "ExchangeProvider" NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "status" "ExchangeConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "maskedApiKey" VARCHAR(64) NOT NULL,
    "apiKeyCiphertext" BYTEA NOT NULL,
    "apiSecretCiphertext" BYTEA NOT NULL,
    "encryptionKeyVersion" INTEGER NOT NULL,
    "permissions" JSONB,
    "lastCheckedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ExchangeConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyDefinition" (
    "id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "StrategyDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyVersion" (
    "id" UUID NOT NULL,
    "strategyDefinitionId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "parameterSchema" JSONB NOT NULL,
    "implementationKey" VARCHAR(160) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bot" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "exchangeConnectionId" UUID,
    "strategyVersionId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "status" "BotStatus" NOT NULL DEFAULT 'DRAFT',
    "tradingMode" "TradingMode" NOT NULL DEFAULT 'PAPER',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Bot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotConfiguration" (
    "id" UUID NOT NULL,
    "botId" UUID NOT NULL,
    "parameters" JSONB NOT NULL,
    "allowedSymbols" TEXT[],
    "authorizedCapital" DECIMAL(38,18) NOT NULL,
    "quoteCurrency" VARCHAR(16) NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BotConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeProposal" (
    "id" UUID NOT NULL,
    "botId" UUID NOT NULL,
    "strategyVersionId" UUID NOT NULL,
    "correlationId" UUID NOT NULL,
    "symbol" VARCHAR(32) NOT NULL,
    "side" "ProposalSide" NOT NULL,
    "orderType" "OrderType" NOT NULL,
    "quantity" DECIMAL(38,18),
    "quoteAmount" DECIMAL(38,18),
    "limitPrice" DECIMAL(38,18),
    "rationale" JSONB NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(3),

    CONSTRAINT "TradeProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "botId" UUID NOT NULL,
    "exchangeConnectionId" UUID,
    "tradeProposalId" UUID NOT NULL,
    "idempotencyKey" VARCHAR(128) NOT NULL,
    "clientOrderId" VARCHAR(64) NOT NULL,
    "externalOrderId" VARCHAR(128),
    "tradingMode" "TradingMode" NOT NULL,
    "symbol" VARCHAR(32) NOT NULL,
    "side" "OrderSide" NOT NULL,
    "type" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'CREATED',
    "requestedQuantity" DECIMAL(38,18),
    "requestedQuoteAmount" DECIMAL(38,18),
    "limitPrice" DECIMAL(38,18),
    "filledQuantity" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "averageFillPrice" DECIMAL(38,18),
    "submittedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "externalTradeId" VARCHAR(128),
    "quantity" DECIMAL(38,18) NOT NULL,
    "price" DECIMAL(38,18) NOT NULL,
    "fee" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "feeAsset" VARCHAR(16),
    "executedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" UUID NOT NULL,
    "botId" UUID NOT NULL,
    "tradingMode" "TradingMode" NOT NULL,
    "symbol" VARCHAR(32) NOT NULL,
    "status" "PositionStatus" NOT NULL DEFAULT 'OPEN',
    "quantity" DECIMAL(38,18) NOT NULL,
    "averagePrice" DECIMAL(38,18) NOT NULL,
    "realizedPnl" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "openedAt" TIMESTAMPTZ(3) NOT NULL,
    "closedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "botId" UUID,
    "name" VARCHAR(100) NOT NULL,
    "maxAllocatedCapital" DECIMAL(38,18) NOT NULL,
    "maxTradeAmount" DECIMAL(38,18) NOT NULL,
    "maxExposurePercent" DECIMAL(8,4) NOT NULL,
    "maxPositionPercent" DECIMAL(8,4) NOT NULL,
    "maxPositions" INTEGER NOT NULL,
    "maxDailyLossPercent" DECIMAL(8,4) NOT NULL,
    "maxDrawdownPercent" DECIMAL(8,4) NOT NULL,
    "allowedSymbols" TEXT[],
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RiskProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskEvent" (
    "id" UUID NOT NULL,
    "botId" UUID NOT NULL,
    "riskProfileId" UUID,
    "tradeProposalId" UUID,
    "decision" "RiskDecision" NOT NULL,
    "reasonCode" VARCHAR(80) NOT NULL,
    "reason" TEXT NOT NULL,
    "riskSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotEvent" (
    "id" UUID NOT NULL,
    "botId" UUID NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketSnapshot" (
    "id" UUID NOT NULL,
    "provider" "ExchangeProvider" NOT NULL,
    "symbol" VARCHAR(32) NOT NULL,
    "interval" VARCHAR(16) NOT NULL,
    "openTime" TIMESTAMPTZ(3) NOT NULL,
    "closeTime" TIMESTAMPTZ(3) NOT NULL,
    "open" DECIMAL(38,18) NOT NULL,
    "high" DECIMAL(38,18) NOT NULL,
    "low" DECIMAL(38,18) NOT NULL,
    "close" DECIMAL(38,18) NOT NULL,
    "volume" DECIMAL(38,18) NOT NULL,
    "trades" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Backtest" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "botId" UUID,
    "strategyVersionId" UUID NOT NULL,
    "status" "BacktestStatus" NOT NULL DEFAULT 'QUEUED',
    "symbol" VARCHAR(32) NOT NULL,
    "parameters" JSONB NOT NULL,
    "initialCapital" DECIMAL(38,18) NOT NULL,
    "periodStart" TIMESTAMPTZ(3) NOT NULL,
    "periodEnd" TIMESTAMPTZ(3) NOT NULL,
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Backtest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacktestResult" (
    "id" UUID NOT NULL,
    "backtestId" UUID NOT NULL,
    "absoluteReturn" DECIMAL(38,18) NOT NULL,
    "returnPercent" DECIMAL(12,6) NOT NULL,
    "maxDrawdown" DECIMAL(12,6) NOT NULL,
    "winRate" DECIMAL(12,6) NOT NULL,
    "profitFactor" DECIMAL(18,8),
    "sharpeRatio" DECIMAL(18,8),
    "tradeCount" INTEGER NOT NULL,
    "estimatedFees" DECIMAL(38,18) NOT NULL,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BacktestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "type" VARCHAR(80) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMPTZ(3),
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "botId" UUID,
    "eventType" "AuditEventType" NOT NULL,
    "correlationId" UUID NOT NULL,
    "actorId" VARCHAR(128),
    "ipAddress" INET,
    "userAgent" VARCHAR(512),
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingCustomer" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "providerCustomerId" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "providerSubscriptionId" VARCHAR(128),
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "currentPeriodStart" TIMESTAMPTZ(3),
    "currentPeriodEnd" TIMESTAMPTZ(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usage" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "subscriptionId" UUID,
    "metric" VARCHAR(80) NOT NULL,
    "quantity" DECIMAL(38,8) NOT NULL,
    "periodStart" TIMESTAMPTZ(3) NOT NULL,
    "periodEnd" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_externalAuthId_key" ON "User"("externalAuthId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "ExchangeConnection_userId_status_idx" ON "ExchangeConnection"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeConnection_userId_provider_label_key" ON "ExchangeConnection"("userId", "provider", "label");

-- CreateIndex
CREATE UNIQUE INDEX "StrategyDefinition_key_key" ON "StrategyDefinition"("key");

-- CreateIndex
CREATE INDEX "StrategyVersion_strategyDefinitionId_active_idx" ON "StrategyVersion"("strategyDefinitionId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "StrategyVersion_strategyDefinitionId_version_key" ON "StrategyVersion"("strategyDefinitionId", "version");

-- CreateIndex
CREATE INDEX "Bot_userId_status_idx" ON "Bot"("userId", "status");

-- CreateIndex
CREATE INDEX "Bot_status_tradingMode_idx" ON "Bot"("status", "tradingMode");

-- CreateIndex
CREATE UNIQUE INDEX "Bot_userId_name_key" ON "Bot"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "BotConfiguration_botId_key" ON "BotConfiguration"("botId");

-- CreateIndex
CREATE INDEX "TradeProposal_botId_status_createdAt_idx" ON "TradeProposal"("botId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "TradeProposal_symbol_createdAt_idx" ON "TradeProposal"("symbol", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TradeProposal_botId_correlationId_key" ON "TradeProposal"("botId", "correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_tradeProposalId_key" ON "Order"("tradeProposalId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Order_clientOrderId_key" ON "Order"("clientOrderId");

-- CreateIndex
CREATE INDEX "Order_botId_status_createdAt_idx" ON "Order"("botId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_exchangeConnectionId_externalOrderId_key" ON "Order"("exchangeConnectionId", "externalOrderId");

-- CreateIndex
CREATE INDEX "Trade_orderId_executedAt_idx" ON "Trade"("orderId", "executedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_orderId_externalTradeId_key" ON "Trade"("orderId", "externalTradeId");

-- CreateIndex
CREATE INDEX "Position_botId_status_tradingMode_idx" ON "Position"("botId", "status", "tradingMode");

-- CreateIndex
CREATE INDEX "Position_symbol_status_idx" ON "Position"("symbol", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RiskProfile_botId_key" ON "RiskProfile"("botId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskProfile_userId_name_key" ON "RiskProfile"("userId", "name");

-- CreateIndex
CREATE INDEX "RiskEvent_botId_createdAt_idx" ON "RiskEvent"("botId", "createdAt");

-- CreateIndex
CREATE INDEX "RiskEvent_decision_reasonCode_createdAt_idx" ON "RiskEvent"("decision", "reasonCode", "createdAt");

-- CreateIndex
CREATE INDEX "BotEvent_botId_createdAt_idx" ON "BotEvent"("botId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketSnapshot_symbol_interval_openTime_idx" ON "MarketSnapshot"("symbol", "interval", "openTime");

-- CreateIndex
CREATE UNIQUE INDEX "MarketSnapshot_provider_symbol_interval_openTime_key" ON "MarketSnapshot"("provider", "symbol", "interval", "openTime");

-- CreateIndex
CREATE INDEX "Backtest_userId_status_createdAt_idx" ON "Backtest"("userId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BacktestResult_backtestId_key" ON "BacktestResult"("backtestId");

-- CreateIndex
CREATE INDEX "Notification_userId_status_createdAt_idx" ON "Notification"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_botId_createdAt_idx" ON "AuditLog"("botId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_correlationId_idx" ON "AuditLog"("correlationId");

-- CreateIndex
CREATE INDEX "AuditLog_eventType_createdAt_idx" ON "AuditLog"("eventType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Entitlement_planId_key_key" ON "Entitlement"("planId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCustomer_userId_key" ON "BillingCustomer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCustomer_providerCustomerId_key" ON "BillingCustomer"("providerCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- CreateIndex
CREATE INDEX "Usage_subscriptionId_metric_idx" ON "Usage"("subscriptionId", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "Usage_userId_metric_periodStart_periodEnd_key" ON "Usage"("userId", "metric", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeConnection" ADD CONSTRAINT "ExchangeConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyVersion" ADD CONSTRAINT "StrategyVersion_strategyDefinitionId_fkey" FOREIGN KEY ("strategyDefinitionId") REFERENCES "StrategyDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bot" ADD CONSTRAINT "Bot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bot" ADD CONSTRAINT "Bot_exchangeConnectionId_fkey" FOREIGN KEY ("exchangeConnectionId") REFERENCES "ExchangeConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bot" ADD CONSTRAINT "Bot_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "StrategyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotConfiguration" ADD CONSTRAINT "BotConfiguration_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeProposal" ADD CONSTRAINT "TradeProposal_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeProposal" ADD CONSTRAINT "TradeProposal_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "StrategyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_exchangeConnectionId_fkey" FOREIGN KEY ("exchangeConnectionId") REFERENCES "ExchangeConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tradeProposalId_fkey" FOREIGN KEY ("tradeProposalId") REFERENCES "TradeProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskProfile" ADD CONSTRAINT "RiskProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskProfile" ADD CONSTRAINT "RiskProfile_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEvent" ADD CONSTRAINT "RiskEvent_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEvent" ADD CONSTRAINT "RiskEvent_riskProfileId_fkey" FOREIGN KEY ("riskProfileId") REFERENCES "RiskProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEvent" ADD CONSTRAINT "RiskEvent_tradeProposalId_fkey" FOREIGN KEY ("tradeProposalId") REFERENCES "TradeProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotEvent" ADD CONSTRAINT "BotEvent_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Backtest" ADD CONSTRAINT "Backtest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Backtest" ADD CONSTRAINT "Backtest_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Backtest" ADD CONSTRAINT "Backtest_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "StrategyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacktestResult" ADD CONSTRAINT "BacktestResult_backtestId_fkey" FOREIGN KEY ("backtestId") REFERENCES "Backtest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingCustomer" ADD CONSTRAINT "BillingCustomer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Domain invariants not expressible in Prisma Schema Language.
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_referenceCurrency_check" CHECK ("referenceCurrency" IN ('USD', 'BRL', 'EUR'));
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_locale_check" CHECK ("locale" IN ('en', 'pt-BR'));
ALTER TABLE "Bot" ADD CONSTRAINT "Bot_live_requires_exchange_check" CHECK ("tradingMode" = 'PAPER' OR "exchangeConnectionId" IS NOT NULL);
ALTER TABLE "BotConfiguration" ADD CONSTRAINT "BotConfiguration_capital_positive_check" CHECK ("authorizedCapital" > 0 AND "revision" > 0);
ALTER TABLE "TradeProposal" ADD CONSTRAINT "TradeProposal_size_check" CHECK (("quantity" IS NOT NULL)::int + ("quoteAmount" IS NOT NULL)::int = 1 AND COALESCE("quantity", 1) > 0 AND COALESCE("quoteAmount", 1) > 0 AND COALESCE("limitPrice", 1) > 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_size_check" CHECK (("requestedQuantity" IS NOT NULL)::int + ("requestedQuoteAmount" IS NOT NULL)::int = 1 AND COALESCE("requestedQuantity", 1) > 0 AND COALESCE("requestedQuoteAmount", 1) > 0 AND COALESCE("limitPrice", 1) > 0 AND "filledQuantity" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_live_requires_exchange_check" CHECK ("tradingMode" = 'PAPER' OR "exchangeConnectionId" IS NOT NULL);
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_amounts_check" CHECK ("quantity" > 0 AND "price" > 0 AND "fee" >= 0);
ALTER TABLE "Position" ADD CONSTRAINT "Position_amounts_check" CHECK ("quantity" >= 0 AND "averagePrice" > 0 AND (("status" = 'OPEN' AND "closedAt" IS NULL) OR ("status" = 'CLOSED' AND "closedAt" IS NOT NULL)));
ALTER TABLE "RiskProfile" ADD CONSTRAINT "RiskProfile_limits_check" CHECK ("maxAllocatedCapital" > 0 AND "maxTradeAmount" > 0 AND "maxExposurePercent" > 0 AND "maxExposurePercent" <= 100 AND "maxPositionPercent" > 0 AND "maxPositionPercent" <= 100 AND "maxPositions" > 0 AND "maxDailyLossPercent" > 0 AND "maxDailyLossPercent" <= 100 AND "maxDrawdownPercent" > 0 AND "maxDrawdownPercent" <= 100 AND "cooldownSeconds" >= 0);
ALTER TABLE "MarketSnapshot" ADD CONSTRAINT "MarketSnapshot_values_check" CHECK ("open" > 0 AND "high" > 0 AND "low" > 0 AND "close" > 0 AND "volume" >= 0 AND "high" >= "low" AND "closeTime" > "openTime");
ALTER TABLE "Backtest" ADD CONSTRAINT "Backtest_period_check" CHECK ("initialCapital" > 0 AND "periodEnd" > "periodStart");
ALTER TABLE "BacktestResult" ADD CONSTRAINT "BacktestResult_metrics_check" CHECK ("tradeCount" >= 0 AND "estimatedFees" >= 0 AND "winRate" >= 0 AND "winRate" <= 100 AND "maxDrawdown" >= 0);
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_period_check" CHECK ("quantity" >= 0 AND "periodEnd" > "periodStart");

-- At most one open position for a bot/symbol/mode prevents ambiguous exposure.
CREATE UNIQUE INDEX "Position_one_open_per_bot_symbol_mode" ON "Position"("botId", "symbol", "tradingMode") WHERE "status" = 'OPEN';

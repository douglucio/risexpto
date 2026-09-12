CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');
CREATE TYPE "PaperGridLevelStatus" AS ENUM ('OPEN', 'EXECUTED', 'REPLACED');

CREATE TABLE "PaperPortfolio" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "ExchangeProvider" NOT NULL DEFAULT 'BINANCE',
    "baseCurrency" VARCHAR(16) NOT NULL DEFAULT 'USDT',
    "initialCapital" DECIMAL(38,18) NOT NULL DEFAULT 10000,
    "availableCapital" DECIMAL(38,18) NOT NULL DEFAULT 10000,
    "allocatedCapital" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "currentExposure" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "realizedPnl" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "unrealizedPnl" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "todayRealizedPnl" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "maximumExposure" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "maximumDailyLoss" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "killSwitchActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "PaperPortfolio_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Bot" ADD COLUMN "paperPortfolioId" UUID;
ALTER TABLE "PaperCapitalAllocation" ADD COLUMN "paperPortfolioId" UUID;
ALTER TABLE "PaperCapitalAllocation" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PaperCapitalAllocation" ADD COLUMN "releasedAt" TIMESTAMPTZ(3);

CREATE TABLE "PaperGridLevel" (
    "id" UUID NOT NULL,
    "botId" UUID NOT NULL,
    "level" INTEGER NOT NULL,
    "price" DECIMAL(38,18) NOT NULL,
    "side" "ProposalSide" NOT NULL,
    "status" "PaperGridLevelStatus" NOT NULL DEFAULT 'OPEN',
    "lastExecutedAt" TIMESTAMPTZ(3),
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "PaperGridLevel_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Notification" ADD COLUMN "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO';
ALTER TABLE "Notification" ADD COLUMN "botId" UUID;
ALTER TABLE "Notification" ADD COLUMN "connectionId" UUID;

CREATE UNIQUE INDEX "PaperPortfolio_userId_provider_baseCurrency_key" ON "PaperPortfolio"("userId", "provider", "baseCurrency");
CREATE INDEX "PaperPortfolio_userId_provider_idx" ON "PaperPortfolio"("userId", "provider");
CREATE INDEX "PaperCapitalAllocation_paperPortfolioId_active_idx" ON "PaperCapitalAllocation"("paperPortfolioId", "active");
CREATE UNIQUE INDEX "PaperGridLevel_botId_level_key" ON "PaperGridLevel"("botId", "level");
CREATE INDEX "PaperGridLevel_botId_status_price_idx" ON "PaperGridLevel"("botId", "status", "price");
CREATE INDEX "Notification_botId_createdAt_idx" ON "Notification"("botId", "createdAt");
CREATE INDEX "Bot_paperPortfolioId_status_idx" ON "Bot"("paperPortfolioId", "status");

ALTER TABLE "PaperPortfolio" ADD CONSTRAINT "PaperPortfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bot" ADD CONSTRAINT "Bot_paperPortfolioId_fkey" FOREIGN KEY ("paperPortfolioId") REFERENCES "PaperPortfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaperCapitalAllocation" ADD CONSTRAINT "PaperCapitalAllocation_paperPortfolioId_fkey" FOREIGN KEY ("paperPortfolioId") REFERENCES "PaperPortfolio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaperGridLevel" ADD CONSTRAINT "PaperGridLevel_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

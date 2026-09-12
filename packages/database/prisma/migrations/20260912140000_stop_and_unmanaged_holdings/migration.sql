CREATE TYPE "StopMode" AS ENUM ('STOP_AND_KEEP_ASSETS', 'STOP_AND_LIQUIDATE');
CREATE TYPE "UnmanagedHoldingStatus" AS ENUM ('ACTIVE', 'CLOSED');

ALTER TABLE "Bot" ADD COLUMN "stopMode" "StopMode";
ALTER TABLE "Bot" ADD COLUMN "stopRequestedAt" TIMESTAMPTZ(3);
ALTER TABLE "Position" ADD COLUMN "managed" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "UnmanagedHolding" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "paperPortfolioId" UUID NOT NULL,
  "originBotInstanceId" UUID,
  "symbol" VARCHAR(32) NOT NULL,
  "quantity" DECIMAL(38,18) NOT NULL,
  "averagePrice" DECIMAL(38,18) NOT NULL,
  "costBasis" DECIMAL(38,18) NOT NULL,
  "status" "UnmanagedHoldingStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "closedAt" TIMESTAMPTZ(3),
  CONSTRAINT "UnmanagedHolding_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UnmanagedHolding_userId_status_idx" ON "UnmanagedHolding"("userId", "status");
CREATE INDEX "UnmanagedHolding_paperPortfolioId_status_idx" ON "UnmanagedHolding"("paperPortfolioId", "status");
ALTER TABLE "UnmanagedHolding" ADD CONSTRAINT "UnmanagedHolding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UnmanagedHolding" ADD CONSTRAINT "UnmanagedHolding_paperPortfolioId_fkey" FOREIGN KEY ("paperPortfolioId") REFERENCES "PaperPortfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UnmanagedHolding" ADD CONSTRAINT "UnmanagedHolding_originBotInstanceId_fkey" FOREIGN KEY ("originBotInstanceId") REFERENCES "Bot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "CapitalMode" AS ENUM ('FIXED', 'COMPOUND');

ALTER TABLE "ExchangeConnection"
  ADD COLUMN "availableCapital" DECIMAL(38,18) NOT NULL DEFAULT 0,
  ADD COLUMN "allocatedCapital" DECIMAL(38,18) NOT NULL DEFAULT 0,
  ADD COLUMN "maximumExposure" DECIMAL(38,18) NOT NULL DEFAULT 0,
  ADD COLUMN "maximumDailyLoss" DECIMAL(38,18) NOT NULL DEFAULT 0,
  ADD COLUMN "killSwitchActive" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Bot"
  ADD COLUMN "capitalMode" "CapitalMode" NOT NULL DEFAULT 'FIXED',
  ADD COLUMN "assetSymbol" VARCHAR(32),
  ADD COLUMN "digitalTraderSlug" VARCHAR(80),
  ADD COLUMN "waitingReason" VARCHAR(80),
  ADD COLUMN "waitingSince" TIMESTAMPTZ(3);

ALTER TABLE "RiskProfile" ADD COLUMN "preset" VARCHAR(32);

CREATE TYPE "AiCreditBucket" AS ENUM ('SUBSCRIPTION_CREDITS', 'PURCHASED_CREDITS');
CREATE TABLE "AiCreditLedgerEntry" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "bucket" "AiCreditBucket" NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" VARCHAR(120) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiCreditLedgerEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiCreditLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AiCreditLedgerEntry_userId_bucket_createdAt_idx" ON "AiCreditLedgerEntry"("userId", "bucket", "createdAt");

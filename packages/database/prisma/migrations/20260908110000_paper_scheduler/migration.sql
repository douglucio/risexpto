ALTER TABLE "Bot" ADD COLUMN "nextRunAt" TIMESTAMPTZ(3);

CREATE INDEX "Bot_status_tradingMode_nextRunAt_idx" ON "Bot"("status", "tradingMode", "nextRunAt");

CREATE TABLE "LiveRiskState" (
    "id" UUID NOT NULL,
    "botId" UUID NOT NULL,
    "currentExposure" DECIMAL(38,18) NOT NULL,
    "openPositions" INTEGER NOT NULL,
    "dailyLoss" DECIMAL(38,18) NOT NULL,
    "drawdown" DECIMAL(38,18) NOT NULL,
    "peakEquity" DECIMAL(38,18) NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "LiveRiskState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LiveRiskState_botId_key" ON "LiveRiskState"("botId");

ALTER TABLE "LiveRiskState" ADD CONSTRAINT "LiveRiskState_botId_fkey"
  FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

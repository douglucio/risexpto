CREATE TYPE "PaperReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED');
CREATE TABLE "PaperCapitalReservation" (
    "id" UUID NOT NULL,
    "botId" UUID NOT NULL,
    "proposalId" UUID NOT NULL,
    "amount" DECIMAL(38,18) NOT NULL,
    "status" "PaperReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "PaperCapitalReservation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaperCapitalReservation_proposalId_key" ON "PaperCapitalReservation"("proposalId");
CREATE INDEX "PaperCapitalReservation_status_createdAt_idx" ON "PaperCapitalReservation"("status", "createdAt");
CREATE INDEX "PaperCapitalReservation_botId_status_idx" ON "PaperCapitalReservation"("botId", "status");
ALTER TABLE "PaperCapitalReservation" ADD CONSTRAINT "PaperCapitalReservation_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaperCapitalReservation" ADD CONSTRAINT "PaperCapitalReservation_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "TradeProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

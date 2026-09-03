CREATE TABLE "PaperCapitalAllocation" (
    "id" UUID NOT NULL,
    "botId" UUID NOT NULL,
    "allocated" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "PaperCapitalAllocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaperCapitalAllocation_botId_key" ON "PaperCapitalAllocation"("botId");
ALTER TABLE "PaperCapitalAllocation" ADD CONSTRAINT "PaperCapitalAllocation_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

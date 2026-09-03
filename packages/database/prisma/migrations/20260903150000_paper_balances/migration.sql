CREATE TABLE "PaperBalance" (
    "id" UUID NOT NULL,
    "botId" UUID NOT NULL,
    "asset" VARCHAR(16) NOT NULL,
    "free" DECIMAL(38,18) NOT NULL,
    "locked" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "PaperBalance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaperBalance_botId_asset_key" ON "PaperBalance"("botId", "asset");
CREATE INDEX "PaperBalance_botId_updatedAt_idx" ON "PaperBalance"("botId", "updatedAt");
ALTER TABLE "PaperBalance" ADD CONSTRAINT "PaperBalance_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

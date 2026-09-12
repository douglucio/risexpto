ALTER TABLE "Notification" ADD COLUMN "dedupeKey" VARCHAR(180);
CREATE INDEX "Notification_botId_dedupeKey_createdAt_idx" ON "Notification"("botId", "dedupeKey", "createdAt");

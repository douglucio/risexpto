CREATE TABLE "BillingWebhookEvent" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "providerId" VARCHAR(128) NOT NULL,
    "type" VARCHAR(128) NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BillingWebhookEvent_providerId_key" ON "BillingWebhookEvent"("providerId");
CREATE INDEX "BillingWebhookEvent_provider_type_idx" ON "BillingWebhookEvent"("provider", "type");

-- Persist kill-switch state so protection survives API/worker restarts.
CREATE TYPE "KillSwitchScope" AS ENUM ('USER', 'BOT', 'SYSTEM');

CREATE TABLE "KillSwitchState" (
    "id" UUID NOT NULL,
    "scope" "KillSwitchScope" NOT NULL,
    "targetId" VARCHAR(128) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "reason" VARCHAR(500) NOT NULL,
    "activatedBy" VARCHAR(128) NOT NULL,
    "activatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "KillSwitchState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KillSwitchState_scope_targetId_key" ON "KillSwitchState"("scope", "targetId");
CREATE INDEX "KillSwitchState_active_scope_idx" ON "KillSwitchState"("active", "scope");

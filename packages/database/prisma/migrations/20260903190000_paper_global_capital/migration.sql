CREATE TABLE "PaperGlobalCapitalAllocation" (
    "id" VARCHAR(32) NOT NULL DEFAULT 'global',
    "allocated" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "PaperGlobalCapitalAllocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaperGlobalCapitalAllocation_allocated_idx" ON "PaperGlobalCapitalAllocation"("allocated");

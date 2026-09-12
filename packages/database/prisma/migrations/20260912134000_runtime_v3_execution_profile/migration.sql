ALTER TABLE "BotConfiguration"
  ADD COLUMN "evaluationIntervalMs" INTEGER NOT NULL DEFAULT 60000,
  ADD COLUMN "marketDataTimeframe" VARCHAR(12) NOT NULL DEFAULT '1m',
  ADD COLUMN "historyDepth" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN "minimumCandles" INTEGER NOT NULL DEFAULT 1;

-- Existing DCA rows used the strategy interval as an operational cadence.
-- Preserve that behavior only for legacy records; new records use the explicit profile.
UPDATE "BotConfiguration"
SET "evaluationIntervalMs" = LEAST(86400000, GREATEST(1000, ("parameters"->>'intervalMs')::integer))
WHERE jsonb_typeof("parameters"->'intervalMs') = 'number'
  AND ("parameters"->>'intervalMs') ~ '^[0-9]+$';

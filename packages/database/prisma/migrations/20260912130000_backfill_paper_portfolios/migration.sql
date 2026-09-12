INSERT INTO "PaperPortfolio" (
    "id", "userId", "provider", "baseCurrency", "initialCapital",
    "availableCapital", "allocatedCapital", "currentExposure", "realizedPnl",
    "unrealizedPnl", "todayRealizedPnl", "maximumExposure", "maximumDailyLoss",
    "killSwitchActive", "createdAt", "updatedAt"
)
SELECT
    (md5('paper-portfolio:' || b."userId" || ':' || c."quoteCurrency")::uuid),
    b."userId", 'BINANCE', c."quoteCurrency", 10000, 10000, 0, 0, 0, 0, 0, 0, 0,
    false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Bot" b
JOIN "BotConfiguration" c ON c."botId" = b."id"
WHERE b."tradingMode" = 'PAPER'
GROUP BY b."userId", c."quoteCurrency"
ON CONFLICT ("userId", "provider", "baseCurrency") DO NOTHING;

UPDATE "Bot" b
SET "paperPortfolioId" = p."id"
FROM "BotConfiguration" c, "PaperPortfolio" p
WHERE c."botId" = b."id"
  AND p."userId" = b."userId"
  AND p."provider" = 'BINANCE'
  AND p."baseCurrency" = c."quoteCurrency"
  AND b."tradingMode" = 'PAPER';

UPDATE "PaperCapitalAllocation" a
SET
    "paperPortfolioId" = b."paperPortfolioId",
    "active" = b."status" IN ('RUNNING', 'PAUSED'),
    "allocated" = CASE WHEN b."status" IN ('RUNNING', 'PAUSED') THEN c."authorizedCapital" ELSE 0 END,
    "releasedAt" = CASE WHEN b."status" IN ('RUNNING', 'PAUSED') THEN NULL ELSE CURRENT_TIMESTAMP END
FROM "Bot" b
JOIN "BotConfiguration" c ON c."botId" = b."id"
WHERE a."botId" = b."id"
  AND b."tradingMode" = 'PAPER';

UPDATE "PaperPortfolio" p
SET
    "allocatedCapital" = COALESCE(x."allocated", 0),
    "availableCapital" = GREATEST(0, p."initialCapital" - COALESCE(x."allocated", 0)),
    "updatedAt" = CURRENT_TIMESTAMP
FROM (
    SELECT "paperPortfolioId", SUM("allocated") AS "allocated"
    FROM "PaperCapitalAllocation"
    WHERE "active" = true AND "paperPortfolioId" IS NOT NULL
    GROUP BY "paperPortfolioId"
) x
WHERE p."id" = x."paperPortfolioId";

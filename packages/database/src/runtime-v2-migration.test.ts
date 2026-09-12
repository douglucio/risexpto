import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('Digital Trader Runtime V2 migrations', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    const root = new URL('../prisma/migrations/', import.meta.url);
    const directories = (await readdir(root)).filter((name) => /^20\d+_/.test(name)).sort();
    for (const directory of directories) await db.exec(await readFile(new URL(`${directory}/migration.sql`, root), 'utf8'));
  }, 30_000);
  afterAll(async () => db.close());

  it('backfills a user-scoped Paper Portfolio and links existing Paper traders', async () => {
    const userId = '00000000-0000-4000-8000-000000000091';
    const definitionId = '00000000-0000-4000-8000-000000000092';
    const versionId = '00000000-0000-4000-8000-000000000093';
    const botId = '00000000-0000-4000-8000-000000000094';
    const configurationId = '00000000-0000-4000-8000-000000000095';
    const allocationId = '00000000-0000-4000-8000-000000000096';
    await db.query(`INSERT INTO "User" ("id", "externalAuthId", "email", "updatedAt") VALUES ($1, $2, $3, now())`, [userId, 'runtime-v2-user', 'runtime-v2@example.com']);
    await db.query(`INSERT INTO "StrategyDefinition" ("id", "key", "name", "description", "updatedAt") VALUES ($1, 'runtime-v2', 'Runtime V2', 'test', now())`, [definitionId]);
    await db.query(`INSERT INTO "StrategyVersion" ("id", "strategyDefinitionId", "version", "parameterSchema", "implementationKey", "active") VALUES ($1, $2, 1, '{}', 'dca', true)`, [versionId, definitionId]);
    await db.query(`INSERT INTO "Bot" ("id", "userId", "strategyVersionId", "name", "status", "tradingMode", "createdAt", "updatedAt") VALUES ($1, $2, $3, 'Runtime V2 Bot', 'RUNNING', 'PAPER', now(), now())`, [botId, userId, versionId]);
    await db.query(`INSERT INTO "BotConfiguration" ("id", "botId", "parameters", "allowedSymbols", "authorizedCapital", "quoteCurrency", "updatedAt") VALUES ($1, $2, '{}', ARRAY['BTCUSDT'], 1000, 'USDT', now())`, [configurationId, botId]);
    await db.query(`INSERT INTO "PaperCapitalAllocation" ("id", "botId", "allocated", "updatedAt") VALUES ($1, $2, 0, now())`, [allocationId, botId]);
    await db.exec(await readFile(new URL('../prisma/migrations/20260912130000_backfill_paper_portfolios/migration.sql', import.meta.url), 'utf8'));
    const result = await db.query<{ portfolioId: string; active: boolean; allocated: string }>(`SELECT b."paperPortfolioId" AS "portfolioId", a."active", a."allocated"::text AS "allocated" FROM "Bot" b JOIN "PaperCapitalAllocation" a ON a."botId" = b."id" WHERE b."id" = $1`, [botId]);
    expect(result.rows[0]).toMatchObject({ active: true, allocated: '1000.000000000000000000' });
    expect(result.rows[0]?.portfolioId).toBeTruthy();
  });
});

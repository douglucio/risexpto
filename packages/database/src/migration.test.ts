import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const migrationUrl = new URL(
  '../prisma/migrations/20260830222000_initial_domain/migration.sql',
  import.meta.url,
);

describe('initial PostgreSQL migration', () => {
  let db: PGlite;
  beforeEach(async () => {
    db = new PGlite();
    await db.exec(await readFile(migrationUrl, 'utf8'));
  });
  afterEach(async () => db.close());

  it('persists an identity and its regional profile', async () => {
    const userId = '00000000-0000-4000-8000-000000000001';
    await db.query(
      `INSERT INTO "User" ("id", "externalAuthId", "email", "updatedAt") VALUES ($1, $2, $3, now())`,
      [userId, 'keycloak-user-1', 'user@example.com'],
    );
    await db.query(
      `INSERT INTO "UserProfile" ("id", "userId", "locale", "timezone", "referenceCurrency", "updatedAt") VALUES ($1, $2, $3, $4, $5, now())`,
      ['00000000-0000-4000-8000-000000000002', userId, 'pt-BR', 'America/Sao_Paulo', 'BRL'],
    );
    const result = await db.query<{ email: string; locale: string }>(
      `SELECT u.email, p.locale FROM "User" u JOIN "UserProfile" p ON p."userId" = u.id WHERE u.id = $1`,
      [userId],
    );
    expect(result.rows).toEqual([{ email: 'user@example.com', locale: 'pt-BR' }]);
  });

  it('enforces identity uniqueness and typed preferences', async () => {
    const insert = `INSERT INTO "User" ("id", "externalAuthId", "email", "updatedAt") VALUES ($1, $2, $3, now())`;
    await db.query(insert, [
      '00000000-0000-4000-8000-000000000003',
      'subject-1',
      'one@example.com',
    ]);
    await expect(
      db.query(insert, ['00000000-0000-4000-8000-000000000004', 'subject-1', 'two@example.com']),
    ).rejects.toThrow();
    await expect(
      db.query(
        `INSERT INTO "UserProfile" ("id", "userId", "locale", "timezone", "referenceCurrency", "updatedAt") VALUES ($1, $2, 'unknown', 'UTC', 'BTC', now())`,
        ['00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000003'],
      ),
    ).rejects.toThrow();
  });

  it('contains financial constraints and the partial open-position index', async () => {
    const constraints = await db.query<{ conname: string }>(
      `SELECT conname FROM pg_constraint WHERE conname LIKE '%_check' ORDER BY conname`,
    );
    expect(constraints.rows.map(({ conname }) => conname)).toContain('Order_size_check');
    expect(constraints.rows.map(({ conname }) => conname)).toContain('RiskProfile_limits_check');
    const indexes = await db.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE indexname = 'Position_one_open_per_bot_symbol_mode'`,
    );
    expect(indexes.rows).toHaveLength(1);
  });
});

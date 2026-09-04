import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createDatabaseClient } from '@risexpto/database';
import { processPaperCycle } from './paper-cycle.js';

const databaseUrl = process.env.E2E_DATABASE_URL;

describe('paper trading persistence integration', () => {
  it.skipIf(!databaseUrl)('persists a complete PAPER cycle in PostgreSQL', async () => {
    const database = createDatabaseClient(databaseUrl!);
    const suffix = randomUUID();
    const userId = randomUUID();
    const definitionId = randomUUID();
    const versionId = randomUUID();
    const botId = randomUUID();
    const marketId = randomUUID();
    try {
      await database.user.create({ data: { id: userId, externalAuthId: `e2e-${suffix}`, email: `${suffix}@example.com`, emailVerifiedAt: new Date() } });
      await database.strategyDefinition.create({ data: { id: definitionId, key: `e2e-${suffix}`, name: 'E2E DCA', description: 'Integration fixture' } });
      await database.strategyVersion.create({ data: { id: versionId, strategyDefinitionId: definitionId, version: 1, active: true, implementationKey: 'dca', parameterSchema: {} } });
      await database.bot.create({
        data: {
          id: botId, userId, strategyVersionId: versionId, name: `E2E ${suffix}`, status: 'RUNNING', tradingMode: 'PAPER',
          configuration: { create: { parameters: { symbol: 'BTCUSDT', intervalMs: 1, quoteAmount: 10, maxCapital: 100 }, allowedSymbols: ['BTCUSDT'], authorizedCapital: 100, quoteCurrency: 'USDT' } },
          riskProfile: { create: { userId, name: `E2E risk ${suffix}`, maxAllocatedCapital: 100, maxTradeAmount: 25, maxExposurePercent: 1, maxPositionPercent: 1, maxPositions: 5, maxDailyLossPercent: 100, maxDrawdownPercent: 100, allowedSymbols: ['BTCUSDT'] } },
        },
      });
      await database.marketSnapshot.create({ data: { id: marketId, provider: 'BINANCE', symbol: 'BTCUSDT', interval: '1m', openTime: new Date(Date.now() - 60_000), closeTime: new Date(), open: 100, high: 101, low: 99, close: 100, volume: 10 } });

      await processPaperCycle(database, { id: `e2e-${suffix}`, data: { type: 'bot-cycle', botId } } as never);

      const [proposal, riskEvents, order, trades, position, balance] = await Promise.all([
        database.tradeProposal.findFirst({ where: { botId } }),
        database.riskEvent.findMany({ where: { botId } }),
        database.order.findFirst({ where: { botId } }),
        database.trade.findMany({ where: { order: { botId } } }),
        database.position.findFirst({ where: { botId, status: 'OPEN' } }),
        database.paperBalance.findUnique({ where: { botId_asset: { botId, asset: 'USDT' } } }),
      ]);
      expect(proposal?.status).toBe('EXECUTED');
      expect(riskEvents).toHaveLength(1);
      expect(riskEvents[0]?.decision).toBe('APPROVED');
      expect(order?.status).toBe('FILLED');
      expect(trades).toHaveLength(1);
      expect(position?.symbol).toBe('BTCUSDT');
      expect(balance?.free.toString()).toBe('89.99');
    } finally {
      await database.trade.deleteMany({ where: { order: { botId } } });
      await database.order.deleteMany({ where: { botId } });
      await database.position.deleteMany({ where: { botId } });
      await database.riskEvent.deleteMany({ where: { botId } });
      await database.botEvent.deleteMany({ where: { botId } });
      await database.marketSnapshot.deleteMany({ where: { id: marketId } });
      await database.bot.deleteMany({ where: { id: botId } });
      await database.strategyVersion.deleteMany({ where: { id: versionId } });
      await database.strategyDefinition.deleteMany({ where: { id: definitionId } });
      await database.user.deleteMany({ where: { id: userId } });
      await database.paperGlobalCapitalAllocation.deleteMany({ where: { allocated: 0 } });
      await database.$disconnect();
    }
  }, 30_000);
});

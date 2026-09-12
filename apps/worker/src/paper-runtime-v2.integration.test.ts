import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createDatabaseClient } from '@risexpto/database';
import { processPaperCycle } from './paper-cycle.js';
import { TraderRuntimeStateService } from './trader-runtime-state.js';

const databaseUrl = process.env.E2E_DATABASE_URL;

describe('Digital Trader Runtime V2 multi-trader Paper flow', () => {
  it.skipIf(!databaseUrl)(
    'runs Atlas, Luna, DCA One and Pulse in one isolated Paper portfolio and survives reprocessing',
    async () => {
      const database = createDatabaseClient(databaseUrl!);
      const suffix = randomUUID();
      const userId = randomUUID();
      const portfolioId = randomUUID();
      const traders = [
        { name: 'Atlas', implementationKey: 'grid', symbol: 'BTCUSDT', parameters: { symbol: 'BTCUSDT', lowerPrice: 90, upperPrice: 110, levels: 3, capital: 100, maxVolatility: 100 }, close: 90, high: 91, low: 89, volume: 100 },
        { name: 'Luna', implementationKey: 'trend-following', symbol: 'ETHUSDT', parameters: { symbol: 'ETHUSDT', fastEmaPeriod: 1, slowEmaPeriod: 2, atrPeriod: 1, momentumPeriod: 1, minMomentumPercent: 0, minVolumeRatio: 0.1, maxAtrPercent: 100, quoteAmount: 10, maxCapital: 100 }, close: 130, high: 131, low: 129, volume: 100 },
        { name: 'DCA One', implementationKey: 'dca', symbol: 'SOLUSDT', parameters: { symbol: 'SOLUSDT', intervalMs: 1, quoteAmount: 10, maxCapital: 100 }, close: 100, high: 101, low: 99, volume: 100 },
        { name: 'Pulse', implementationKey: 'breakout', symbol: 'DOGEUSDT', parameters: { symbol: 'DOGEUSDT', lookback: 2, breakoutPercent: 1, quoteAmount: 10, maxCapital: 100, cooldownMs: 0, stopLossPercent: 3, takeProfitPercent: 6 }, close: 120, high: 121, low: 119, volume: 100 },
      ] as const;
      const botIds: string[] = [];
      const definitionIds: string[] = [];
      const versionIds: string[] = [];
      const snapshotIds: string[] = [];
      try {
        await database.user.create({ data: { id: userId, externalAuthId: `runtime-v2-${suffix}`, email: `${suffix}@example.com`, emailVerifiedAt: new Date() } });
        await database.paperPortfolio.create({ data: { id: portfolioId, userId, provider: 'BINANCE', baseCurrency: 'USDT', initialCapital: 10000, availableCapital: 9600, allocatedCapital: 400 } });
        for (const [index, trader] of traders.entries()) {
          const definitionId = randomUUID();
          const versionId = randomUUID();
          const botId = randomUUID();
          const snapshotId = randomUUID();
          definitionIds.push(definitionId);
          versionIds.push(versionId);
          botIds.push(botId);
          snapshotIds.push(snapshotId);
          await database.strategyDefinition.create({ data: { id: definitionId, key: `${trader.implementationKey}-${suffix}-${index}`, name: trader.name, description: 'Runtime V2 integration fixture' } });
          await database.strategyVersion.create({ data: { id: versionId, strategyDefinitionId: definitionId, version: 1, active: true, implementationKey: trader.implementationKey, parameterSchema: {} } });
          await database.bot.create({
            data: {
              id: botId,
              userId,
              strategyVersionId: versionId,
              name: `${trader.name} ${suffix}`,
              status: 'RUNNING',
              tradingMode: 'PAPER',
              configuration: { create: { parameters: trader.parameters, allowedSymbols: [trader.symbol], authorizedCapital: 100, quoteCurrency: 'USDT' } },
              riskProfile: { create: { userId, name: `${trader.name} risk ${suffix}`, maxAllocatedCapital: 100, maxTradeAmount: 100, maxExposurePercent: 100, maxPositionPercent: 100, maxPositions: 5, maxDailyLossPercent: 100, maxDrawdownPercent: 100, allowedSymbols: [trader.symbol] } },
              paperCapitalAllocation: { create: { allocated: 100, active: true, paperPortfolioId: portfolioId } },
              paperBalances: { create: { asset: 'USDT', free: 100, locked: 0 } },
            },
          });
          await database.bot.update({ where: { id: botId }, data: { paperPortfolioId: portfolioId } });
          const now = Date.now();
          const candles = trader.implementationKey === 'breakout'
            ? [{ close: 100, high: 101, low: 99 }, { close: 105, high: 106, low: 104 }, { close: trader.close, high: trader.high, low: trader.low }]
            : trader.implementationKey === 'trend-following'
              ? [{ close: 100, high: 101, low: 99 }, { close: 110, high: 111, low: 109 }, { close: trader.close, high: trader.high, low: trader.low }]
              : [{ close: trader.close, high: trader.high, low: trader.low }];
          for (const [candleIndex, candle] of candles.entries()) {
            const id = candleIndex === candles.length - 1 ? snapshotId : randomUUID();
            if (candleIndex === candles.length - 1) snapshotIds.push(id);
            await database.marketSnapshot.create({ data: { id, provider: 'BINANCE', symbol: trader.symbol, interval: '1m', openTime: new Date(now - (candles.length - candleIndex) * 60_000), closeTime: new Date(now - (candles.length - candleIndex - 1) * 60_000), open: candle.close, high: candle.high, low: candle.low, close: candle.close, volume: trader.volume } });
          }
        }
        for (const botId of botIds) {
          await processPaperCycle(database, { id: `runtime-v2-${botId}`, data: { type: 'bot-cycle', botId } } as never);
          await processPaperCycle(database, { id: `runtime-v2-${botId}`, data: { type: 'bot-cycle', botId } } as never);
        }
        const allocations = await database.paperCapitalAllocation.findMany({ where: { botId: { in: botIds } } });
        expect(allocations).toHaveLength(4);
        expect(allocations.every((allocation) => allocation.active && allocation.allocated.toString() === '100')).toBe(true);
        const events = await database.botEvent.findMany({ where: { botId: { in: botIds }, type: 'CYCLE_STARTED' } });
        expect(events).toHaveLength(8);
        const orders = await database.order.findMany({ where: { botId: { in: botIds }, tradingMode: 'PAPER' } });
        expect(new Set(orders.map((order) => order.botId)).size).toBe(4);
        for (const botId of botIds) {
          expect(orders.filter((order) => order.botId === botId)).toHaveLength(1);
          const proposals = await database.tradeProposal.count({ where: { botId } });
          expect(proposals).toBeGreaterThanOrEqual(1);
          const cycleEvents = await database.botEvent.count({ where: { botId, type: 'CYCLE_STARTED' } });
          expect(cycleEvents).toBe(2);
        }
        for (const botId of botIds) {
          const context = await new TraderRuntimeStateService(database).load(botId, 100);
          expect(context.traderInstanceId).toBe(botId);
          expect(context.allocatedCapital.toString()).toBe('100');
        }
      } finally {
        await database.riskEvent.deleteMany({ where: { botId: { in: botIds } } });
        await database.trade.deleteMany({ where: { order: { botId: { in: botIds } } } });
        await database.order.deleteMany({ where: { botId: { in: botIds } } });
        await database.position.deleteMany({ where: { botId: { in: botIds } } });
        await database.bot.deleteMany({ where: { id: { in: botIds } } });
        await database.marketSnapshot.deleteMany({ where: { id: { in: snapshotIds } } });
        await database.strategyVersion.deleteMany({ where: { id: { in: versionIds } } });
        await database.strategyDefinition.deleteMany({ where: { id: { in: definitionIds } } });
        await database.paperPortfolio.deleteMany({ where: { id: portfolioId } });
        await database.user.deleteMany({ where: { id: userId } });
        await database.$disconnect();
      }
    },
    60_000,
  );
});

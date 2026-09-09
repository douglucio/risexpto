import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createDatabaseClient } from '@risexpto/database';
import { LiveExecutionEngine, type LiveConnector } from '@risexpto/live-execution';
import { PrismaLiveOrderStore } from './live-order-store.js';

const databaseUrl = process.env.E2E_DATABASE_URL;

describe('LIVE order persistence integration', () => {
  it.skipIf(!databaseUrl)('recovers a pending order after a duplicate worker and restart', async () => {
    const database = createDatabaseClient(databaseUrl!);
    const suffix = randomUUID();
    const userId = randomUUID();
    const definitionId = randomUUID();
    const versionId = randomUUID();
    const botId = randomUUID();
    const exchangeConnectionId = randomUUID();
    const proposalId = randomUUID();
    const clientOrderId = `e2e-${suffix}`;
    const request = {
      clientOrderId,
      symbol: 'BTCUSDT',
      side: 'BUY' as const,
      type: 'MARKET' as const,
      quoteAmount: '5',
    };
    const resolveContext = () => Promise.resolve({
      botId,
      exchangeConnectionId,
      tradeProposalId: proposalId,
      idempotencyKey: `live:${suffix}`,
    });
    try {
      await database.user.create({ data: { id: userId, externalAuthId: `e2e-${suffix}`, email: `${suffix}@example.com` } });
      await database.exchangeConnection.create({
        data: {
          id: exchangeConnectionId, userId, provider: 'BINANCE', label: `E2E ${suffix}`, status: 'CONNECTED', maskedApiKey: 'e2e',
          apiKeyCiphertext: Buffer.from('ciphertext'), apiSecretCiphertext: Buffer.from('secret'), encryptionKeyVersion: 1,
        },
      });
      await database.strategyDefinition.create({ data: { id: definitionId, key: `e2e-${suffix}`, name: 'E2E LIVE', description: 'Integration fixture' } });
      await database.strategyVersion.create({ data: { id: versionId, strategyDefinitionId: definitionId, version: 1, active: true, implementationKey: 'dca', parameterSchema: {} } });
      await database.bot.create({ data: { id: botId, userId, exchangeConnectionId, strategyVersionId: versionId, name: `E2E ${suffix}`, status: 'RUNNING', tradingMode: 'LIVE' } });
      await database.tradeProposal.create({
        data: {
          id: proposalId, botId, strategyVersionId: versionId, correlationId: randomUUID(), symbol: 'BTCUSDT', side: 'BUY', orderType: 'MARKET',
          quoteAmount: 5, rationale: {}, status: 'APPROVED',
        },
      });

      const firstStore = new PrismaLiveOrderStore(database, resolveContext);
      const restartedStore = new PrismaLiveOrderStore(database, resolveContext);
      await firstStore.createPending({ request, result: null, state: 'PENDING_SUBMIT' });
      await expect(restartedStore.createPending({ request, result: null, state: 'PENDING_SUBMIT' })).resolves.toMatchObject({ state: 'PENDING_SUBMIT' });

      const result = { clientOrderId, externalOrderId: `exchange-${suffix}`, status: 'FILLED' as const, filledQuantity: '0.00005' };
      const query = vi.fn().mockResolvedValue(result);
      const connector: LiveConnector = { submit: vi.fn(), query, cancel: vi.fn() };
      await expect(new LiveExecutionEngine(connector, true, firstStore).submit(request)).resolves.toEqual(result);
      await expect(new LiveExecutionEngine({ submit: vi.fn(), query: vi.fn(), cancel: vi.fn() }, true, restartedStore).submit(request)).resolves.toEqual(result);

      const persisted = await database.order.findUnique({ where: { clientOrderId } });
      expect(persisted?.externalOrderId).toBe(result.externalOrderId);
      expect(persisted?.status).toBe('FILLED');
      expect(query).toHaveBeenCalledTimes(1);
    } finally {
      await database.order.deleteMany({ where: { clientOrderId } });
      await database.tradeProposal.deleteMany({ where: { id: proposalId } });
      await database.bot.deleteMany({ where: { id: botId } });
      await database.exchangeConnection.deleteMany({ where: { id: exchangeConnectionId } });
      await database.strategyVersion.deleteMany({ where: { id: versionId } });
      await database.strategyDefinition.deleteMany({ where: { id: definitionId } });
      await database.user.deleteMany({ where: { id: userId } });
      await database.$disconnect();
    }
  }, 30_000);
});

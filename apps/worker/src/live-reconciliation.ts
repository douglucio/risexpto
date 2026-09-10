import type { PrismaClient } from '@risexpto/database';
import { createTestnetLiveExecutionEngine } from './live-runtime.js';
import { refreshLiveRiskState } from './live-risk-state.js';
import { persistLiveFills } from './live-fills.js';

export async function reconcileLiveOrders(
  database: PrismaClient,
  exchangeConnectionId: string,
): Promise<number> {
  const orders = await database.order.findMany({
    where: {
      exchangeConnectionId,
      tradingMode: 'LIVE',
      status: { in: ['CREATED', 'SUBMITTED', 'PARTIALLY_FILLED'] },
    },
    select: {
      id: true,
      botId: true,
      clientOrderId: true,
      symbol: true,
      bot: { select: { userId: true } },
      proposal: { select: { id: true, correlationId: true } },
    },
  });
  if (orders.length === 0) return 0;
  const contexts = new Map(
    orders.map((order) => [
      order.clientOrderId,
      {
        botId: order.botId,
        exchangeConnectionId,
        tradeProposalId: order.proposal.id,
        idempotencyKey: `live:${order.id}`,
      },
    ]),
  );
  const { engine, connector } = await createTestnetLiveExecutionEngine(
    database,
    exchangeConnectionId,
    (request) => {
      const context = contexts.get(request.clientOrderId);
      if (!context) throw new Error('LIVE_ORDER_CONTEXT_NOT_FOUND');
      return Promise.resolve(context);
    },
  );
  let reconciled = 0;
  for (const order of orders) {
    const blocked = await database.killSwitchState.findFirst({
      where: {
        active: true,
        OR: [
          { scope: 'SYSTEM', targetId: 'global' },
          { scope: 'USER', targetId: order.bot.userId },
          { scope: 'BOT', targetId: order.botId },
        ],
      },
      select: { scope: true, reason: true },
    });
    if (blocked) {
      await recordEvent(
        database,
        order.botId,
        order.proposal.correlationId,
        'LIVE_RECONCILIATION_BLOCKED',
        {
          orderId: order.id,
          scope: blocked.scope,
          reason: blocked.reason,
        },
      );
      continue;
    }
    try {
      const result = await engine.reconcile(order.clientOrderId);
      const fills = await connector.myTrades(order.symbol, result.externalOrderId);
      await persistLiveFills(database, order.id, fills);
      await refreshLiveRiskState(database, order.botId);
      reconciled += 1;
      await recordAudit(database, order.botId, order.proposal.correlationId, 'ORDER_RESULT', {
        orderId: order.id,
        clientOrderId: order.clientOrderId,
        action: 'RECONCILE',
      });
    } catch (error) {
      await recordEvent(
        database,
        order.botId,
        order.proposal.correlationId,
        'LIVE_RECONCILIATION_FAILED',
        {
          orderId: order.id,
          clientOrderId: order.clientOrderId,
          error: safeError(error),
        },
      );
    }
  }
  return reconciled;
}

async function recordEvent(
  database: PrismaClient,
  botId: string,
  correlationId: string,
  type: string,
  payload: object,
) {
  await database.botEvent.create({ data: { botId, type, payload } });
  await recordAudit(database, botId, correlationId, 'EXCHANGE_EVENT', payload);
}

async function recordAudit(
  database: PrismaClient,
  botId: string,
  correlationId: string,
  eventType: 'ORDER_RESULT' | 'EXCHANGE_EVENT',
  payload: object,
) {
  await database.auditLog.create({ data: { botId, eventType, correlationId, payload } });
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown live reconciliation error';
}

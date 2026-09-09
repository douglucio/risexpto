import { Decimal } from 'decimal.js';
import type { PrismaClient } from '@risexpto/database';
import { RiskEngine } from '@risexpto/risk-engine';
import { assertFreshMarketData } from './market-data-runtime.js';
import type { LiveOrder } from '@risexpto/live-execution';
import { createTestnetLiveExecutionEngine } from './live-runtime.js';

export async function submitLiveOrder(database: PrismaClient, orderId: string): Promise<void> {
  const order = await database.order.findUnique({
    where: { id: orderId },
    include: {
      bot: { include: { configuration: true, riskProfile: true, liveRiskState: true } },
      proposal: { select: { id: true, correlationId: true } },
      exchangeConnection: { select: { id: true } },
    },
  });
  if (!order || order.tradingMode !== 'LIVE' || !order.exchangeConnection || !order.bot.riskProfile)
    throw new Error('LIVE_ORDER_CONTEXT_INCOMPLETE');
  if (!order.bot.liveRiskState) throw new Error('LIVE_RISK_CONTEXT_UNAVAILABLE');
  if (!['READY', 'RUNNING'].includes(order.bot.status)) throw new Error('LIVE_BOT_NOT_READY');
  const botStatus = order.bot.status === 'READY' ? 'READY' : 'RUNNING';
  const correlationId = order.proposal.correlationId;
  const blocked = await isBlocked(database, order.bot.userId, order.bot.id);
  if (blocked) {
    await record(database, order.bot.id, correlationId, 'LIVE_SUBMIT_BLOCKED', { orderId, reason: 'KILL_SWITCH' });
    return;
  }
  const { engine, connector } = await createTestnetLiveExecutionEngine(database, order.exchangeConnection.id, () => Promise.resolve({
    botId: order.botId,
    exchangeConnectionId: order.exchangeConnection!.id,
    tradeProposalId: order.tradeProposalId,
    idempotencyKey: order.idempotencyKey,
  }));
  const price = order.limitPrice?.toString() ?? await latestPrice(database, order.symbol);
  const amount = order.requestedQuantity?.toString() ?? new Decimal(order.requestedQuoteAmount ?? 0).div(price).toString();
  const quoteAsset = order.bot.configuration?.quoteCurrency ?? inferQuoteAsset(order.symbol);
  const balance = (await connector.accountBalances()).find((item) => item.asset === quoteAsset);
  const risk = new RiskEngine({
    maxAllocatedCapital: Number(order.bot.riskProfile.maxAllocatedCapital),
    maxTradeAmount: Number(order.bot.riskProfile.maxTradeAmount),
    maxExposure: Number(order.bot.riskProfile.maxAllocatedCapital) * Number(order.bot.riskProfile.maxExposurePercent),
    maxPositionPercent: Number(order.bot.riskProfile.maxPositionPercent),
    maxPositions: order.bot.riskProfile.maxPositions,
    maxDailyLoss: Number(order.bot.riskProfile.maxDailyLossPercent),
    maxDrawdown: Number(order.bot.riskProfile.maxDrawdownPercent),
    allowedSymbols: order.bot.riskProfile.allowedSymbols,
    cooldownMs: order.bot.riskProfile.cooldownSeconds * 1000,
    allowLive: true,
  }).evaluate({
    symbol: order.symbol,
    amount: Number(amount),
    price: Number(price),
    availableBalance: Number(balance?.free ?? 0),
    allocatedCapital: Number(order.bot.liveRiskState.currentExposure),
    currentExposure: Number(order.bot.liveRiskState.currentExposure),
    positionValue: Number(order.bot.liveRiskState.currentExposure),
    openPositions: order.bot.liveRiskState.openPositions,
    dailyLoss: Number(order.bot.liveRiskState.dailyLoss),
    drawdown: Number(order.bot.liveRiskState.drawdown),
    lastTradeAt: null,
    botStatus,
    tradingMode: 'LIVE',
  });
  await database.riskEvent.create({ data: {
    botId: order.botId, riskProfileId: order.bot.riskProfile.id, tradeProposalId: order.tradeProposalId,
    decision: risk.decision, reasonCode: risk.reasonCode, reason: risk.reason, riskSnapshot: risk.riskSnapshot,
  } });
  if (risk.decision !== 'APPROVED') {
    await record(database, order.botId, correlationId, 'LIVE_SUBMIT_BLOCKED', { orderId, reason: risk.reasonCode });
    return;
  }
  if (await isBlocked(database, order.bot.userId, order.bot.id)) {
    await record(database, order.botId, correlationId, 'LIVE_SUBMIT_BLOCKED', { orderId, reason: 'KILL_SWITCH_RACE' });
    return;
  }
  await recordAudit(database, order.botId, correlationId, 'ORDER_REQUEST', { orderId, clientOrderId: order.clientOrderId });
  const request: LiveOrder = {
    clientOrderId: order.clientOrderId, symbol: order.symbol, side: order.side, type: order.type,
    ...(order.requestedQuantity ? { quantity: order.requestedQuantity.toString() } : {}),
    ...(order.requestedQuoteAmount ? { quoteAmount: order.requestedQuoteAmount.toString() } : {}),
    ...(order.limitPrice ? { limitPrice: order.limitPrice.toString() } : {}),
  };
  const result = await engine.submit(request);
  await recordAudit(database, order.botId, correlationId, 'ORDER_RESULT', { orderId, clientOrderId: result.clientOrderId, externalOrderId: result.externalOrderId, status: result.status });
}

async function latestPrice(database: PrismaClient, symbol: string): Promise<string> {
  const snapshot = await database.marketSnapshot.findFirst({ where: { provider: 'BINANCE', symbol }, orderBy: { closeTime: 'desc' }, select: { close: true, closeTime: true } });
  if (!snapshot || new Decimal(snapshot.close).lte(0)) throw new Error('LIVE_MARKET_PRICE_UNAVAILABLE');
  assertFreshMarketData(snapshot.closeTime);
  return snapshot.close.toString();
}
async function isBlocked(database: PrismaClient, userId: string, botId: string): Promise<boolean> {
  return (await database.killSwitchState.findFirst({ where: { active: true, OR: [{ scope: 'SYSTEM', targetId: 'global' }, { scope: 'USER', targetId: userId }, { scope: 'BOT', targetId: botId }] }, select: { id: true } })) !== null;
}
async function record(database: PrismaClient, botId: string, correlationId: string, type: string, payload: object) {
  await database.botEvent.create({ data: { botId, type, payload } });
  await recordAudit(database, botId, correlationId, 'EXCHANGE_EVENT', payload);
}
async function recordAudit(database: PrismaClient, botId: string, correlationId: string, eventType: 'ORDER_REQUEST' | 'ORDER_RESULT' | 'EXCHANGE_EVENT', payload: object) {
  await database.auditLog.create({ data: { botId, correlationId, eventType, payload } });
}
function inferQuoteAsset(symbol: string): string {
  const quote = ['USDT', 'USDC', 'BUSD', 'BTC', 'ETH'].find((asset) => symbol.endsWith(asset));
  if (!quote) throw new Error('LIVE_SYMBOL_QUOTE_UNKNOWN');
  return quote;
}

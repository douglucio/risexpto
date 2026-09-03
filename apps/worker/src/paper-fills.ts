import type { PrismaClient } from '@risexpto/database';

export type PaperFillInput = {
  orderId: string;
  externalTradeId: string;
  quantity: number;
  price: number;
  fee?: number;
  feeAsset?: string;
};

export async function applyPaperFill(database: PrismaClient, input: PaperFillInput) {
  if (!input.externalTradeId || input.quantity <= 0 || input.price <= 0)
    throw new Error('Invalid paper fill');
  return database.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: input.orderId }, include: { trades: true } });
    if (!order || order.tradingMode !== 'PAPER') throw new Error('PAPER_ORDER_NOT_FOUND');
    const duplicate = order.trades.find((trade) => trade.externalTradeId === input.externalTradeId);
    if (duplicate) return order;
    if (['CANCELED', 'REJECTED', 'UNKNOWN', 'FILLED'].includes(order.status))
      throw new Error('PAPER_ORDER_NOT_FILLABLE');
    const requested = Number(order.requestedQuantity ?? 0);
    const filled = Number(order.filledQuantity) + input.quantity;
    if (requested > 0 && filled > requested + 1e-12) throw new Error('PAPER_FILL_EXCEEDS_ORDER');
    const totalValue = Number(order.filledQuantity) * Number(order.averageFillPrice ?? 0) + input.quantity * input.price;
    const average = filled > 0 ? totalValue / filled : input.price;
    const nextStatus = requested > 0 && filled >= requested - 1e-12 ? 'FILLED' : 'PARTIALLY_FILLED';
    await applyFillBalancesAndPosition(tx, order, input);
    await tx.trade.create({ data: {
      orderId: order.id, externalTradeId: input.externalTradeId, quantity: input.quantity,
      price: input.price, fee: input.fee ?? 0, feeAsset: input.feeAsset ?? null, executedAt: new Date(),
    } });
    const updated = await tx.order.update({ where: { id: order.id }, data: {
      filledQuantity: filled, averageFillPrice: average, status: nextStatus,
      completedAt: nextStatus === 'FILLED' ? new Date() : null,
    } });
    await tx.botEvent.create({ data: {
      botId: order.botId, type: nextStatus === 'FILLED' ? 'PAPER_ORDER_FILLED' : 'PAPER_ORDER_PARTIALLY_FILLED',
      payload: { orderId: order.id, tradeId: input.externalTradeId, filledQuantity: String(filled) },
    } });
    return updated;
  });
}

async function applyFillBalancesAndPosition(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
  order: { id: string; botId: string; symbol: string; side: 'BUY' | 'SELL' },
  fill: PaperFillInput,
) {
  const quote = quoteAsset(order.symbol);
  const base = order.symbol.slice(0, -quote.length);
  const value = fill.quantity * fill.price;
  const fee = fill.fee ?? 0;
  if (order.side === 'BUY') {
    const spent = await tx.paperBalance.updateMany({
      where: { botId: order.botId, asset: quote, free: { gte: value + fee } },
      data: { free: { decrement: value + fee } },
    });
    if (spent.count !== 1) throw new Error('PAPER_INSUFFICIENT_BALANCE');
    await tx.paperBalance.upsert({
      where: { botId_asset: { botId: order.botId, asset: base } },
      create: { botId: order.botId, asset: base, free: fill.quantity },
      update: { free: { increment: fill.quantity } },
    });
    const position = await tx.position.findFirst({ where: { botId: order.botId, symbol: order.symbol, tradingMode: 'PAPER', status: 'OPEN' } });
    if (position) {
      const nextQuantity = Number(position.quantity) + fill.quantity;
      await tx.position.update({ where: { id: position.id }, data: {
        quantity: nextQuantity, averagePrice: (Number(position.averagePrice) * Number(position.quantity) + value) / nextQuantity,
      } });
    } else {
      await tx.position.create({ data: { botId: order.botId, tradingMode: 'PAPER', symbol: order.symbol, status: 'OPEN', quantity: fill.quantity, averagePrice: fill.price, realizedPnl: 0, openedAt: new Date() } });
    }
    return;
  }
  const sold = await tx.paperBalance.updateMany({
    where: { botId: order.botId, asset: base, free: { gte: fill.quantity } },
    data: { free: { decrement: fill.quantity } },
  });
  if (sold.count !== 1) throw new Error('PAPER_INSUFFICIENT_BALANCE');
  await tx.paperBalance.upsert({
    where: { botId_asset: { botId: order.botId, asset: quote } },
    create: { botId: order.botId, asset: quote, free: value - fee },
    update: { free: { increment: value - fee } },
  });
  const position = await tx.position.findFirst({ where: { botId: order.botId, symbol: order.symbol, tradingMode: 'PAPER', status: 'OPEN' } });
  if (!position || Number(position.quantity) < fill.quantity) throw new Error('PAPER_INSUFFICIENT_POSITION');
  const remaining = Number(position.quantity) - fill.quantity;
  await tx.position.update({ where: { id: position.id }, data: {
    quantity: remaining, realizedPnl: { increment: (fill.price - Number(position.averagePrice)) * fill.quantity - fee },
    status: remaining === 0 ? 'CLOSED' : 'OPEN', closedAt: remaining === 0 ? new Date() : null,
  } });
}

function quoteAsset(symbol: string): string {
  const quote = ['USDT', 'USDC', 'BUSD', 'BTC', 'ETH'].find((asset) => symbol.endsWith(asset));
  if (!quote) throw new Error('PAPER_SYMBOL_QUOTE_UNKNOWN');
  return quote;
}

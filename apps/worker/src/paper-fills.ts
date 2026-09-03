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

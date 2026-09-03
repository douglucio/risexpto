import type { PrismaClient } from '@risexpto/database';

export async function reconcilePaperOrders(database: PrismaClient): Promise<number> {
  const orders = await database.order.findMany({
    where: { tradingMode: 'PAPER', status: { in: ['PARTIALLY_FILLED', 'FILLED'] } },
    include: { trades: { select: { quantity: true } } },
  });
  let divergences = 0;
  for (const order of orders) {
    const observed = order.trades.reduce((sum, trade) => sum + Number(trade.quantity), 0);
    const expected = Number(order.filledQuantity);
    if (Math.abs(observed - expected) < 1e-12) continue;
    divergences += 1;
    await database.$transaction([
      database.order.update({ where: { id: order.id }, data: { status: 'UNKNOWN' } }),
      database.bot.update({ where: { id: order.botId }, data: { status: 'RISK_BLOCKED' } }),
      database.botEvent.create({
        data: { botId: order.botId, type: 'RECONCILIATION_DIVERGENCE', payload: {
          orderId: order.id, expectedFilledQuantity: String(order.filledQuantity), observedFilledQuantity: String(observed),
        } },
      }),
    ]);
  }
  return divergences;
}

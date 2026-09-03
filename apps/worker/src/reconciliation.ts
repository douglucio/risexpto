import { Decimal } from 'decimal.js';
import type { PrismaClient } from '@risexpto/database';

export async function reconcilePaperOrders(database: PrismaClient): Promise<number> {
  const orders = await database.order.findMany({
    where: { tradingMode: 'PAPER', status: { in: ['PARTIALLY_FILLED', 'FILLED'] } },
    include: { trades: { select: { quantity: true } } },
  });
  let divergences = 0;
  for (const order of orders) {
    const observed = order.trades.reduce((sum, trade) => sum.plus(trade.quantity), new Decimal(0));
    const expected = new Decimal(order.filledQuantity);
    if (observed.eq(expected)) continue;
    divergences += 1;
    await database.$transaction([
      database.order.update({ where: { id: order.id }, data: { status: 'UNKNOWN' } }),
      database.bot.update({ where: { id: order.botId }, data: { status: 'RISK_BLOCKED' } }),
      database.botEvent.create({
        data: { botId: order.botId, type: 'RECONCILIATION_DIVERGENCE', payload: {
          orderId: order.id, expectedFilledQuantity: expected.toString(), observedFilledQuantity: observed.toString(),
        } },
      }),
    ]);
  }
  return divergences;
}

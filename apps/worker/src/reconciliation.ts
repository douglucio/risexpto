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

export async function recoverOrphanedReservations(database: PrismaClient, now = Date.now()): Promise<number> {
  const cutoff = new Date(now - 5 * 60_000);
  const reservations = await database.paperCapitalReservation.findMany({
    where: { status: 'ACTIVE', createdAt: { lt: cutoff } },
    include: { proposal: { select: { order: { select: { id: true } } } } },
  });
  for (const reservation of reservations) {
    if (reservation.proposal.order) continue;
    await database.$transaction([
      database.paperCapitalReservation.updateMany({ where: { id: reservation.id, status: 'ACTIVE' }, data: { status: 'RELEASED' } }),
      database.paperCapitalAllocation.updateMany({ where: { botId: reservation.botId, allocated: { gte: reservation.amount } }, data: { allocated: { decrement: reservation.amount } } }),
      database.botEvent.create({ data: { botId: reservation.botId, type: 'CAPITAL_RESERVATION_RELEASED', payload: { reservationId: reservation.id, reason: 'ORPHANED' } } }),
    ]);
  }
  return reservations.filter((reservation) => !reservation.proposal.order).length;
}

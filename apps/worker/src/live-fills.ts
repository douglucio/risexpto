import { Decimal } from 'decimal.js';
import type { PrismaClient } from '@risexpto/database';
import type { BinanceTradeFill } from '@risexpto/binance-connection';

export async function persistLiveFills(
  database: PrismaClient,
  orderId: string,
  fills: BinanceTradeFill[],
): Promise<number> {
  if (fills.length === 0) return 0;
  return database.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { trades: true } });
    if (!order || order.tradingMode !== 'LIVE') throw new Error('LIVE_ORDER_NOT_FOUND');
    let added = 0;
    for (const fill of fills) {
      const externalTradeId = String(fill.id);
      if (order.trades.some((trade) => trade.externalTradeId === externalTradeId)) continue;
      const quantity = new Decimal(fill.qty);
      const price = new Decimal(fill.price);
      const fee = new Decimal(fill.commission);
      const realizedPnl = await applyPosition(tx, order, quantity, price, fee);
      await tx.trade.create({
        data: {
          orderId,
          externalTradeId,
          quantity: quantity.toString(),
          price: price.toString(),
          fee: fee.toString(),
          feeAsset: fill.commissionAsset,
          realizedPnl: realizedPnl.toString(),
          executedAt: new Date(fill.time),
        },
      });
      order.trades.push({
        id: externalTradeId,
        orderId,
        externalTradeId,
        quantity,
        price,
        fee,
        feeAsset: fill.commissionAsset,
        realizedPnl,
        executedAt: new Date(fill.time),
        createdAt: new Date(),
      });
      added += 1;
    }
    if (added > 0) {
      const filled = order.trades.reduce(
        (sum, trade) => sum.plus(new Decimal(trade.quantity)),
        new Decimal(0),
      );
      const value = order.trades.reduce(
        (sum, trade) => sum.plus(new Decimal(trade.quantity).times(trade.price)),
        new Decimal(0),
      );
      await tx.order.update({
        where: { id: orderId },
        data: {
          filledQuantity: filled.toString(),
          averageFillPrice: filled.gt(0) ? value.dividedBy(filled).toString() : null,
        },
      });
    }
    return added;
  });
}

async function applyPosition(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
  order: { botId: string; symbol: string; side: 'BUY' | 'SELL' },
  quantity: Decimal,
  price: Decimal,
  fee: Decimal,
): Promise<Decimal> {
  const position = await tx.position.findFirst({
    where: { botId: order.botId, symbol: order.symbol, tradingMode: 'LIVE', status: 'OPEN' },
  });
  if (order.side === 'BUY') {
    if (!position) {
      await tx.position.create({
        data: {
          botId: order.botId,
          tradingMode: 'LIVE',
          symbol: order.symbol,
          status: 'OPEN',
          quantity: quantity.toString(),
          averagePrice: price.toString(),
          realizedPnl: 0,
          openedAt: new Date(),
        },
      });
    } else {
      const nextQuantity = new Decimal(position.quantity).plus(quantity);
      const average = new Decimal(position.averagePrice)
        .times(position.quantity)
        .plus(price.times(quantity))
        .dividedBy(nextQuantity);
      await tx.position.update({
        where: { id: position.id },
        data: { quantity: nextQuantity.toString(), averagePrice: average.toString() },
      });
    }
    return new Decimal(0);
  }
  if (!position || new Decimal(position.quantity).lt(quantity))
    throw new Error('LIVE_INSUFFICIENT_POSITION');
  const realized = price.minus(position.averagePrice).times(quantity).minus(fee);
  const remaining = new Decimal(position.quantity).minus(quantity);
  await tx.position.update({
    where: { id: position.id },
    data: {
      quantity: remaining.toString(),
      realizedPnl: { increment: realized.toString() },
      status: remaining.isZero() ? 'CLOSED' : 'OPEN',
      closedAt: remaining.isZero() ? new Date() : null,
    },
  });
  return realized;
}

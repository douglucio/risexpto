import { Decimal } from 'decimal.js';
import type { PrismaClient } from '@risexpto/database';

export type PaperFillInput = {
  orderId: string;
  externalTradeId: string;
  quantity: number;
  price: number;
  fee?: number;
  feeAsset?: string;
};

export type PaperPositionState = {
  quantity: Decimal;
  averagePrice: Decimal;
  realizedPnl: Decimal;
};

export function applySpotPositionFill(
  state: PaperPositionState,
  side: 'BUY' | 'SELL',
  quantity: Decimal.Value,
  price: Decimal.Value,
  fee: Decimal.Value = 0,
): PaperPositionState {
  const fillQuantity = new Decimal(quantity);
  const fillPrice = new Decimal(price);
  const fillFee = new Decimal(fee);
  if (fillQuantity.lte(0) || fillPrice.lte(0)) throw new Error('Invalid paper fill');
  if (side === 'BUY') {
    const nextQuantity = state.quantity.plus(fillQuantity);
    return {
      quantity: nextQuantity,
      averagePrice: state.averagePrice.times(state.quantity).plus(fillQuantity.times(fillPrice)).dividedBy(nextQuantity),
      realizedPnl: state.realizedPnl,
    };
  }
  if (state.quantity.lessThan(fillQuantity)) throw new Error('PAPER_INSUFFICIENT_POSITION');
  const remaining = state.quantity.minus(fillQuantity);
  return {
    quantity: remaining,
    averagePrice: remaining.isZero() ? new Decimal(0) : state.averagePrice,
    realizedPnl: state.realizedPnl.plus(fillPrice.minus(state.averagePrice).times(fillQuantity).minus(fillFee)),
  };
}

export async function applyPaperFill(database: PrismaClient, input: PaperFillInput) {
  if (
    !input.externalTradeId ||
    !Number.isFinite(input.quantity) ||
    !Number.isFinite(input.price) ||
    input.quantity <= 0 ||
    input.price <= 0
  )
    throw new Error('Invalid paper fill');
  return database.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: { trades: true },
    });
    if (!order || order.tradingMode !== 'PAPER') throw new Error('PAPER_ORDER_NOT_FOUND');
    const duplicate = order.trades.find((trade) => trade.externalTradeId === input.externalTradeId);
    if (duplicate) return order;
    if (['CANCELED', 'REJECTED', 'UNKNOWN', 'FILLED'].includes(order.status))
      throw new Error('PAPER_ORDER_NOT_FILLABLE');
    const requested = new Decimal(order.requestedQuantity ?? 0);
    const quantity = new Decimal(input.quantity);
    const price = new Decimal(input.price);
    const previousFilled = new Decimal(order.filledQuantity);
    const filled = previousFilled.plus(quantity);
    if (requested.greaterThan(0) && filled.greaterThan(requested))
      throw new Error('PAPER_FILL_EXCEEDS_ORDER');
    const totalValue = previousFilled
      .times(order.averageFillPrice ?? 0)
      .plus(quantity.times(price));
    const average = filled.greaterThan(0) ? totalValue.dividedBy(filled) : price;
    const nextStatus =
      requested.greaterThan(0) && filled.greaterThanOrEqualTo(requested)
        ? 'FILLED'
        : 'PARTIALLY_FILLED';
    const realizedPnl = await applyFillBalancesAndPosition(tx, order, input);
    await tx.trade.create({
      data: {
        orderId: order.id,
        externalTradeId: input.externalTradeId,
        quantity,
        price,
        fee: input.fee ?? 0,
        feeAsset: input.feeAsset ?? null,
        realizedPnl,
        executedAt: new Date(),
      },
    });
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        filledQuantity: filled,
        averageFillPrice: average,
        status: nextStatus,
        completedAt: nextStatus === 'FILLED' ? new Date() : null,
      },
    });
    await tx.botEvent.create({
      data: {
        botId: order.botId,
        type: nextStatus === 'FILLED' ? 'PAPER_ORDER_FILLED' : 'PAPER_ORDER_PARTIALLY_FILLED',
        payload: {
          orderId: order.id,
          tradeId: input.externalTradeId,
          filledQuantity: filled.toString(),
        },
      },
    });
    return updated;
  });
}

async function applyFillBalancesAndPosition(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
  order: { id: string; botId: string; symbol: string; side: 'BUY' | 'SELL' },
  fill: PaperFillInput,
): Promise<Decimal> {
  const quote = quoteAsset(order.symbol);
  const base = order.symbol.slice(0, -quote.length);
  const quantity = new Decimal(fill.quantity);
  const price = new Decimal(fill.price);
  const value = quantity.times(price);
  const fee = new Decimal(fill.fee ?? 0);
  if (order.side === 'BUY') {
    const spent = await tx.paperBalance.updateMany({
      where: { botId: order.botId, asset: quote, free: { gte: value.plus(fee) } },
      data: { free: { decrement: value.plus(fee) } },
    });
    if (spent.count !== 1) throw new Error('PAPER_INSUFFICIENT_BALANCE');
    await tx.paperBalance.upsert({
      where: { botId_asset: { botId: order.botId, asset: base } },
      create: { botId: order.botId, asset: base, free: quantity },
      update: { free: { increment: quantity } },
    });
    const position = await tx.position.findFirst({
      where: { botId: order.botId, symbol: order.symbol, tradingMode: 'PAPER', status: 'OPEN' },
    });
    if (position) {
      const next = applySpotPositionFill({ quantity: new Decimal(position.quantity), averagePrice: new Decimal(position.averagePrice), realizedPnl: new Decimal(position.realizedPnl) }, 'BUY', quantity, price);
      await tx.position.update({
        where: { id: position.id },
        data: {
          quantity: next.quantity,
          averagePrice: next.averagePrice,
        },
      });
    } else {
      await tx.position.create({
        data: {
          botId: order.botId,
          tradingMode: 'PAPER',
          symbol: order.symbol,
          status: 'OPEN',
          quantity: fill.quantity,
          averagePrice: fill.price,
          realizedPnl: 0,
          openedAt: new Date(),
        },
      });
    }
    return new Decimal(0);
  }
  const sold = await tx.paperBalance.updateMany({
    where: { botId: order.botId, asset: base, free: { gte: fill.quantity } },
    data: { free: { decrement: fill.quantity } },
  });
  if (sold.count !== 1) throw new Error('PAPER_INSUFFICIENT_BALANCE');
  await tx.paperBalance.upsert({
    where: { botId_asset: { botId: order.botId, asset: quote } },
    create: { botId: order.botId, asset: quote, free: value.minus(fee) },
    update: { free: { increment: value.minus(fee) } },
  });
  const position = await tx.position.findFirst({
    where: { botId: order.botId, symbol: order.symbol, tradingMode: 'PAPER', status: 'OPEN' },
  });
  if (!position || new Decimal(position.quantity).lessThan(quantity))
    throw new Error('PAPER_INSUFFICIENT_POSITION');
  const next = applySpotPositionFill({ quantity: new Decimal(position.quantity), averagePrice: new Decimal(position.averagePrice), realizedPnl: new Decimal(position.realizedPnl) }, 'SELL', quantity, price, fee);
  const remaining = next.quantity;
  const realizedPnl = next.realizedPnl.minus(position.realizedPnl);
  await tx.position.update({
    where: { id: position.id },
    data: {
      quantity: next.quantity,
      averagePrice: next.averagePrice,
      realizedPnl: next.realizedPnl,
      status: remaining.isZero() ? 'CLOSED' : 'OPEN',
      closedAt: remaining.isZero() ? new Date() : null,
    },
  });
  return realizedPnl;
}

function quoteAsset(symbol: string): string {
  const quote = ['USDT', 'USDC', 'BUSD', 'BTC', 'ETH'].find((asset) => symbol.endsWith(asset));
  if (!quote) throw new Error('PAPER_SYMBOL_QUOTE_UNKNOWN');
  return quote;
}

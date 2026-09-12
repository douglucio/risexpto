import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@risexpto/database';
import { DATABASE } from '../users/user-provisioning.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Decimal } from 'decimal.js';

@Injectable()
export class TradingActivityService {
  constructor(@Inject(DATABASE) private readonly db: PrismaClient) {}

  async trades(user: AuthenticatedUser) {
    const rows = await this.db.trade.findMany({
      where: { order: { bot: { userId: applicationUserId(user) } } },
      orderBy: { executedAt: 'desc' },
      take: 100,
      include: { order: { select: { botId: true, symbol: true, side: true, tradingMode: true } } },
    });
    return rows.map((trade) => ({
      id: trade.id,
      orderId: trade.orderId,
      botId: trade.order.botId,
      symbol: trade.order.symbol,
      side: trade.order.side,
      tradingMode: trade.order.tradingMode,
      quantity: String(trade.quantity),
      price: String(trade.price),
      fee: String(trade.fee),
      feeAsset: trade.feeAsset,
      executedAt: trade.executedAt,
    }));
  }

  async positions(user: AuthenticatedUser) {
    const rows = await this.db.position.findMany({
      where: { bot: { userId: applicationUserId(user) } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return Promise.all(rows.map(async (position) => {
      const market = await this.db.marketSnapshot.findFirst({ where: { symbol: position.symbol }, orderBy: { closeTime: 'desc' }, select: { close: true } });
      const mark = new Decimal(market?.close ?? position.averagePrice);
      const unrealizedPnl = position.status === 'OPEN' ? mark.minus(position.averagePrice).times(position.quantity) : new Decimal(0);
      return {
      id: position.id,
      botId: position.botId,
      symbol: position.symbol,
      status: position.status,
      tradingMode: position.tradingMode,
      quantity: String(position.quantity),
      averagePrice: String(position.averagePrice),
      realizedPnl: String(position.realizedPnl),
      unrealizedPnl: unrealizedPnl.toString(),
      currentValue: position.status === 'OPEN' ? mark.times(position.quantity).toString() : '0',
      currentExposure: position.status === 'OPEN' ? mark.times(position.quantity).toString() : '0',
      openedAt: position.openedAt,
      closedAt: position.closedAt,
      };
    }));
  }
}

function applicationUserId(user: AuthenticatedUser): string {
  if (!user.applicationUserId) throw new Error('Application user is not provisioned');
  return user.applicationUserId;
}

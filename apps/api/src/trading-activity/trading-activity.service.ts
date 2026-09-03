import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@risexpto/database';
import { DATABASE } from '../users/user-provisioning.service';
import type { AuthenticatedUser } from '../auth/auth.types';

@Injectable()
export class TradingActivityService {
  constructor(@Inject(DATABASE) private readonly db: PrismaClient) {}

  async trades(user: AuthenticatedUser) {
    const rows = await this.db.trade.findMany({
      where: { order: { bot: { userId: applicationUserId(user) } } },
      orderBy: { executedAt: 'desc' }, take: 100,
      include: { order: { select: { botId: true, symbol: true, side: true, tradingMode: true } } },
    });
    return rows.map((trade) => ({
      id: trade.id, orderId: trade.orderId, botId: trade.order.botId, symbol: trade.order.symbol,
      side: trade.order.side, tradingMode: trade.order.tradingMode, quantity: String(trade.quantity),
      price: String(trade.price), fee: String(trade.fee), feeAsset: trade.feeAsset, executedAt: trade.executedAt,
    }));
  }

  async positions(user: AuthenticatedUser) {
    const rows = await this.db.position.findMany({
      where: { bot: { userId: applicationUserId(user) } }, orderBy: { updatedAt: 'desc' }, take: 100,
    });
    return rows.map((position) => ({
      id: position.id, botId: position.botId, symbol: position.symbol, status: position.status,
      tradingMode: position.tradingMode, quantity: String(position.quantity), averagePrice: String(position.averagePrice),
      realizedPnl: String(position.realizedPnl), openedAt: position.openedAt, closedAt: position.closedAt,
    }));
  }
}

function applicationUserId(user: AuthenticatedUser): string {
  if (!user.applicationUserId) throw new Error('Application user is not provisioned');
  return user.applicationUserId;
}

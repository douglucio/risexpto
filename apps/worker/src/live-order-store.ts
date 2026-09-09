import type { PrismaClient } from '@risexpto/database';
type LiveOrder = {
  clientOrderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity?: string;
  quoteAmount?: string;
  limitPrice?: string;
};
type ExchangeOrder = {
  clientOrderId: string;
  externalOrderId: string;
  status: 'SUBMITTED' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'UNKNOWN';
  filledQuantity: string;
};
type LiveOrderRecord = {
  request: LiveOrder;
  result: ExchangeOrder | null;
  state: 'PENDING_SUBMIT' | 'RESOLVED';
};
type LiveOrderStore = {
  find(clientOrderId: string): Promise<LiveOrderRecord | undefined>;
  createPending(record: LiveOrderRecord): Promise<LiveOrderRecord>;
  resolve(clientOrderId: string, result: ExchangeOrder): Promise<void>;
};

export type LiveOrderPersistenceContext = {
  botId: string;
  exchangeConnectionId: string;
  tradeProposalId: string;
  idempotencyKey: string;
};

export type LiveOrderContextResolver = (order: LiveOrder) => Promise<LiveOrderPersistenceContext>;

/** Prisma-backed store. A pending Order is created before the exchange submit. */
export class PrismaLiveOrderStore implements LiveOrderStore {
  constructor(
    private readonly database: PrismaClient,
    private readonly resolveContext: LiveOrderContextResolver,
  ) {}

  async find(clientOrderId: string): Promise<LiveOrderRecord | undefined> {
    const order = await this.database.order.findUnique({ where: { clientOrderId } });
    if (!order) return undefined;
    return {
      request: {
        clientOrderId: order.clientOrderId,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        ...(order.requestedQuantity !== null ? { quantity: order.requestedQuantity.toString() } : {}),
        ...(order.requestedQuoteAmount !== null ? { quoteAmount: order.requestedQuoteAmount.toString() } : {}),
        ...(order.limitPrice !== null ? { limitPrice: order.limitPrice.toString() } : {}),
      },
      result: order.externalOrderId
        ? {
            clientOrderId: order.clientOrderId,
            externalOrderId: order.externalOrderId,
            status: mapStatus(order.status),
            filledQuantity: order.filledQuantity.toString(),
          }
        : null,
      state: order.externalOrderId ? 'RESOLVED' : 'PENDING_SUBMIT',
    };
  }

  async createPending(record: LiveOrderRecord): Promise<LiveOrderRecord> {
    const context = await this.resolveContext(record.request);
    try {
      await this.database.order.create({
        data: {
          botId: context.botId,
          exchangeConnectionId: context.exchangeConnectionId,
          tradeProposalId: context.tradeProposalId,
          idempotencyKey: context.idempotencyKey,
          clientOrderId: record.request.clientOrderId,
          tradingMode: 'LIVE',
          symbol: record.request.symbol,
          side: record.request.side,
          type: record.request.type,
          status: 'CREATED',
          requestedQuantity: record.request.quantity ?? null,
          requestedQuoteAmount: record.request.quoteAmount ?? null,
          limitPrice: record.request.limitPrice ?? null,
        },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
    return (await this.find(record.request.clientOrderId)) ?? record;
  }

  async resolve(clientOrderId: string, result: ExchangeOrder): Promise<void> {
    await this.database.order.update({
      where: { clientOrderId },
      data: {
        externalOrderId: result.externalOrderId,
        status: mapStatus(result.status),
        filledQuantity: result.filledQuantity,
        submittedAt: new Date(),
        completedAt: isTerminal(result.status) ? new Date() : null,
      },
    });
  }
}

function mapStatus(status: string) {
  if (status === 'SUBMITTED') return 'SUBMITTED' as const;
  if (status === 'PARTIALLY_FILLED') return 'PARTIALLY_FILLED' as const;
  if (status === 'FILLED') return 'FILLED' as const;
  if (status === 'CANCELED') return 'CANCELED' as const;
  if (status === 'REJECTED') return 'REJECTED' as const;
  return 'UNKNOWN' as const;
}

function isTerminal(status: ExchangeOrder['status']): boolean {
  return status === 'FILLED' || status === 'CANCELED' || status === 'REJECTED';
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

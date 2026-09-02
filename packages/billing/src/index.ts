import { createHmac, timingSafeEqual } from 'node:crypto';

export type Plan = {
  key: string;
  maxBots: number;
  maxMonthlyBacktests: number;
  liveTrading: boolean;
};
export type SubscriptionStatus =
  | 'INCOMPLETE'
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'UNPAID';
export type Entitlement = Plan & {
  userId: string;
  status: SubscriptionStatus;
  graceUntil: number | null;
};
export type BillingProvider = {
  createCustomer(userId: string, email: string): Promise<string>;
  checkout(customerId: string, priceId: string): Promise<string>;
  portal(customerId: string): Promise<string>;
};
export type BillingEvent = {
  id: string;
  type: string;
  userId: string;
  status: SubscriptionStatus;
  plan: Plan['key'];
  createdAt: number;
};
export class MockStripeProvider implements BillingProvider {
  async createCustomer(userId: string): Promise<string> {
    await Promise.resolve();
    return `cus_mock_${userId}`;
  }
  async checkout(customerId: string, priceId: string): Promise<string> {
    await Promise.resolve();
    return `checkout_mock_${customerId}_${priceId}`;
  }
  async portal(customerId: string): Promise<string> {
    await Promise.resolve();
    return `portal_mock_${customerId}`;
  }
}
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  return left.length === right.length && timingSafeEqual(left, right);
}
export class BillingService {
  private readonly processed = new Set<string>();
  private readonly entitlements = new Map<string, Entitlement>();
  private readonly events: BillingEvent[] = [];
  constructor(private readonly now: () => number = Date.now) {}
  async handleWebhook(
    eventId: string,
    type: string,
    userId: string,
    plan: Plan,
    status: SubscriptionStatus,
    graceUntil: number | null = null,
  ): Promise<BillingEvent | null> {
    if (this.processed.has(eventId)) return null;
    if (!userId || plan.maxBots < 0 || plan.maxMonthlyBacktests < 0)
      throw new Error('Invalid billing event');
    const event = { id: eventId, type, userId, plan: plan.key, status, createdAt: this.now() };
    this.processed.add(eventId);
    this.events.push(event);
    this.entitlements.set(userId, { ...plan, userId, status, graceUntil });
    await Promise.resolve();
    return { ...event };
  }
  entitlement(userId: string): Entitlement | null {
    const value = this.entitlements.get(userId);
    return value ? { ...value } : null;
  }
  can(userId: string, capability: 'LIVE_TRADING' | 'BOT' | 'BACKTEST', usage = 0): boolean {
    const value = this.entitlements.get(userId);
    if (
      !value ||
      (!['ACTIVE', 'TRIALING'].includes(value.status) &&
        !(value.status === 'PAST_DUE' && (value.graceUntil ?? 0) > this.now()))
    )
      return false;
    return capability === 'LIVE_TRADING'
      ? value.liveTrading
      : capability === 'BOT'
        ? usage < value.maxBots
        : usage < value.maxMonthlyBacktests;
  }
  history(userId: string): BillingEvent[] {
    return this.events.filter((event) => event.userId === userId).map((event) => ({ ...event }));
  }
}

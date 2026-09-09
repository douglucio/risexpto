import { createHmac, timingSafeEqual } from 'node:crypto';
import Stripe from 'stripe';

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
  async createCustomer(userId: string, email: string): Promise<string> {
    void email;
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

/** Stripe adapter restricted to Test Mode. Live keys are rejected at construction. */
export class StripeTestProvider implements BillingProvider {
  private readonly stripe: Stripe;

  constructor(secretKey = process.env.STRIPE_SECRET_KEY) {
    if (!secretKey?.startsWith('sk_test_'))
      throw new Error('Stripe Test Mode requires STRIPE_SECRET_KEY starting with sk_test_');
    this.stripe = new Stripe(secretKey);
  }

  async createCustomer(userId: string, email: string): Promise<string> {
    const customer = await this.stripe.customers.create({ email, metadata: { riseXpToUserId: userId } });
    return customer.id;
  }

  async checkout(customerId: string, priceId: string): Promise<string> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription', customer: customerId, line_items: [{ price: priceId, quantity: 1 }],
      success_url: requiredUrl('STRIPE_CHECKOUT_SUCCESS_URL'),
      cancel_url: requiredUrl('STRIPE_CHECKOUT_CANCEL_URL'),
    });
    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return session.url;
  }

  async portal(customerId: string): Promise<string> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId, return_url: requiredUrl('STRIPE_PORTAL_RETURN_URL'),
    });
    return session.url;
  }

  constructWebhookEvent(payload: string | Buffer, signature: string, webhookSecret: string): Stripe.Event {
    if (!webhookSecret.trim()) throw new Error('STRIPE_WEBHOOK_SECRET is required for Stripe Test Mode');
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}

function requiredUrl(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for Stripe Test Mode`);
  return value;
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

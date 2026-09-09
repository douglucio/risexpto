import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { StripeTestProvider } from '@risexpto/billing';
import type Stripe from 'stripe';
import type { Prisma, PrismaClient } from '@risexpto/database';
import { DATABASE } from '../users/user-provisioning.service';
import type { AuthenticatedUser } from '../auth/auth.types';

@Injectable()
export class BillingService {
  private stripeProvider: StripeTestProvider | null = null;

  constructor(@Inject(DATABASE) private readonly db: PrismaClient) {}

  async billing(user: AuthenticatedUser) {
    const userId = applicationUserId(user);
    const subscription = await this.db.subscription.findFirst({
      where: { userId }, orderBy: { createdAt: 'desc' }, include: { plan: { include: { entitlements: true } } },
    });
    return { mode: 'TEST', subscription: subscription ? {
      status: subscription.status, plan: subscription.plan.key,
      currentPeriodEnd: subscription.currentPeriodEnd, cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      entitlements: Object.fromEntries(subscription.plan.entitlements.map((item) => [item.key, item.value])),
    } : null };
  }

  async assertCanCreateBot(user: AuthenticatedUser): Promise<void> {
    const userId = applicationUserId(user);
    const subscription = await this.db.subscription.findFirst({ where: { userId, status: { in: ['ACTIVE', 'TRIALING'] } }, orderBy: { createdAt: 'desc' }, include: { plan: { include: { entitlements: true } } } });
    const maxBots = subscription?.plan.entitlements.find((item) => item.key === 'maxBots')?.value;
    const limit = typeof maxBots === 'number' ? maxBots : null;
    if (!subscription || limit === null) throw new BadRequestException('An active plan is required to create a bot');
    const count = await this.db.bot.count({ where: { userId, archivedAt: null } });
    if (count >= limit) throw new BadRequestException('Bot limit reached for the current plan');
  }

  async checkout(user: AuthenticatedUser, body: Record<string, unknown>) {
    const userId = applicationUserId(user);
    const planKey = text(body.planKey, 'planKey').toUpperCase();
    const priceId = process.env[`STRIPE_TEST_PRICE_${planKey}`]?.trim();
    if (!['STARTER', 'PRO'].includes(planKey) || !priceId) throw new BadRequestException('A configured Stripe Test price is required');
    const customer = await this.db.billingCustomer.findUnique({ where: { userId } });
    const providerCustomerId = customer?.providerCustomerId ?? await this.stripe().createCustomer(userId, user.email);
    if (!customer) await this.db.billingCustomer.create({ data: { userId, providerCustomerId } });
    return { mode: 'TEST', url: await this.stripe().checkout(providerCustomerId, priceId) };
  }

  async portal(user: AuthenticatedUser) {
    const customer = await this.db.billingCustomer.findUnique({ where: { userId: applicationUserId(user) } });
    if (!customer) throw new BadRequestException('No Stripe customer exists yet');
    return { mode: 'TEST', url: await this.stripe().portal(customer.providerCustomerId) };
  }

  async webhook(rawBody: Buffer, signature: string) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!secret) throw new ServiceUnavailableException('Stripe Test webhook is not configured');
    let event: Stripe.Event;
    try { event = this.stripe().constructWebhookEvent(rawBody, signature, secret); }
    catch { throw new BadRequestException('Invalid Stripe webhook signature'); }
    const existing = await this.db.billingWebhookEvent.findUnique({ where: { providerId: event.id }, select: { id: true } });
    if (existing) return { received: true, duplicate: true };
    try {
      await this.db.$transaction(async (tx) => {
        await tx.billingWebhookEvent.create({ data: { provider: 'STRIPE_TEST', providerId: event.id, type: event.type, payload: event as unknown as Prisma.InputJsonValue } });
        await this.applySubscriptionEvent(tx, event);
      });
    } catch (error) {
      if (isUniqueViolation(error)) return { received: true, duplicate: true };
      throw error;
    }
    return { received: true, duplicate: false };
  }

  private async applySubscriptionEvent(db: Prisma.TransactionClient, event: Stripe.Event) {
    const object = event.data.object as unknown as StripeSubscriptionPayload;
    if (!('customer' in object) || typeof object.customer !== 'string') return;
    const customer = await db.billingCustomer.findUnique({ where: { providerCustomerId: object.customer } });
    if (!customer) return;
    const priceId = object.items?.data[0]?.price.id;
    const planKey = planForPrice(priceId);
    if (!planKey) return;
    const plan = await db.plan.findUnique({ where: { key: planKey } });
    if (!plan) return;
    const status = event.type.endsWith('.deleted') ? 'CANCELED' : mapStatus(object.status);
    const periodEnd = numberValue(object.current_period_end);
    await db.subscription.upsert({
      where: { providerSubscriptionId: object.id },
      create: { userId: customer.userId, planId: plan.id, providerSubscriptionId: object.id, status, currentPeriodStart: dateFromSeconds(object.start_date), currentPeriodEnd: dateFromSeconds(periodEnd), cancelAtPeriodEnd: object.cancel_at_period_end },
      update: { planId: plan.id, status, cancelAtPeriodEnd: object.cancel_at_period_end, canceledAt: status === 'CANCELED' ? new Date() : null },
    });
  }

  private stripe(): StripeTestProvider {
    return this.stripeProvider ??= new StripeTestProvider();
  }
}

function applicationUserId(user: AuthenticatedUser): string { if (!user.applicationUserId) throw new ServiceUnavailableException('User is not provisioned'); return user.applicationUserId; }
function text(value: unknown, name: string): string { if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${name} is required`); return value.trim(); }
function planForPrice(priceId: string | undefined): string | null { if (!priceId) return null; return ['STARTER', 'PRO'].find((key) => process.env[`STRIPE_TEST_PRICE_${key}`] === priceId) ?? null; }
function dateFromSeconds(value: unknown): Date | null { const seconds = numberValue(value); return seconds ? new Date(seconds * 1000) : null; }
type StripeSubscriptionPayload = { id: string; status: string; customer?: string | { id: string }; items?: { data: Array<{ price: { id: string } }> }; start_date?: unknown; current_period_end?: unknown; cancel_at_period_end: boolean };
function numberValue(value: unknown): number | null { return typeof value === 'number' && Number.isFinite(value) ? value : null; }
function mapStatus(status: string): 'INCOMPLETE' | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' {
  if (status === 'trialing' || status === 'active' || status === 'past_due' || status === 'canceled' || status === 'unpaid' || status === 'incomplete') return status.toUpperCase() as ReturnType<typeof mapStatus>;
  return 'INCOMPLETE';
}
function isUniqueViolation(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002'; }

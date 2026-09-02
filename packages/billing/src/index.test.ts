import { describe, expect, it } from 'vitest';
import { BillingService, verifyWebhookSignature, type Plan } from './index.js';
const plan: Plan = { key: 'pro', maxBots: 3, maxMonthlyBacktests: 10, liveTrading: true };
describe('billing service', () => {
  it('processes idempotent webhook subscriptions and internal entitlements', async () => {
    const billing = new BillingService(() => 100);
    expect(
      await billing.handleWebhook('evt-1', 'subscription.updated', 'u1', plan, 'ACTIVE'),
    ).toMatchObject({ id: 'evt-1' });
    expect(
      await billing.handleWebhook('evt-1', 'subscription.updated', 'u1', plan, 'ACTIVE'),
    ).toBeNull();
    expect(billing.can('u1', 'LIVE_TRADING')).toBe(true);
    expect(billing.can('u1', 'BOT', 3)).toBe(false);
  });
  it('supports past due grace and validates HMAC signatures', async () => {
    const billing = new BillingService(() => 100);
    await billing.handleWebhook('evt-2', 'invoice.failed', 'u2', plan, 'PAST_DUE', 200);
    expect(billing.can('u2', 'BOT')).toBe(true);
    expect(billing.can('u2', 'BOT', 3)).toBe(false);
    expect(verifyWebhookSignature('payload', 'bad', 'secret')).toBe(false);
  });
});

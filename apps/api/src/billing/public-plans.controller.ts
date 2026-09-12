import { Controller, Get, Inject } from '@nestjs/common';
import type { PrismaClient } from '@risexpto/database';
import { Public } from '../auth/auth.decorators';
import { DATABASE } from '../users/user-provisioning.service';

@Public()
@Controller('public/plans')
export class PublicPlansController {
  constructor(@Inject(DATABASE) private readonly db: PrismaClient) {}

  @Get()
  async list() {
    const plans = await this.db.plan.findMany({
      where: { active: true },
      orderBy: { key: 'asc' },
      include: { entitlements: true },
    });
    return plans.map((plan) => ({
      plan: plan.key,
      displayName: plan.name,
      monthlyPrice: Number(process.env[`STRIPE_TEST_PRICE_${plan.key}_AMOUNT`] ?? ({ FREE: 0, STARTER: 20, PRO: 50, ADVANCED: 100 } as Record<string, number>)[plan.key] ?? 0),
      currency: process.env.STRIPE_TEST_PRICE_CURRENCY ?? 'USD',
      features: plan.entitlements.map((item) => item.key),
      limits: Object.fromEntries(plan.entitlements.map((item) => [item.key, item.value])),
      recommended: plan.key === 'STARTER',
    }));
  }
}

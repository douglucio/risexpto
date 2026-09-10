import { loadRootEnv } from './root-env.mjs';

loadRootEnv();
if (process.env.NODE_ENV !== 'development') {
  throw new Error('dev:grant-plan is available only when NODE_ENV=development');
}

const [emailArgument, planArgument = 'STARTER'] = process.argv.slice(2);
const email = emailArgument?.trim().toLowerCase();
const planKey = planArgument.trim().toUpperCase();
if (!email || !email.includes('@'))
  throw new Error('Usage: pnpm dev:grant-plan <email> [STARTER|PRO]');
if (!['STARTER', 'PRO'].includes(planKey))
  throw new Error('Development plan must be STARTER or PRO');
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const { createDatabaseClient } = await import('@risexpto/database');

const db = createDatabaseClient(databaseUrl);
try {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) throw new Error(`No local user found for ${email}`);
  const plan = await db.plan.findUnique({
    where: { key: planKey },
    select: { id: true, key: true },
  });
  if (!plan) throw new Error(`Plan ${planKey} was not found; run pnpm db:setup first`);
  const providerSubscriptionId = `dev_local_${user.id}`;
  const subscription = await db.subscription.upsert({
    where: { providerSubscriptionId },
    update: { planId: plan.id, status: 'ACTIVE', cancelAtPeriodEnd: false, canceledAt: null },
    create: { userId: user.id, planId: plan.id, providerSubscriptionId, status: 'ACTIVE' },
    select: { id: true, status: true, plan: { select: { key: true } } },
  });
  console.log(
    JSON.stringify({
      email: user.email,
      plan: subscription.plan.key,
      status: subscription.status,
      source: 'development-local-grant',
      stripe: false,
    }),
  );
} finally {
  await db.$disconnect();
}

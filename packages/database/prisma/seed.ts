import { createDatabaseClient } from '../src/index.js';
import { mvpStrategies } from '../src/seed-data.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required for seed');
const db = createDatabaseClient(connectionString);

const plans = [
  {
    key: 'STARTER',
    name: 'Starter',
    description: 'Paper Trading foundation for evaluating RiseXPTO safely.',
    entitlements: { maxBots: 1, liveTrading: false, maxMonthlyBacktests: 5 },
  },
  {
    key: 'PRO',
    name: 'Professional',
    description: 'Expanded automation limits controlled by backend entitlements.',
    entitlements: { maxBots: 10, liveTrading: true, maxMonthlyBacktests: 100 },
  },
] as const;

try {
  for (const plan of plans) {
    const stored = await db.plan.upsert({
      where: { key: plan.key },
      update: { name: plan.name, description: plan.description },
      create: { key: plan.key, name: plan.name, description: plan.description },
    });
    for (const [key, value] of Object.entries(plan.entitlements)) {
      await db.entitlement.upsert({
        where: { planId_key: { planId: stored.id, key } },
        update: { value },
        create: { planId: stored.id, key, value },
      });
    }
  }
  for (const strategy of mvpStrategies) {
    const definition = await db.strategyDefinition.upsert({
      where: { key: strategy.key },
      update: { name: strategy.name, description: strategy.description, active: true },
      create: {
        key: strategy.key,
        name: strategy.name,
        description: strategy.description,
        active: true,
      },
    });
    await db.strategyVersion.upsert({
      where: { strategyDefinitionId_version: { strategyDefinitionId: definition.id, version: 1 } },
      update: {
        parameterSchema: strategy.parameterSchema,
        implementationKey: strategy.implementationKey,
        active: true,
      },
      create: {
        strategyDefinitionId: definition.id,
        version: 1,
        parameterSchema: strategy.parameterSchema,
        implementationKey: strategy.implementationKey,
        active: true,
      },
    });
  }
} finally {
  await db.$disconnect();
}

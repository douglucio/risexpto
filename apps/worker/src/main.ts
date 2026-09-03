import { createPersistentWorker } from './queue.js';
import { createDatabaseClient } from '@risexpto/database';
import { processPaperCycle } from './paper-cycle.js';
import { reconcilePaperOrders } from './reconciliation.js';

export const workerIdentity = Object.freeze({ service: 'worker', status: 'ready' });

async function bootstrap(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  const databaseUrl = process.env.DATABASE_URL;
  if (!redisUrl) throw new Error('REDIS_URL is required for the worker');
  if (!databaseUrl) throw new Error('DATABASE_URL is required for the worker');
  const database = createDatabaseClient(databaseUrl);
  const infrastructure = await createPersistentWorker(
    redisUrl,
    process.env.WORKER_QUEUE_NAME,
    async (job) => job.data.type === 'reconcile'
      ? void await reconcilePaperOrders(database)
      : processPaperCycle(database, job),
  );
  await infrastructure.queue.upsertJobScheduler(
    'paper-reconciliation',
    { every: 60_000 },
    { name: 'reconcile', data: { type: 'reconcile' } },
  );
  console.info(JSON.stringify({ event: 'worker_started', service: 'worker', queue: process.env.WORKER_QUEUE_NAME ?? 'risexpto' }));
  const shutdown = async (signal: string) => {
    console.info(JSON.stringify({ event: 'worker_shutdown', signal }));
    await infrastructure.close();
    await database.$disconnect();
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

if (process.env.NODE_ENV !== 'test') void bootstrap();

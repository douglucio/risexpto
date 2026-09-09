import { createPersistentWorker } from './queue.js';
import { createDatabaseClient } from '@risexpto/database';
import { processPaperCycle } from './paper-cycle.js';
import { recoverOrphanedReservations, reconcilePaperOrders } from './reconciliation.js';
import { applyPaperFill } from './paper-fills.js';
import { reconcileLiveOrders } from './live-reconciliation.js';
import { submitLiveOrder } from './live-submit.js';
import { createPublicMarketDataClient, syncRunningBotMarketData } from './market-data-runtime.js';
import { schedulePaperCycles } from './paper-scheduler.js';

export const workerIdentity = Object.freeze({ service: 'worker', status: 'ready' });

async function bootstrap(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  const databaseUrl = process.env.DATABASE_URL;
  if (!redisUrl) throw new Error('REDIS_URL is required for the worker');
  if (!databaseUrl) throw new Error('DATABASE_URL is required for the worker');
  const database = createDatabaseClient(databaseUrl);
  const marketData = createPublicMarketDataClient();
  // The processor can only receive scheduler jobs after createPersistentWorker resolves.
  let infrastructure: Awaited<ReturnType<typeof createPersistentWorker>>;
  // eslint-disable-next-line prefer-const
  infrastructure = await createPersistentWorker(
    redisUrl,
    process.env.WORKER_QUEUE_NAME,
    async (job) => {
      if (job.data.type === 'reconcile') {
        await reconcilePaperOrders(database);
        await recoverOrphanedReservations(database);
      }
      else if (job.data.type === 'paper-fill' && job.data.orderId && job.data.fill)
        await applyPaperFill(database, { orderId: job.data.orderId, ...job.data.fill });
      else if (job.data.type === 'live-reconcile' && job.data.exchangeConnectionId)
        await reconcileLiveOrders(database, job.data.exchangeConnectionId);
      else if (job.data.type === 'live-submit' && job.data.orderId)
        await submitLiveOrder(database, job.data.orderId);
      else if (job.data.type === 'market-data-sync')
        await syncRunningBotMarketData(database, marketData);
      else if (job.data.type === 'paper-scheduler')
        await schedulePaperCycles(database, infrastructure.queue);
      else await processPaperCycle(database, job);
    },
  );
  await infrastructure.queue.upsertJobScheduler(
    'market-data-sync',
    { every: Number(process.env.MARKET_DATA_INTERVAL_MS ?? 60_000) },
    { name: 'market-data-sync', data: { type: 'market-data-sync' } },
  );
  await infrastructure.queue.upsertJobScheduler(
    'paper-scheduler',
    { every: Number(process.env.PAPER_SCHEDULER_INTERVAL_MS ?? 10_000) },
    { name: 'paper-scheduler', data: { type: 'paper-scheduler' } },
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

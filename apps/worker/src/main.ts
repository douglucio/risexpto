import { createPersistentWorker } from './queue.js';
import { createDatabaseClient } from '@risexpto/database';

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
    async (job) => {
      if (job.data.type !== 'bot-cycle' || !job.data.botId) return;
      const bot = await database.bot.findFirst({
        where: { id: job.data.botId, tradingMode: 'PAPER', status: 'RUNNING', archivedAt: null },
        select: { id: true },
      });
      if (!bot) return;
      await database.botEvent.create({
        data: { botId: bot.id, type: 'CYCLE_STARTED', payload: { jobId: job.id } },
      });
      await database.botEvent.create({
        data: { botId: bot.id, type: 'CYCLE_COMPLETED', payload: { jobId: job.id } },
      });
    },
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

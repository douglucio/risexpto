import { createPersistentWorker } from './queue.js';

export const workerIdentity = Object.freeze({ service: 'worker', status: 'ready' });

async function bootstrap(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error('REDIS_URL is required for the worker');
  const infrastructure = await createPersistentWorker(redisUrl, process.env.WORKER_QUEUE_NAME);
  console.info(JSON.stringify({ event: 'worker_started', service: 'worker', queue: process.env.WORKER_QUEUE_NAME ?? 'risexpto' }));
  const shutdown = async (signal: string) => {
    console.info(JSON.stringify({ event: 'worker_shutdown', signal }));
    await infrastructure.close();
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

if (process.env.NODE_ENV !== 'test') void bootstrap();

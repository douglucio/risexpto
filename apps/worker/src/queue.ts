import { Queue, QueueEvents, Worker, type Job } from 'bullmq';

export type WorkerJob = { type: 'bot-cycle' | 'reconcile'; botId?: string };
export type PersistentWorker = Readonly<{
  queue: Queue<WorkerJob>;
  worker: Worker<WorkerJob>;
  events: QueueEvents;
  close(): Promise<void>;
}>;
export type WorkerProcessor = (job: Job<WorkerJob>) => Promise<void>;

export async function createPersistentWorker(
  redisUrl: string,
  queueName = 'risexpto',
  processor?: WorkerProcessor,
): Promise<PersistentWorker> {
  const connection = redisConnection(redisUrl);
  const queue = new Queue<WorkerJob>(queueName, { connection, prefix: 'risexpto' });
  const events = new QueueEvents(queueName, { connection, prefix: 'risexpto' });
  const worker = new Worker<WorkerJob>(
    queueName,
    processor ?? ((job: Job<WorkerJob>) => {
      console.info(JSON.stringify({ event: 'worker_job_received', jobId: job.id, type: job.data.type }));
      return Promise.resolve();
    }),
    { connection, prefix: 'risexpto', concurrency: 1 },
  );
  worker.on('failed', (job, error) => {
    console.error(JSON.stringify({ event: 'worker_job_failed', jobId: job?.id, error: error.message }));
  });
  await Promise.all([queue.waitUntilReady(), events.waitUntilReady(), worker.waitUntilReady()]);
  return {
    queue,
    worker,
    events,
    async close() {
      await Promise.all([worker.close(), events.close(), queue.close()]);
    },
  };
}

function redisConnection(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    maxRetriesPerRequest: null,
  } as const;
}

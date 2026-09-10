import { Queue, QueueEvents, Worker, type ConnectionOptions, type Job } from 'bullmq';

export type WorkerJob = {
  type:
    | 'bot-cycle'
    | 'reconcile'
    | 'paper-fill'
    | 'live-reconcile'
    | 'live-submit'
    | 'market-data-sync'
    | 'paper-scheduler';
  botId?: string;
  orderId?: string;
  exchangeConnectionId?: string;
  fill?: { externalTradeId: string; quantity: number; price: number; fee?: number };
};
type WorkerName = string;
export type PersistentWorker = Readonly<{
  queue: Queue<WorkerJob, void, WorkerName>;
  worker: Worker<WorkerJob, void, WorkerName>;
  events: QueueEvents;
  close(): Promise<void>;
}>;
export type WorkerProcessor = (job: Job<WorkerJob, void, WorkerName>) => Promise<void>;

export function liveSubmitJobId(orderId: string): string {
  if (!orderId) throw new Error('orderId is required');
  return `live-submit:${orderId}`;
}

export function liveReconcileJobId(exchangeConnectionId: string): string {
  if (!exchangeConnectionId) throw new Error('exchangeConnectionId is required');
  return `live-reconcile:${exchangeConnectionId}`;
}

export function enqueueLiveSubmit(queue: Queue<WorkerJob, void, WorkerName>, orderId: string) {
  return queue.add(
    'live-submit',
    { type: 'live-submit', orderId },
    { jobId: liveSubmitJobId(orderId) },
  );
}

export function enqueueLiveReconciliation(
  queue: Queue<WorkerJob, void, WorkerName>,
  exchangeConnectionId: string,
) {
  return queue.add(
    'live-reconcile',
    { type: 'live-reconcile', exchangeConnectionId },
    { jobId: liveReconcileJobId(exchangeConnectionId) },
  );
}

export async function createPersistentWorker(
  redisUrl: string,
  queueName = 'risexpto',
  processor?: WorkerProcessor,
): Promise<PersistentWorker> {
  const connection = redisConnection(redisUrl);
  const queue = new Queue<WorkerJob, void, WorkerName>(queueName, {
    connection,
    prefix: 'risexpto',
  });
  const events = new QueueEvents(queueName, { connection, prefix: 'risexpto' });
  const worker = new Worker<WorkerJob, void, WorkerName>(
    queueName,
    processor ??
      ((job: Job<WorkerJob>) => {
        console.info(
          JSON.stringify({ event: 'worker_job_received', jobId: job.id, type: job.data.type }),
        );
        return Promise.resolve();
      }),
    { connection, prefix: 'risexpto', concurrency: 1 },
  );
  worker.on('failed', (job, error) => {
    console.error(
      JSON.stringify({ event: 'worker_job_failed', jobId: job?.id, error: error.message }),
    );
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

function redisConnection(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    maxRetriesPerRequest: null,
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
  } as const;
}

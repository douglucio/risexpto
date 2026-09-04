import {
  ConflictException,
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Queue } from 'bullmq';

type CycleJob = { type: 'bot-cycle'; botId: string };

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly queue: Queue<CycleJob> | null;
  constructor() {
    const redisUrl = process.env.REDIS_URL;
    this.queue = redisUrl
      ? new Queue<CycleJob>(process.env.WORKER_QUEUE_NAME ?? 'risexpto', {
          connection: redisConnection(redisUrl), prefix: 'risexpto',
        })
      : null;
  }
  async enqueueBotCycle(botId: string, idempotencyKey: string) {
    if (!this.queue) throw new ServiceUnavailableException('Worker queue unavailable');
    if (await this.queue.getJob(idempotencyKey)) throw new ConflictException('Cycle already queued');
    return this.queue.add('bot-cycle', { type: 'bot-cycle', botId }, {
      jobId: idempotencyKey,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: { age: 86_400, count: 10_000 },
      removeOnFail: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }
}
function redisConnection(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname, port: Number(url.port || 6379), username: url.username || undefined,
    password: url.password || undefined, db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    maxRetriesPerRequest: null,
  } as const;
}

import { describe, expect, it } from 'vitest';
import { createPersistentWorker } from './queue.js';

const redisUrl = process.env.E2E_REDIS_URL;

describe('persistent worker queue integration', () => {
  it.skipIf(!redisUrl)('persists and processes a PAPER cycle job through Redis', async () => {
    const queueName = `risexpto-e2e-${Date.now()}`;
    const processed: string[] = [];
    const infrastructure = await createPersistentWorker(redisUrl!, queueName, (job) => {
      processed.push(`${job.id}:${job.data.type}`);
      return Promise.resolve();
    });
    try {
      const completion = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timed out waiting for worker job')), 10_000);
        infrastructure.events.on('completed', ({ jobId }) => {
          if (jobId !== job.id) return;
          clearTimeout(timeout);
          resolve();
        });
        infrastructure.events.on('failed', ({ jobId, failedReason }) => {
          if (jobId !== job.id) return;
          clearTimeout(timeout);
          reject(new Error(failedReason));
        });
      });
      const job = await infrastructure.queue.add('bot-cycle', { type: 'bot-cycle', botId: 'e2e-bot' }, { jobId: 'e2e-cycle' });
      await completion;
      expect(processed).toEqual(['e2e-cycle:bot-cycle']);
      expect(await infrastructure.queue.getJob('e2e-cycle')).not.toBeNull();
    } finally {
      await infrastructure.close();
    }
  }, 15_000);

  it.skipIf(!redisUrl)('retries a failed job without losing it', async () => {
    const queueName = `risexpto-retry-e2e-${Date.now()}`;
    let attempts = 0;
    const infrastructure = await createPersistentWorker(redisUrl!, queueName, () => {
      attempts += 1;
      if (attempts === 1) return Promise.reject(new Error('simulated worker crash'));
      return Promise.resolve();
    });
    try {
      const completion = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timed out waiting for retry')), 10_000);
        infrastructure.events.on('completed', ({ jobId }) => {
          if (jobId !== 'e2e-retry') return;
          clearTimeout(timeout); resolve();
        });
      });
      await infrastructure.queue.add('bot-cycle', { type: 'bot-cycle', botId: 'e2e-bot' }, {
        jobId: 'e2e-retry', attempts: 2, backoff: { type: 'fixed', delay: 50 },
      });
      await completion;
      expect(attempts).toBe(2);
    } finally {
      await infrastructure.close();
    }
  }, 15_000);
});

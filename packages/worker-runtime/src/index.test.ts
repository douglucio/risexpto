import { describe, expect, it } from 'vitest';
import { WorkerRuntime } from './index.js';

describe('WorkerRuntime', () => {
  it('runs idempotent jobs and retries with exponential backoff into completion', async () => {
    let now = 0;
    let calls = 0;
    const runtime = new WorkerRuntime(() => now, { baseBackoffMs: 10, maxAttempts: 3 });
    runtime.register('bot-cycle', () => {
      calls += 1;
      if (calls < 3) throw new Error('temporary');
      return Promise.resolve();
    });
    runtime.enqueue('bot-cycle', { botId: 'b1' }, 'job-1');
    runtime.start();
    expect(await runtime.runNext()).toBe(true);
    now = 10;
    expect(await runtime.runNext()).toBe(true);
    now = 30;
    expect(await runtime.runNext()).toBe(true);
    runtime.stop();
    expect(calls).toBe(3);
    expect(runtime.metrics()).toMatchObject({ completed: 1, retried: 2, deadLettered: 0 });
  });
  it('moves permanently failing jobs to a dead-letter collection', async () => {
    const runtime = new WorkerRuntime(() => 0, { baseBackoffMs: 0, maxAttempts: 2 });
    runtime.register('broken', () => {
      throw new Error('broken');
    });
    runtime.enqueue('broken', null, 'job-2');
    runtime.start();
    await runtime.runNext();
    await runtime.runNext();
    runtime.stop();
    expect(runtime.deadLetters()).toHaveLength(1);
    expect(runtime.deadLetters()[0]?.attempts).toBe(2);
  });
  it('rejects duplicate or unknown work and records heartbeats', () => {
    const runtime = new WorkerRuntime(() => 0);
    expect(() => runtime.enqueue('unknown', null, 'x')).toThrow('Unknown');
    runtime.register('ok', () => Promise.resolve());
    runtime.enqueue('ok', null, 'x');
    expect(() => runtime.enqueue('ok', null, 'x')).toThrow('Duplicate');
    runtime.heartbeat();
    expect(runtime.metrics().heartbeats).toBe(1);
  });
});

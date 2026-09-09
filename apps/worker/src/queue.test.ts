import { describe, expect, it, vi } from 'vitest';
import type { Queue } from 'bullmq';
import { enqueueLiveReconciliation, enqueueLiveSubmit, liveReconcileJobId, liveSubmitJobId, type WorkerJob } from './queue.js';

describe('LIVE queue idempotency', () => {
  it('uses deterministic job ids for submit and reconciliation', () => {
    expect(liveSubmitJobId('order-1')).toBe('live-submit:order-1');
    expect(liveReconcileJobId('connection-1')).toBe('live-reconcile:connection-1');
    expect(() => liveSubmitJobId('')).toThrow('orderId is required');
    expect(() => liveReconcileJobId('')).toThrow('exchangeConnectionId is required');
  });

  it('enqueues duplicate-safe LIVE jobs with the same id', async () => {
    const add = vi.fn().mockResolvedValue({ id: 'live-submit:order-1' });
    const queue = { add } as unknown as Queue<WorkerJob, void, string>;

    await enqueueLiveSubmit(queue, 'order-1');
    await enqueueLiveSubmit(queue, 'order-1');
    await enqueueLiveReconciliation(queue, 'connection-1');

    expect(add).toHaveBeenNthCalledWith(1, 'live-submit', { type: 'live-submit', orderId: 'order-1' }, { jobId: 'live-submit:order-1' });
    expect(add).toHaveBeenNthCalledWith(2, 'live-submit', { type: 'live-submit', orderId: 'order-1' }, { jobId: 'live-submit:order-1' });
    expect(add).toHaveBeenNthCalledWith(3, 'live-reconcile', { type: 'live-reconcile', exchangeConnectionId: 'connection-1' }, { jobId: 'live-reconcile:connection-1' });
  });
});

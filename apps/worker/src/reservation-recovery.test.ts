import { describe, expect, it, vi } from 'vitest';
import { recoverOrphanedReservations } from './reconciliation.js';

describe('recoverOrphanedReservations', () => {
  it('releases old reservations that have no order', async () => {
    const transaction = vi.fn().mockResolvedValue([]);
    const database = {
      paperCapitalReservation: { findMany: vi.fn().mockResolvedValue([{ id: 'r-1', botId: 'b-1', amount: '10', proposal: { order: null } }]), updateMany: vi.fn() },
      paperCapitalAllocation: { updateMany: vi.fn() }, botEvent: { create: vi.fn() }, $transaction: transaction,
    } as never;
    await expect(recoverOrphanedReservations(database, Date.now())).resolves.toBe(1);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});

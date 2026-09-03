import { describe, expect, it, vi } from 'vitest';
import { reconcilePaperOrders } from './reconciliation.js';

describe('reconcilePaperOrders', () => {
  it('blocks a bot when persisted fills diverge from the order', async () => {
    const transaction = vi.fn().mockResolvedValue([]);
    const database = {
      order: { findMany: vi.fn().mockResolvedValue([{ id: 'order-1', botId: 'bot-1', filledQuantity: '2', trades: [{ quantity: '1' }] }]), update: vi.fn() },
      bot: { update: vi.fn() }, botEvent: { create: vi.fn() }, $transaction: transaction,
    } as never;
    await expect(reconcilePaperOrders(database)).resolves.toBe(1);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});

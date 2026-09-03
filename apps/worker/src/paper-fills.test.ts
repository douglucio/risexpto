import { describe, expect, it } from 'vitest';
import { applyPaperFill } from './paper-fills.js';

describe('applyPaperFill', () => {
  it('rejects invalid quantities before touching persistence', async () => {
    await expect(applyPaperFill({} as never, {
      orderId: 'order-1', externalTradeId: 'fill-1', quantity: 0, price: 100,
    })).rejects.toThrow('Invalid paper fill');
  });
});

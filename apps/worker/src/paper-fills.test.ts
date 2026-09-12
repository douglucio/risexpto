import { describe, expect, it } from 'vitest';
import { applyPaperFill, applySpotPositionFill } from './paper-fills.js';
import { Decimal } from 'decimal.js';

describe('applyPaperFill', () => {
  it('rejects invalid quantities before touching persistence', async () => {
    await expect(
      applyPaperFill({} as never, {
        orderId: 'order-1',
        externalTradeId: 'fill-1',
        quantity: 0,
        price: 100,
      }),
    ).rejects.toThrow('Invalid paper fill');
  });

  it('keeps weighted average cost through multiple buys and a partial sell', () => {
    const first = applySpotPositionFill({ quantity: new Decimal(0), averagePrice: new Decimal(0), realizedPnl: new Decimal(0) }, 'BUY', 1, 100);
    const second = applySpotPositionFill(first, 'BUY', 1, 120);
    const sold = applySpotPositionFill(second, 'SELL', 0.5, 130);
    expect(second.averagePrice.toString()).toBe('110');
    expect(sold.quantity.toString()).toBe('1.5');
    expect(sold.averagePrice.toString()).toBe('110');
    expect(sold.realizedPnl.toString()).toBe('10');
  });

  it('closes the position and preserves realized P&L on a full sell', () => {
    const bought = applySpotPositionFill({ quantity: new Decimal(0), averagePrice: new Decimal(0), realizedPnl: new Decimal(0) }, 'BUY', '2', '100');
    const sold = applySpotPositionFill(bought, 'SELL', '2', '90', '0.18');
    expect(sold.quantity.isZero()).toBe(true);
    expect(sold.averagePrice.isZero()).toBe(true);
    expect(sold.realizedPnl.toString()).toBe('-20.18');
  });

  it('rejects a sell larger than the open long position', () => {
    expect(() => applySpotPositionFill({ quantity: new Decimal(1), averagePrice: new Decimal(100), realizedPnl: new Decimal(0) }, 'SELL', 2, 100)).toThrow('PAPER_INSUFFICIENT_POSITION');
  });
});

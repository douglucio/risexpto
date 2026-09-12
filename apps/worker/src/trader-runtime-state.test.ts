import { describe, expect, it } from 'vitest';
import { calculateSpentCapital, calculateTodayUnrealizedPnl } from './trader-runtime-state.js';

describe('TraderRuntimeStateService capital accounting', () => {
  it('uses open position cost basis after a partial sell', () => {
    expect(calculateSpentCapital([{ quantity: '1.5', averagePrice: '110' }]).toString()).toBe('165');
  });

  it('does not retain spent capital after a full close', () => {
    expect(calculateSpentCapital([]).toString()).toBe('0');
  });

  it('measures intraday unrealized movement from the UTC day-start mark', () => {
    const dayStart = new Date('2026-09-12T00:00:00.000Z');
    expect(calculateTodayUnrealizedPnl({ currentPrice: '130', averagePrice: '100', quantity: '2', openedAt: new Date('2026-09-11T12:00:00.000Z'), dayStart, dayStartPrice: '120' }).toString()).toBe('20');
  });
});

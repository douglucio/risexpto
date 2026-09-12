import { describe, expect, it } from 'vitest';
import { calculateSpentCapital } from './trader-runtime-state.js';

describe('TraderRuntimeStateService capital accounting', () => {
  it('uses open position cost basis after a partial sell', () => {
    expect(calculateSpentCapital([{ quantity: '1.5', averagePrice: '110' }]).toString()).toBe('165');
  });

  it('does not retain spent capital after a full close', () => {
    expect(calculateSpentCapital([]).toString()).toBe('0');
  });
});

import { describe, expect, it } from 'vitest';
import { mvpStrategies } from './seed-data.js';

describe('MVP strategy seed', () => {
  it('defines one active version-compatible record for each supported strategy', () => {
    expect(mvpStrategies.map((strategy) => strategy.key)).toEqual(['dca', 'grid', 'trend-following']);
    expect(mvpStrategies.every((strategy) => strategy.implementationKey.length > 0)).toBe(true);
    expect(mvpStrategies.every((strategy) => strategy.parameterSchema.type === 'object')).toBe(true);
  });
});

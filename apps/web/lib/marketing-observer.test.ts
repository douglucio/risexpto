import { describe, expect, it } from 'vitest';
import { isValidIntersectionObserverMargin, marketingObserverOptions } from './marketing-observer';

describe('marketing observer configuration', () => {
  it('uses only pixel or percentage root margins', () => {
    expect(isValidIntersectionObserverMargin(marketingObserverOptions.rootMargin ?? '')).toBe(true);
    expect(isValidIntersectionObserverMargin('-5rem 0px -55% 0px')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  BruteForceGuard,
  RateLimiter,
  corsOrigin,
  safeError,
  securityHeaders,
  validatePublicUrl,
} from './index.js';
describe('security hardening', () => {
  it('provides secure headers, CORS and rate limits', () => {
    expect(securityHeaders()['X-Frame-Options']).toBe('DENY');
    expect(corsOrigin('https://app.example', ['https://app.example'])).toBe(true);
    const limiter = new RateLimiter(2, 100, () => 10);
    expect(limiter.allow('ip')).toBe(true);
    expect(limiter.allow('ip')).toBe(true);
    expect(limiter.allow('ip')).toBe(false);
  });
  it('blocks brute force, hides production errors and rejects SSRF targets', () => {
    const guard = new BruteForceGuard(2, 100, () => 10);
    guard.failed('u');
    guard.failed('u');
    expect(guard.allowed('u')).toBe(false);
    expect(safeError(new Error('secret stack'))).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    });
    expect(() => validatePublicUrl('http://127.0.0.1:8080')).toThrow('Unsafe');
  });
});

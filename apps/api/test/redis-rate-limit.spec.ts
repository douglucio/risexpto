import { describe, expect, it, vi } from 'vitest';
import { createRedisRateLimiter } from '../src/http/redis-rate-limit';

describe('Redis rate limiter', () => {
  it('passes through when Redis is not configured', async () => {
    const next = vi.fn();
    const limiter = createRedisRateLimiter(undefined);
    await limiter.middleware({ method: 'GET', path: '/profile', headers: {} }, { setHeader: vi.fn(), status: vi.fn() as never }, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it.skipIf(!process.env.E2E_REDIS_URL)('returns 429 after the configured Redis window quota', async () => {
    const previousMax = process.env.API_RATE_LIMIT_MAX_REQUESTS;
    process.env.API_RATE_LIMIT_MAX_REQUESTS = '2';
    const limiter = createRedisRateLimiter(process.env.E2E_REDIS_URL);
    const next = vi.fn();
    const path = `/rate-test-${Date.now()}`;
    const headers = new Map<string, string>();
    const status = vi.fn(() => ({ json: vi.fn() }));
    const response = { setHeader: (name: string, value: string) => headers.set(name, value), status };
    try {
      for (let index = 0; index < 3; index += 1)
        await limiter.middleware({ method: 'GET', path, ip: 'rate-test', headers: {} }, response, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(status).toHaveBeenCalledWith(429);
      expect(headers.get('x-ratelimit-limit')).toBe('2');
    } finally {
      if (previousMax === undefined) delete process.env.API_RATE_LIMIT_MAX_REQUESTS;
      else process.env.API_RATE_LIMIT_MAX_REQUESTS = previousMax;
      await limiter.close();
    }
  });
});

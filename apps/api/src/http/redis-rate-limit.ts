import Redis from 'ioredis';

type RequestLike = { method: string; path: string; ip?: string; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): { json(body: unknown): void } };

export function createRedisRateLimiter(redisUrl: string | undefined) {
  if (!redisUrl) return { middleware: (_request: RequestLike, _response: ResponseLike, next: () => void) => next(), close: async () => {} };
  const redis = new Redis(redisUrl, { enableOfflineQueue: false, maxRetriesPerRequest: 1 });
  const ready = redis.status === 'ready' ? Promise.resolve() : new Promise<void>((resolve, reject) => {
    redis.once('ready', resolve);
    redis.once('error', reject);
  });
  const windowSeconds = positiveInt(process.env.API_RATE_LIMIT_WINDOW_SECONDS, 60);
  const maxRequests = positiveInt(process.env.API_RATE_LIMIT_MAX_REQUESTS, 120);
  return {
    middleware: async (request: RequestLike, response: ResponseLike, next: () => void) => {
      if (request.path === '/health') return next();
      const client = request.ip ?? request.headers['x-forwarded-for'] ?? 'unknown';
      const identity = Array.isArray(client) ? client[0] : client;
      const key = `risexpto:rate:${identity}:${request.method}:${request.path}`;
      try {
        await ready;
        const count = await redis.incr(key);
        if (count === 1) await redis.expire(key, windowSeconds);
        response.setHeader('x-ratelimit-limit', String(maxRequests));
        response.setHeader('x-ratelimit-remaining', String(Math.max(0, maxRequests - count)));
        if (count > maxRequests) {
          response.setHeader('retry-after', String(windowSeconds));
          response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } });
          return;
        }
      } catch (error) {
        console.error(JSON.stringify({ event: 'api_rate_limit_unavailable', error: error instanceof Error ? error.message : 'unknown' }));
        if (process.env.NODE_ENV === 'production') {
          response.status(503).json({ error: { code: 'RATE_LIMIT_UNAVAILABLE', message: 'Service temporarily unavailable' } });
          return;
        }
      }
      next();
    },
    close: () => { redis.disconnect(); },
  };
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

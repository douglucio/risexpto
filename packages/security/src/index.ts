export type SecurityConfig = {
  allowedOrigins: readonly string[];
  maxRequests: number;
  windowMs: number;
};
export type SecurityHeaders = Record<string, string>;
export function securityHeaders(): SecurityHeaders {
  return {
    'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'; base-uri 'self'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}
export function corsOrigin(origin: string | undefined, allowed: readonly string[]): boolean {
  return origin === undefined || allowed.includes(origin);
}
export function safeError(error: unknown, production = true): { code: string; message: string } {
  if (!production && error instanceof Error)
    return { code: 'INTERNAL_ERROR', message: error.message };
  return { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' };
}
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();
  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}
  allow(key: string): boolean {
    const threshold = this.now() - this.windowMs;
    const current = (this.hits.get(key) ?? []).filter((at) => at > threshold);
    if (current.length >= this.maxRequests) {
      this.hits.set(key, current);
      return false;
    }
    current.push(this.now());
    this.hits.set(key, current);
    return true;
  }
  reset(key: string): void {
    this.hits.delete(key);
  }
}
export class BruteForceGuard {
  private readonly failures = new Map<string, { count: number; blockedUntil: number }>();
  constructor(
    private readonly maxFailures = 5,
    private readonly blockMs = 60_000,
    private readonly now: () => number = Date.now,
  ) {}
  failed(key: string): void {
    const value = this.failures.get(key) ?? { count: 0, blockedUntil: 0 };
    value.count += 1;
    if (value.count >= this.maxFailures) value.blockedUntil = this.now() + this.blockMs;
    this.failures.set(key, value);
  }
  allowed(key: string): boolean {
    const value = this.failures.get(key);
    if (!value || value.blockedUntil <= this.now()) return true;
    return false;
  }
  success(key: string): void {
    this.failures.delete(key);
  }
}
export function validatePublicUrl(value: string): URL {
  const url = new URL(value);
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hostname === 'localhost' ||
    /^127\.|^10\.|^192\.168\.|^169\.254\./.test(url.hostname)
  )
    throw new Error('Unsafe URL');
  return url;
}

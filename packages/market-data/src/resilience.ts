import { CircuitOpenError } from './errors.js';

export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly now: () => number = Date.now,
  ) {
    if (capacity < 1) throw new Error('Rate limit capacity must be positive');
    this.tokens = capacity;
    this.lastRefill = now();
  }

  take(): boolean {
    const current = this.now();
    const refill = ((current - this.lastRefill) / 60_000) * this.capacity;
    this.tokens = Math.min(this.capacity, this.tokens + refill);
    this.lastRefill = current;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;

  constructor(
    private readonly threshold: number,
    private readonly resetMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  beforeRequest(): void {
    if (this.state === 'open') throw new CircuitOpenError();
  }

  success(): void {
    this.failures = 0;
    this.openedAt = null;
  }

  failure(): void {
    this.failures += 1;
    if (this.failures >= this.threshold) this.openedAt = this.now();
  }

  get state(): 'closed' | 'open' | 'half-open' {
    if (this.openedAt === null) return 'closed';
    return this.now() - this.openedAt >= this.resetMs ? 'half-open' : 'open';
  }

  get consecutiveFailures(): number {
    return this.failures;
  }
}

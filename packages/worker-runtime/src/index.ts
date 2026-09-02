export type Job<T> = {
  id: string;
  name: string;
  payload: T;
  attempts: number;
  availableAt: number;
  createdAt: number;
};
export type RuntimeOptions = {
  maxAttempts?: number;
  baseBackoffMs?: number;
  lockTtlMs?: number;
  heartbeatMs?: number;
};
export type RuntimeMetrics = {
  queued: number;
  active: number;
  completed: number;
  retried: number;
  failed: number;
  deadLettered: number;
  heartbeats: number;
};
export type JobHandler<T> = (payload: T, job: Job<T>) => Promise<void>;

export class WorkerRuntime<T = unknown> {
  private readonly queue: Job<T>[] = [];
  private readonly deadLetterJobs: Job<T>[] = [];
  private readonly handlers = new Map<string, JobHandler<T>>();
  private readonly locks = new Map<string, number>();
  private readonly metricsValue: RuntimeMetrics = {
    queued: 0,
    active: 0,
    completed: 0,
    retried: 0,
    failed: 0,
    deadLettered: 0,
    heartbeats: 0,
  };
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;
  private readonly options: Required<RuntimeOptions>;
  constructor(
    private readonly now: () => number = Date.now,
    options: RuntimeOptions = {},
  ) {
    this.options = {
      maxAttempts: 3,
      baseBackoffMs: 100,
      lockTtlMs: 30_000,
      heartbeatMs: 5_000,
      ...options,
    };
  }
  register(name: string, handler: JobHandler<T>): void {
    if (this.handlers.has(name)) throw new Error(`Handler already registered: ${name}`);
    this.handlers.set(name, handler);
  }
  enqueue(name: string, payload: T, id: string, delayMs = 0): Job<T> {
    if (!this.handlers.has(name)) throw new Error(`Unknown job: ${name}`);
    if (this.queue.some((job) => job.id === id) || this.deadLetterJobs.some((job) => job.id === id))
      throw new Error('Duplicate job id');
    const job = {
      id,
      name,
      payload,
      attempts: 0,
      availableAt: this.now() + delayMs,
      createdAt: this.now(),
    };
    this.queue.push(job);
    this.metricsValue.queued += 1;
    return { ...job };
  }
  async runNext(): Promise<boolean> {
    if (!this.running) return false;
    const index = this.queue.findIndex(
      (job) => job.availableAt <= this.now() && !this.isLocked(job.id),
    );
    if (index < 0) return false;
    const [job] = this.queue.splice(index, 1);
    if (!job) return false;
    this.metricsValue.queued -= 1;
    this.metricsValue.active += 1;
    this.locks.set(job.id, this.now() + this.options.lockTtlMs);
    try {
      await this.handlers.get(job.name)!(job.payload, { ...job, attempts: job.attempts + 1 });
      this.metricsValue.completed += 1;
    } catch {
      this.metricsValue.failed += 1;
      job.attempts += 1;
      if (job.attempts < this.options.maxAttempts) {
        job.availableAt = this.now() + this.options.baseBackoffMs * 2 ** (job.attempts - 1);
        this.queue.push(job);
        this.metricsValue.queued += 1;
        this.metricsValue.retried += 1;
      } else {
        this.deadLetterJobs.push(job);
        this.metricsValue.deadLettered += 1;
      }
    } finally {
      this.metricsValue.active -= 1;
      this.locks.delete(job.id);
    }
    return true;
  }
  start(): void {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(
      () => {
        void this.runNext();
      },
      Math.max(10, this.options.heartbeatMs),
    );
  }
  stop(): void {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
  heartbeat(): void {
    for (const [id, expiresAt] of this.locks) if (expiresAt <= this.now()) this.locks.delete(id);
    this.metricsValue.heartbeats += 1;
  }
  metrics(): Readonly<RuntimeMetrics> {
    return { ...this.metricsValue };
  }
  pending(): readonly Job<T>[] {
    return this.queue.map((job) => ({ ...job }));
  }
  deadLetters(): readonly Job<T>[] {
    return this.deadLetterJobs.map((job) => ({ ...job }));
  }
  private isLocked(id: string): boolean {
    const expiresAt = this.locks.get(id);
    return expiresAt !== undefined && expiresAt > this.now();
  }
}

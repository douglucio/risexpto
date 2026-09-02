export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogRecord = {
  level: LogLevel;
  message: string;
  correlationId: string;
  at: number;
  context: Record<string, unknown>;
};
export type Health = { status: 'ok' | 'degraded' | 'down'; checks: Record<string, boolean> };
export type Metrics = {
  queueDepth: number;
  exchangeLatencyMs: number;
  orderLatencyMs: number;
  strategyRuntimeMs: number;
  riskRejections: number;
  requests: number;
  errors: number;
};
export class Observability {
  private readonly logs: LogRecord[] = [];
  private readonly values: Metrics = {
    queueDepth: 0,
    exchangeLatencyMs: 0,
    orderLatencyMs: 0,
    strategyRuntimeMs: 0,
    riskRejections: 0,
    requests: 0,
    errors: 0,
  };
  private readonly checks = new Map<string, boolean>();
  constructor(
    private readonly now: () => number = Date.now,
    private readonly id: () => string = () =>
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  ) {}
  correlationId(): string {
    return this.id();
  }
  log(
    level: LogLevel,
    message: string,
    correlationId: string,
    context: Record<string, unknown> = {},
  ): LogRecord {
    const record = {
      level,
      message,
      correlationId,
      at: this.now(),
      context: structuredClone(context),
    };
    this.logs.push(record);
    return structuredClone(record);
  }
  observe(metric: keyof Metrics, value: number): void {
    if (!Number.isFinite(value) || value < 0) throw new Error('Metric value must be non-negative');
    this.values[metric] = value;
  }
  increment(metric: 'riskRejections' | 'requests' | 'errors', amount = 1): void {
    if (!Number.isFinite(amount) || amount < 0)
      throw new Error('Metric increment must be non-negative');
    this.values[metric] += amount;
  }
  registerCheck(name: string, healthy: boolean): void {
    this.checks.set(name, healthy);
  }
  liveness(): Health {
    return { status: 'ok', checks: { process: true } };
  }
  readiness(): Health {
    const checks = Object.fromEntries(this.checks);
    const status = Object.values(checks).every(Boolean) ? 'ok' : 'degraded';
    return {
      status: Object.keys(checks).length && status === 'degraded' ? 'degraded' : status,
      checks,
    };
  }
  metrics(): Readonly<Metrics> {
    return { ...this.values };
  }
  logsFor(correlationId: string): LogRecord[] {
    return this.logs
      .filter((record) => record.correlationId === correlationId)
      .map((record) => structuredClone(record));
  }
}

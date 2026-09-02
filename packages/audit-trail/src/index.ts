export type AuditType =
  | 'USER_ACTION'
  | 'BOT_ACTION'
  | 'STRATEGY_SIGNAL'
  | 'TRADE_PROPOSAL'
  | 'RISK_DECISION'
  | 'ORDER_REQUEST'
  | 'ORDER_RESULT'
  | 'EXCHANGE_EVENT'
  | 'SYSTEM_EVENT'
  | 'ADMIN_ACTION';
export type AuditRecord = {
  id: string;
  type: AuditType;
  userId?: string;
  botId?: string;
  correlationId: string;
  action: string;
  payload: Record<string, unknown>;
  createdAt: number;
  previousHash: string;
  hash: string;
};
export type AuditQuery = {
  userId?: string;
  botId?: string;
  correlationId?: string;
  type?: AuditType;
  action?: string;
};
const secretKey = /secret|password|token|api[-_]?key|authorization|credential/i;
function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !secretKey.test(key))
      .map(([key, item]) => [key, sanitize(item)]),
  );
}
function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
export class AuditTrail {
  private readonly records: AuditRecord[] = [];
  constructor(
    private readonly now: () => number = Date.now,
    private readonly id: () => string = () =>
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  ) {}
  async append(
    input: Omit<AuditRecord, 'id' | 'payload' | 'createdAt' | 'previousHash' | 'hash'> & {
      payload?: Record<string, unknown>;
    },
  ): Promise<AuditRecord> {
    const payload = sanitize(input.payload ?? {}) as Record<string, unknown>;
    const previousHash = this.records.at(-1)?.hash ?? 'GENESIS';
    const unsigned = { ...input, payload, createdAt: this.now(), previousHash };
    const hash = digest(JSON.stringify(unsigned));
    const record = { ...unsigned, id: this.id(), hash };
    this.records.push(record);
    await Promise.resolve();
    return structuredClone(record);
  }
  search(query: AuditQuery = {}): AuditRecord[] {
    return this.records
      .filter((record) =>
        Object.entries(query).every(
          ([key, value]) => value === undefined || record[key as keyof AuditRecord] === value,
        ),
      )
      .map((record) => structuredClone(record));
  }
  verify(): boolean {
    return this.records.every(
      (record, index) =>
        record.previousHash === (index ? this.records[index - 1]!.hash : 'GENESIS'),
    );
  }
}
import { createHash } from 'node:crypto';

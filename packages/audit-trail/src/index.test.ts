import { describe, expect, it } from 'vitest';
import { AuditTrail } from './index.js';
describe('AuditTrail', () => {
  it('stores structured searchable hash-chained records without secrets', async () => {
    const trail = new AuditTrail(
      () => 10,
      (() => {
        let i = 0;
        return () => `a-${++i}`;
      })(),
    );
    await trail.append({
      type: 'ORDER_REQUEST',
      userId: 'u1',
      botId: 'b1',
      correlationId: 'c1',
      action: 'submit',
      payload: { apiSecret: 'never', symbol: 'BTCUSDT' },
    });
    await trail.append({
      type: 'RISK_DECISION',
      userId: 'u1',
      botId: 'b1',
      correlationId: 'c1',
      action: 'reject',
      payload: { reasonCode: 'LIMIT' },
    });
    const records = trail.search({ correlationId: 'c1' });
    expect(records).toHaveLength(2);
    expect(records[0]?.payload).toEqual({ symbol: 'BTCUSDT' });
    expect(trail.verify()).toBe(true);
  });
  it('isolates results and filters by ownership/type', async () => {
    const trail = new AuditTrail();
    await trail.append({ type: 'USER_ACTION', userId: 'u1', correlationId: 'c', action: 'login' });
    const result = trail.search({ userId: 'u2' });
    expect(result).toEqual([]);
    expect(trail.search({ type: 'USER_ACTION' })).toHaveLength(1);
  });
});

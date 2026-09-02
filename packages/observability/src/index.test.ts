import { describe, expect, it } from 'vitest';
import { Observability } from './index.js';
describe('Observability', () => {
  it('creates structured correlated logs and operational metrics', () => {
    const obs = new Observability(
      () => 10,
      () => 'c1',
    );
    obs.log('info', 'order submitted', 'c1', { orderId: 'o1' });
    obs.observe('exchangeLatencyMs', 42);
    obs.observe('queueDepth', 3);
    obs.increment('requests');
    obs.increment('riskRejections', 2);
    expect(obs.logsFor('c1')[0]?.context).toEqual({ orderId: 'o1' });
    expect(obs.metrics()).toMatchObject({
      exchangeLatencyMs: 42,
      queueDepth: 3,
      requests: 1,
      riskRejections: 2,
    });
  });
  it('exposes liveness/readiness without sensitive data', () => {
    const obs = new Observability();
    obs.registerCheck('redis', true);
    expect(obs.liveness().status).toBe('ok');
    expect(obs.readiness().status).toBe('ok');
    obs.registerCheck('postgres', false);
    expect(obs.readiness().status).toBe('degraded');
  });
});

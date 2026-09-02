import { describe, expect, it } from 'vitest';
import { AdminConsole, type AdminDataSource } from './index.js';
const source: AdminDataSource = {
  users: [{ id: 'u1' }],
  subscriptions: [],
  plans: [],
  bots: [],
  strategies: [],
  versions: [],
  exchangeConnections: [
    {
      id: 'e1',
      userId: 'u1',
      provider: 'BINANCE',
      status: 'CONNECTED',
      maskedApiKey: 'abcd****',
      apiSecret: 'never',
    },
  ],
  workers: [],
  queues: [],
  errors: [],
  riskEvents: [],
  killSwitches: [],
  auditLogs: [],
  health: { status: 'ok' },
};
describe('AdminConsole', () => {
  it('allows support/admin read access and strips secrets from connections', () => {
    const result = new AdminConsole(source).read('SUPPORT');
    expect(result.users).toHaveLength(1);
    expect(result.exchangeConnections[0]).not.toHaveProperty('apiSecret');
    expect(result.exchangeConnections[0]?.maskedApiKey).toBe('abcd****');
  });
  it('denies regular users', () =>
    expect(() => new AdminConsole(source).read('USER')).toThrow('permission'));
});

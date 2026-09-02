import { describe, expect, it } from 'vitest';
import { StrategyCatalog } from './index.js';
const entry = {
  key: 'dca',
  name: 'DCA',
  description: 'Scheduled accumulation',
  risk: 'MEDIUM' as const,
  markets: ['SPOT'],
  metrics: { winRate: 0.5 },
  drawdown: 20,
  version: '1.0.0',
  parameters: { intervalMs: 60000 },
  compatibility: { paper: true, live: false },
  status: 'ACTIVE' as const,
};
describe('StrategyCatalog', () => {
  it('stores versioned discoverable metadata without exposing mutable state', () => {
    const catalog = new StrategyCatalog();
    catalog.register(entry);
    const result = catalog.get('dca', '1.0.0');
    result.parameters.intervalMs = 1;
    expect(catalog.get('dca', '1.0.0').parameters.intervalMs).toBe(60000);
    expect(catalog.list('ACTIVE')).toHaveLength(1);
  });
  it('rejects unsafe metadata and duplicate versions', () => {
    const catalog = new StrategyCatalog();
    expect(() => catalog.register({ ...entry, drawdown: 101 })).toThrow('Invalid');
    catalog.register(entry);
    expect(() => catalog.register(entry)).toThrow('already');
  });
});

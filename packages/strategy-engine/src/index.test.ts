import { describe, expect, it } from 'vitest';
import { StrategyEngine, type StrategyDefinition } from './index.js';

const definition = (
  lifecycle: StrategyDefinition<number>['lifecycle'] = 'ACTIVE',
): StrategyDefinition<number> => ({
  key: 'test-strategy',
  version: '1.0.0',
  name: 'Test',
  description: 'test',
  lifecycle,
  schema: {
    parse: (value) => {
      if (typeof value !== 'number' || value <= 0) throw new Error('invalid');
      return value;
    },
  },
  analyze: (context, amount) =>
    Promise.resolve([
      {
        proposalId: 'p1',
        symbol: context.symbol,
        side: 'BUY',
        quoteAmount: String(amount),
        strategyKey: 'wrong',
        strategyVersion: 'wrong',
        generatedAt: 0,
        mode: context.mode,
        rationale: 'test',
      },
    ]),
});

describe('StrategyEngine', () => {
  it('versions, activates and emits proposals without execution access', async () => {
    const logs: unknown[] = [];
    const engine = new StrategyEngine(
      (event) => logs.push(event),
      () => 100,
    );
    engine.register(definition('DRAFT'));
    await expect(
      engine.analyze(
        'test-strategy',
        '1.0.0',
        { symbol: 'BTCUSDT', price: '100', timestamp: 100, mode: 'PAPER' },
        10,
      ),
    ).rejects.toThrow('not active');
    engine.setLifecycle('test-strategy', '1.0.0', 'ACTIVE');
    await expect(
      engine.analyze(
        'test-strategy',
        '1.0.0',
        { symbol: 'BTCUSDT', price: '100', timestamp: 100, mode: 'PAPER' },
        10,
      ),
    ).resolves.toMatchObject([
      { strategyKey: 'test-strategy', strategyVersion: '1.0.0', generatedAt: 100 },
    ]);
    expect(engine.metrics()).toMatchObject({ analyses: 1, proposals: 1 });
    expect(logs).toHaveLength(2);
  });
  it('rejects duplicate versions, invalid parameters and archived activation', async () => {
    const engine = new StrategyEngine();
    engine.register(definition());
    expect(() => engine.register(definition())).toThrow('already registered');
    await expect(
      engine.analyze(
        'test-strategy',
        '1.0.0',
        { symbol: 'BTCUSDT', price: '100', timestamp: 1, mode: 'PAPER' },
        0,
      ),
    ).rejects.toThrow('invalid');
    engine.setLifecycle('test-strategy', '1.0.0', 'ARCHIVED');
    expect(() => engine.setLifecycle('test-strategy', '1.0.0', 'ACTIVE')).toThrow('Archived');
  });
});

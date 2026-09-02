import { describe, expect, it } from 'vitest';
import { BotManager } from './index.js';

const input = {
  userId: 'user-1',
  name: 'BTC Trend',
  strategyVersionId: 'trend-1',
  tradingMode: 'PAPER' as const,
  configuration: {
    parameters: { fast: 3 },
    allowedSymbols: ['BTCUSDT'],
    authorizedCapital: 500,
    quoteCurrency: 'USD',
    revision: 1,
  },
};
describe('BotManager', () => {
  it('validates and runs the complete safe lifecycle with events', () => {
    const manager = new BotManager(
      () => 1000,
      (() => {
        let n = 0;
        return () => `id-${++n}`;
      })(),
    );
    const events: string[] = [];
    manager.subscribe((event) => events.push(event.type));
    const bot = manager.create(input);
    expect(manager.validate(bot.id, 'user-1').status).toBe('READY');
    expect(manager.start(bot.id, 'user-1').status).toBe('RUNNING');
    expect(manager.pause(bot.id, 'user-1').status).toBe('PAUSED');
    expect(manager.resume(bot.id, 'user-1').status).toBe('RUNNING');
    expect(manager.stop(bot.id, 'user-1').status).toBe('STOPPED');
    expect(events).toEqual([
      'BOT_CREATED',
      'BOT_VALIDATED',
      'BOT_STARTED',
      'BOT_PAUSED',
      'BOT_RESUMED',
      'BOT_STOPPED',
    ]);
  });
  it('enforces ownership, transitions, LIVE connection and deep-copy isolation', () => {
    const manager = new BotManager(
      () => 1000,
      () => 'bot-1',
    );
    const bot = manager.create(input);
    expect(() => manager.start(bot.id, 'other-user')).toThrow('not found');
    expect(() => manager.start(bot.id, 'user-1')).toThrow('Invalid bot transition');
    expect(() => manager.create({ ...input, tradingMode: 'LIVE' })).toThrow('exchange connection');
    const returned = manager.get(bot.id);
    returned.configuration.parameters.fast = 99;
    expect(manager.get(bot.id).configuration.parameters.fast).toBe(3);
  });
  it('duplicates configuration into a new draft and preserves history separately', () => {
    const manager = new BotManager(
      () => 1000,
      (() => {
        let n = 0;
        return () => `id-${++n}`;
      })(),
    );
    const source = manager.create(input);
    const copy = manager.duplicate(source.id, 'user-1', 'BTC Trend Copy');
    expect(copy).toMatchObject({
      name: 'BTC Trend Copy',
      status: 'DRAFT',
      strategyVersionId: 'trend-1',
    });
    expect(copy.id).not.toBe(source.id);
    expect(manager.history(copy.id, 'user-1')).toHaveLength(1);
  });
});

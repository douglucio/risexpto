import { describe, expect, it } from 'vitest';
import { BotWizard } from './index.js';
describe('BotWizard', () => {
  it('walks required steps and requires review before start', () => {
    const wizard = new BotWizard();
    wizard.update({ strategyKey: 'dca', strategyVersion: '1.0.0' });
    wizard.next();
    wizard.update({ exchangeConnectionId: 'ex-1' });
    wizard.next();
    wizard.update({ symbol: 'BTCUSDT' });
    wizard.next();
    wizard.update({ capital: 100 });
    wizard.next();
    wizard.applyPreset('BALANCED');
    wizard.next();
    expect(wizard.review().reviewed).toBe(true);
    expect(wizard.start().reviewed).toBe(true);
  });
  it('presets fill risk only and custom remains editable', () => {
    const wizard = new BotWizard();
    expect(wizard.applyPreset('CONSERVATIVE').risk?.maxTradePercent).toBe(0.02);
    expect(wizard.applyPreset('CUSTOM').risk).toEqual({
      maxTradePercent: 0.02,
      maxDrawdownPercent: 0.1,
    });
    expect(() => wizard.start()).toThrow('review');
  });
});

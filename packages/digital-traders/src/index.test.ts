import { describe, expect, it } from 'vitest';
import { AiCreditLedger, assertHardAllocation, cryptoDigitalTraders, evaluatePortfolioRisk, mapBotState, operationalCapital, riskPresets } from './index.js';

describe('digital trader domain', () => {
  it('publishes the four initial Crypto Spot specialists', () => expect(cryptoDigitalTraders.map((trader) => trader.name)).toEqual(['ATLAS', 'LUNA', 'DCA ONE', 'PULSE']));
  it('protects hard allocation and supports instance replacement', () => {
    expect(() => assertHardAllocation(1000, [{ traderInstanceId: 'atlas-btc', amount: 700 }], 301)).toThrow('CAPITAL_OVER_ALLOCATED');
    expect(() => assertHardAllocation(1000, [{ traderInstanceId: 'atlas-btc', amount: 700 }], 400, 'atlas-btc')).not.toThrow();
  });
  it('maps technical states to product language and exposes real presets', () => {
    expect(mapBotState('RUNNING', 'MARKET_REGIME_NOT_SUITABLE')).toBe('WAITING');
    expect(riskPresets.CONSERVATIVE.maxDailyLoss).toBe(2);
    expect(operationalCapital('FIXED', 100, 25)).toBe(100);
    expect(operationalCapital('COMPOUND', 100, 25)).toBe(125);
  });
  it('requires both portfolio risk and the connection kill switch', () => {
    expect(evaluatePortfolioRisk({ proposedExposure: 10, allocatedCapital: 100, maximumExposure: 100, dailyLoss: 0, maximumDailyLoss: 10, killSwitchActive: true }).reasonCode).toBe('CONNECTION_KILL_SWITCH');
  });
  it('consumes subscription credits before purchased credits', () => {
    const ledger = new AiCreditLedger(); ledger.credit('SUBSCRIPTION_CREDITS', 2); ledger.credit('PURCHASED_CREDITS', 3);
    expect(ledger.consume(4)).toEqual({ subscription: 2, purchased: 2 });
    expect(ledger.balancesSnapshot()).toEqual({ SUBSCRIPTION_CREDITS: 0, PURCHASED_CREDITS: 1 });
  });
});

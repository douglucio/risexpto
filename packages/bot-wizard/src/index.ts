export type WizardStep =
  | 'STRATEGY'
  | 'EXCHANGE'
  | 'MARKET'
  | 'CAPITAL'
  | 'RISK'
  | 'REVIEW'
  | 'START';
export type Preset = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE' | 'CUSTOM';
export type WizardDraft = {
  strategyKey?: string;
  strategyVersion?: string;
  exchangeConnectionId?: string;
  symbol?: string;
  capital?: number;
  risk?: Record<string, number>;
  preset: Preset;
  reviewed: boolean;
};
const steps: readonly WizardStep[] = [
  'STRATEGY',
  'EXCHANGE',
  'MARKET',
  'CAPITAL',
  'RISK',
  'REVIEW',
  'START',
];
const presetRisk: Record<Exclude<Preset, 'CUSTOM'>, Record<string, number>> = {
  CONSERVATIVE: { maxTradePercent: 0.02, maxDrawdownPercent: 0.1 },
  BALANCED: { maxTradePercent: 0.05, maxDrawdownPercent: 0.2 },
  AGGRESSIVE: { maxTradePercent: 0.1, maxDrawdownPercent: 0.3 },
};
export class BotWizard {
  private draft: WizardDraft = { preset: 'CUSTOM', reviewed: false };
  private position = 0;
  update(changes: Partial<WizardDraft>): WizardDraft {
    this.draft = { ...this.draft, ...changes, reviewed: false };
    return structuredClone(this.draft);
  }
  applyPreset(preset: Preset): WizardDraft {
    return this.update({
      preset,
      ...(preset === 'CUSTOM' ? {} : { risk: { ...presetRisk[preset] } }),
    });
  }
  currentStep(): WizardStep {
    return steps[this.position]!;
  }
  next(): WizardStep {
    this.validateStep();
    if (this.position < steps.length - 1) this.position += 1;
    return this.currentStep();
  }
  back(): WizardStep {
    if (this.position > 0) this.position -= 1;
    return this.currentStep();
  }
  review(): WizardDraft {
    this.position = 5;
    this.validateAll();
    this.draft.reviewed = true;
    return structuredClone(this.draft);
  }
  start(): WizardDraft {
    if (!this.draft.reviewed) throw new Error('Wizard review is required before start');
    this.validateAll();
    this.position = 6;
    return structuredClone(this.draft);
  }
  draftState(): WizardDraft {
    return structuredClone(this.draft);
  }
  private validateStep(): void {
    const d = this.draft;
    if (this.position === 0 && (!d.strategyKey || !d.strategyVersion))
      throw new Error('Strategy is required');
    if (this.position === 1 && !d.exchangeConnectionId) throw new Error('Exchange is required');
    if (this.position === 2 && !/^[A-Z0-9]{5,20}$/.test(d.symbol ?? ''))
      throw new Error('Market is required');
    if (this.position === 3 && (!Number.isFinite(d.capital) || d.capital! <= 0))
      throw new Error('Capital is required');
    if (this.position === 4 && !d.risk) throw new Error('Risk is required');
  }
  private validateAll(): void {
    const old = this.position;
    for (let i = 0; i < 5; i += 1) {
      this.position = i;
      this.validateStep();
    }
    this.position = old;
  }
}

'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Card, FormField, Input, Select } from '@risexpto/ui';
import { translate } from '@risexpto/i18n';
import { useLocale } from './locale-provider';

type Strategy = {
  id: string;
  key: string;
  name: string;
  description: string;
  versions: Array<{ id: string; version: number }>;
};
type FormState = {
  name: string;
  strategyVersionId: string;
  strategyKey: string;
  symbol: string;
  capital: string;
  trade: string;
  exposure: string;
  position: string;
  positions: string;
  dailyLoss: string;
  drawdown: string;
  cooldown: string;
  capitalMode: 'FIXED' | 'COMPOUND';
  riskPreset: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
};
const initial: FormState = {
  name: '',
  strategyVersionId: '',
  strategyKey: '',
  symbol: 'BTCUSDT',
  capital: '100',
  trade: '10',
  exposure: '50',
  position: '50',
  positions: '1',
  dailyLoss: '5',
  drawdown: '10',
  cooldown: '60',
  capitalMode: 'FIXED',
  riskPreset: 'BALANCED',
};

export function BotCreateWizard() {
  const { locale } = useLocale();
  const t = (key: string) => translate(key, locale);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initial);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    void fetch('/api/strategies').then(async (response) =>
      response.ok
        ? setStrategies((await response.json()) as Strategy[])
        : setStatus(t('workspace.loadStrategiesError')),
    );
  }, [open]);
  function update(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function chooseStrategy(id: string) {
    const strategy = strategies.find((item) => item.id === id);
    update('strategyVersionId', id);
    update('strategyKey', strategy?.key ?? '');
  }
  function applyPreset(value: string) {
    const presets: Record<string, Partial<FormState>> = {
      conservative: {
        exposure: '25',
        position: '25',
        positions: '1',
        dailyLoss: '2',
        drawdown: '5',
        cooldown: '300',
      },
      balanced: {
        exposure: '50',
        position: '50',
        positions: '2',
        dailyLoss: '5',
        drawdown: '10',
        cooldown: '60',
      },
      aggressive: {
        exposure: '75',
        position: '75',
        positions: '3',
        dailyLoss: '10',
        drawdown: '20',
        cooldown: '15',
      },
    };
    setForm((current) => ({ ...current, ...(presets[value] ?? {}) }));
    if (value !== 'custom') setForm((current) => ({ ...current, riskPreset: value.toUpperCase() as FormState['riskPreset'] }));
  }
  async function create() {
    setStatus(t('workspace.creating'));
    const response = await fetch('/api/bots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        strategyVersionId: form.strategyVersionId,
        tradingMode: 'PAPER',
        capitalMode: form.capitalMode,
        digitalTraderSlug: form.strategyKey === 'dca' ? 'dca-one' : form.strategyKey === 'trend-following' ? 'luna' : form.strategyKey === 'grid' ? 'atlas' : form.strategyKey === 'breakout' ? 'pulse' : undefined,
        allowedSymbols: [form.symbol],
        authorizedCapital: form.capital,
        quoteCurrency: 'USDT',
        parameters: {
          symbol: form.symbol,
          intervalMs: 86_400_000,
          quoteAmount: Number(form.trade),
          maxCapital: Number(form.capital),
        },
        riskProfile: {
          name: `${form.name} risk`,
          maxAllocatedCapital: form.capital,
          maxTradeAmount: form.trade,
          maxExposurePercent: form.exposure,
          maxPositionPercent: form.position,
          maxPositions: Number(form.positions),
          maxDailyLossPercent: form.dailyLoss,
          maxDrawdownPercent: form.drawdown,
          allowedSymbols: [form.symbol],
          cooldownSeconds: Number(form.cooldown),
          preset: form.riskPreset,
        },
      }),
    });
    if (!response.ok) {
      setStatus(t('workspace.createBotError'));
      return;
    }
    const created = (await response.json()) as { id?: string };
    if (!created.id) {
      setStatus(t('workspace.createBotError'));
      return;
    }
    const readyResponse = await fetch(`/api/bots/${encodeURIComponent(created.id)}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'READY' }),
    });
    if (!readyResponse.ok) {
      setStatus(t('workspace.createBotError'));
      return;
    }
    window.location.reload();
  }
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
          setStatus(null);
        }}
      >
        {t('workspace.createBot')}
      </Button>
      {open ? (
        <Card className="content-stack">
          <div className="section-heading">
            <h2>{t('workspace.createPaper')}</h2>
            <Button onClick={() => setOpen(false)}>{t('workspace.close')}</Button>
          </div>
          <p>
            {t('workspace.step')} {step + 1} {t('workspace.of')} 5 ·{' '}
            {t('workspace.paperTradingOnly')}
          </p>
          {status ? (
            <Alert tone={status === 'Creating…' ? 'info' : 'negative'} title={status}>
              {status === 'Creating…' ? t('workspace.validatingConfig') : t('workspace.noChanges')}
            </Alert>
          ) : null}
          {step === 0 ? (
            <FormField label={t('workspace.strategy')}>
              <Select
                value={form.strategyVersionId}
                onChange={(event) => chooseStrategy(event.target.value)}
              >
                <option value="">{t('workspace.selectStrategy')}</option>
                {strategies.map((strategy) => (
                  <option key={strategy.id} value={strategy.versions[0]?.id}>
                    {strategy.name}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : null}
          {step === 1 ? (
            <>
              <FormField label={t('workspace.botName')}>
                <Input
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                  placeholder={t('workspace.myPaperBot')}
                />
              </FormField>
              <FormField label={t('workspace.symbol')}>
                <Input
                  value={form.symbol}
                  onChange={(event) => update('symbol', event.target.value.toUpperCase())}
                />
              </FormField>
              <p>{t('workspace.liveUnavailable')}</p>
            </>
          ) : null}
          {step === 2 ? (
            <>
              <FormField label={t('workspace.authorizedCapital')}>
                <Input
                  value={form.capital}
                  onChange={(event) => update('capital', event.target.value)}
                  inputMode="decimal"
                />
              </FormField>
              <FormField label="Capital mode">
                <Select value={form.capitalMode} onChange={(event) => update('capitalMode', event.target.value)}>
                  <option value="FIXED">FIXED — base capital stays constant</option>
                  <option value="COMPOUND">COMPOUND — profits may compound</option>
                </Select>
              </FormField>
              <FormField label={t('workspace.maximumTradeUsdt')}>
                <Input
                  value={form.trade}
                  onChange={(event) => update('trade', event.target.value)}
                  inputMode="decimal"
                />
              </FormField>
            </>
          ) : null}
          {step === 3 ? (
            <>
              <FormField label={t('workspace.riskPreset')}>
                <Select
                  value={form.riskPreset.toLowerCase()}
                  onChange={(event) => applyPreset(event.target.value)}
                >
                  <option value="conservative">{t('workspace.conservative')}</option>
                  <option value="balanced">{t('workspace.balanced')}</option>
                  <option value="aggressive">{t('workspace.aggressive')}</option>
                  <option value="custom">{t('workspace.custom')}</option>
                </Select>
              </FormField>
              <FormField label={t('workspace.maximumExposurePercent')}>
                <Input
                  value={form.exposure}
                  onChange={(event) => update('exposure', event.target.value)}
                  inputMode="decimal"
                />
              </FormField>
              <FormField label={t('workspace.maximumPositionPercent')}>
                <Input
                  value={form.position}
                  onChange={(event) => update('position', event.target.value)}
                  inputMode="decimal"
                />
              </FormField>
              <FormField label={t('workspace.maximumPositions')}>
                <Input
                  value={form.positions}
                  onChange={(event) => update('positions', event.target.value)}
                  inputMode="numeric"
                />
              </FormField>
              <FormField label={t('workspace.dailyLossLimit')}>
                <Input
                  value={form.dailyLoss}
                  onChange={(event) => update('dailyLoss', event.target.value)}
                  inputMode="decimal"
                />
              </FormField>
              <FormField label={t('workspace.drawdownLimit')}>
                <Input
                  value={form.drawdown}
                  onChange={(event) => update('drawdown', event.target.value)}
                  inputMode="decimal"
                />
              </FormField>
              <FormField label={t('workspace.cooldown')}>
                <Input
                  value={form.cooldown}
                  onChange={(event) => update('cooldown', event.target.value)}
                  inputMode="numeric"
                />
              </FormField>
            </>
          ) : null}
          {step === 4 ? (
            <div className="content-stack">
              <h3>{t('workspace.review')}</h3>
              <p>
                <strong>{form.name}</strong> · {form.strategyKey} · {form.symbol}
              </p>
              <p>
                PAPER · {form.capital} USDT authorized · {form.trade} USDT max trade
              </p>
              <p>
                Risk: {form.exposure}% exposure · {form.position}% position · {form.dailyLoss}%
                daily loss · {form.drawdown}% drawdown
              </p>
              <Button
                onClick={() => void create()}
                disabled={!form.strategyVersionId || !form.name}
              >
                {t('workspace.createPaper')}
              </Button>
            </div>
          ) : null}
          <div className="section-heading">
            <Button disabled={step === 0} onClick={() => setStep((value) => value - 1)}>
              {t('workspace.back')}
            </Button>
            {step < 4 ? (
              <Button
                onClick={() => setStep((value) => value + 1)}
                disabled={step === 0 && !form.strategyVersionId}
              >
                {t('workspace.next')}
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}
    </>
  );
}

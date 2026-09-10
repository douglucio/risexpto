'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Card, EmptyState, FormField, Input } from '@risexpto/ui';
import { translate } from '@risexpto/i18n';
import { useLocale } from './locale-provider';

type Bot = { id: string; name: string; status: string; tradingMode: string };
type RiskProfile = {
  name: string;
  maxAllocatedCapital: string;
  maxTradeAmount: string;
  maxExposurePercent: string;
  maxPositionPercent: string;
  maxPositions: number;
  maxDailyLossPercent: string;
  maxDrawdownPercent: string;
  allowedSymbols: string[];
  cooldownSeconds: number;
};

export function RiskPanel() {
  const { locale } = useLocale();
  const t = (key: string) => translate(key, locale);
  const [bots, setBots] = useState<Bot[]>([]);
  const [selected, setSelected] = useState('');
  const [risk, setRisk] = useState<RiskProfile | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => {
    void fetch('/api/bots').then(async (response) => {
      if (response.ok) {
        const value = (await response.json()) as Bot[];
        setBots(value);
        setSelected(value[0]?.id ?? '');
      }
    });
  }, []);
  useEffect(() => {
    if (!selected) return;
    setStatus(null);
    void fetch(`/api/bots/${encodeURIComponent(selected)}/risk-profile`).then(async (response) =>
      response.ok
        ? setRisk((await response.json()) as RiskProfile)
        : setStatus(t('workspace.riskUnavailable')),
    );
  }, [selected]);
  function update(key: keyof RiskProfile, value: string) {
    setRisk((current) => (current ? { ...current, [key]: value } : current));
  }
  async function save() {
    if (!risk || !selected) return;
    setStatus(t('workspace.saving'));
    const response = await fetch(`/api/bots/${encodeURIComponent(selected)}/risk-profile`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(risk),
    });
    setStatus(response.ok ? t('workspace.riskSaved') : t('workspace.riskUnavailable'));
  }
  if (bots.length === 0)
    return (
      <EmptyState
        title={t('workspace.noRiskProfiles')}
        description={t('workspace.createPaperForRisk')}
      />
    );
  return (
    <div className="content-stack">
      <FormField label="Bot">
        <select
          className="rx-input rx-select"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          {bots.map((bot) => (
            <option key={bot.id} value={bot.id}>
              {bot.name} · {bot.tradingMode} · {bot.status}
            </option>
          ))}
        </select>
      </FormField>
      {status && !risk ? (
        <Alert tone="negative" title="Risk unavailable">
          {status}
        </Alert>
      ) : null}
      {risk ? (
        <>
          <div className="settings-grid">
            <Card>
              <h2>{t('workspace.allocationExposure')}</h2>
              <FormField label={t('workspace.maximumAllocation')}>
                <Input
                  value={risk.maxAllocatedCapital}
                  onChange={(event) => update('maxAllocatedCapital', event.target.value)}
                  inputMode="decimal"
                />
              </FormField>
              <FormField label={t('workspace.maximumTrade')}>
                <Input
                  value={risk.maxTradeAmount}
                  onChange={(event) => update('maxTradeAmount', event.target.value)}
                  inputMode="decimal"
                />
              </FormField>
              <FormField label={t('workspace.maximumExposure')}>
                <Input
                  value={risk.maxExposurePercent}
                  onChange={(event) => update('maxExposurePercent', event.target.value)}
                  inputMode="decimal"
                />
              </FormField>
              <FormField label={t('workspace.maximumPosition')}>
                <Input
                  value={risk.maxPositionPercent}
                  onChange={(event) => update('maxPositionPercent', event.target.value)}
                  inputMode="decimal"
                />
              </FormField>
            </Card>
            <Card>
              <h2>{t('workspace.lossControls')}</h2>
              <FormField label={t('workspace.maximumDailyLoss')}>
                <Input
                  value={risk.maxDailyLossPercent}
                  onChange={(event) => update('maxDailyLossPercent', event.target.value)}
                  inputMode="decimal"
                />
              </FormField>
              <FormField label={t('workspace.maximumDrawdown')}>
                <Input
                  value={risk.maxDrawdownPercent}
                  onChange={(event) => update('maxDrawdownPercent', event.target.value)}
                  inputMode="decimal"
                />
              </FormField>
              <FormField label={t('workspace.maximumPositions')}>
                <Input
                  value={String(risk.maxPositions)}
                  onChange={(event) => update('maxPositions', event.target.value)}
                  inputMode="numeric"
                />
              </FormField>
              <FormField label={t('workspace.cooldown')}>
                <Input
                  value={String(risk.cooldownSeconds)}
                  onChange={(event) => update('cooldownSeconds', event.target.value)}
                  inputMode="numeric"
                />
              </FormField>
            </Card>
          </div>
          <Card>
            <h2>{t('workspace.allowedSymbols')}</h2>
            <p>{risk.allowedSymbols.join(', ')}</p>
            <p>{t('workspace.riskRunning')}</p>
            <Button onClick={() => void save()} disabled={status === t('workspace.saving')}>
              {status === t('workspace.saving') ? t('workspace.saving') : t('workspace.saveRisk')}
            </Button>
            {status === t('workspace.riskSaved') ? (
              <Alert tone="positive" title={t('workspace.saved')}>
                {t('workspace.riskAccepted')}
              </Alert>
            ) : null}
          </Card>
        </>
      ) : null}
    </div>
  );
}

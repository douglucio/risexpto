'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Card, EmptyState, FormField, Input } from '@risexpto/ui';

type Bot = { id: string; name: string; status: string; tradingMode: string };
type RiskProfile = { name: string; maxAllocatedCapital: string; maxTradeAmount: string; maxExposurePercent: string; maxPositionPercent: string; maxPositions: number; maxDailyLossPercent: string; maxDrawdownPercent: string; allowedSymbols: string[]; cooldownSeconds: number };

export function RiskPanel() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selected, setSelected] = useState('');
  const [risk, setRisk] = useState<RiskProfile | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => { void fetch('/api/bots').then(async (response) => { if (response.ok) { const value = await response.json() as Bot[]; setBots(value); setSelected(value[0]?.id ?? ''); } }); }, []);
  useEffect(() => { if (!selected) return; setStatus(null); void fetch(`/api/bots/${encodeURIComponent(selected)}/risk-profile`).then(async (response) => response.ok ? setRisk(await response.json() as RiskProfile) : setStatus('Risk profile unavailable.')); }, [selected]);
  function update(key: keyof RiskProfile, value: string) { setRisk((current) => current ? { ...current, [key]: value } : current); }
  async function save() {
    if (!risk || !selected) return;
    setStatus('Saving…');
    const response = await fetch(`/api/bots/${encodeURIComponent(selected)}/risk-profile`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(risk) });
    setStatus(response.ok ? 'Risk profile saved.' : 'Could not save risk profile.');
  }
  if (bots.length === 0) return <EmptyState title="No bot risk profiles" description="Create a PAPER bot to configure its risk limits." />;
  return <div className="content-stack">
    <FormField label="Bot"><select className="rx-input rx-select" value={selected} onChange={(event) => setSelected(event.target.value)}>{bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name} · {bot.tradingMode} · {bot.status}</option>)}</select></FormField>
    {status && !risk ? <Alert tone="negative" title="Risk unavailable">{status}</Alert> : null}
    {risk ? <><div className="settings-grid">
      <Card><h2>Allocation and exposure</h2><FormField label="Maximum allocation"><Input value={risk.maxAllocatedCapital} onChange={(event) => update('maxAllocatedCapital', event.target.value)} inputMode="decimal" /></FormField><FormField label="Maximum per trade"><Input value={risk.maxTradeAmount} onChange={(event) => update('maxTradeAmount', event.target.value)} inputMode="decimal" /></FormField><FormField label="Maximum exposure (%)"><Input value={risk.maxExposurePercent} onChange={(event) => update('maxExposurePercent', event.target.value)} inputMode="decimal" /></FormField><FormField label="Maximum position (%)"><Input value={risk.maxPositionPercent} onChange={(event) => update('maxPositionPercent', event.target.value)} inputMode="decimal" /></FormField></Card>
      <Card><h2>Loss controls</h2><FormField label="Maximum daily loss (%)"><Input value={risk.maxDailyLossPercent} onChange={(event) => update('maxDailyLossPercent', event.target.value)} inputMode="decimal" /></FormField><FormField label="Maximum drawdown (%)"><Input value={risk.maxDrawdownPercent} onChange={(event) => update('maxDrawdownPercent', event.target.value)} inputMode="decimal" /></FormField><FormField label="Maximum positions"><Input value={String(risk.maxPositions)} onChange={(event) => update('maxPositions', event.target.value)} inputMode="numeric" /></FormField><FormField label="Cooldown (seconds)"><Input value={String(risk.cooldownSeconds)} onChange={(event) => update('cooldownSeconds', event.target.value)} inputMode="numeric" /></FormField></Card>
    </div><Card><h2>Allowed symbols</h2><p>{risk.allowedSymbols.join(', ')}</p><p>Changes to risk limits are blocked while the bot is RUNNING.</p><Button onClick={() => void save()} disabled={status === 'Saving…'}>{status === 'Saving…' ? 'Saving…' : 'Save risk profile'}</Button>{status === 'Risk profile saved.' ? <Alert tone="positive" title="Saved">The API accepted the updated limits.</Alert> : null}</Card></> : null}
  </div>;
}

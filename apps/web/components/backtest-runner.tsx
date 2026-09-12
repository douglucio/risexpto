'use client';

import { useEffect, useState } from 'react';

type Strategy = { id: string; name: string; key: string; versions: Array<{ id: string; version: number }> };
type Labels = { strategy: string; asset: string; capital: string; start: string; end: string; submit: string; running: string; success: string; error: string };

export function BacktestRunner({ labels }: { labels: Labels }) {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [strategyVersionId, setStrategyVersionId] = useState('');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [capital, setCapital] = useState('1000');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { void fetch('/api/strategies').then((response) => response.ok ? response.json() : []).then((value: Strategy[]) => { setStrategies(value); setStrategyVersionId(value[0]?.versions[0]?.id ?? ''); }); }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setMessage(labels.running);
    const selected = strategies.find((strategy) => strategy.versions.some((version) => version.id === strategyVersionId));
    const traderSlug = selected?.key === 'dca' ? 'dca-one' : selected?.key === 'trend-following' ? 'luna' : selected?.key === 'grid' ? 'atlas' : selected?.key === 'breakout' ? 'pulse' : undefined;
    const response = await fetch('/api/backtests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ strategyVersionId, digitalTraderSlug: traderSlug, symbol, initialCapital: capital, periodStart, periodEnd, traderRiskPreset: 'BALANCED' }) });
    setMessage(response.ok ? labels.success : labels.error);
  }
  return <form className="content-stack" onSubmit={(event) => { void submit(event); }}><label>{labels.strategy}<select value={strategyVersionId} onChange={(event) => setStrategyVersionId(event.target.value)}>{strategies.flatMap((strategy) => strategy.versions.map((version) => <option key={version.id} value={version.id}>{strategy.name} v{version.version}</option>))}</select></label><label>{labels.asset}<input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} /></label><label>{labels.capital}<input type="number" min="1" value={capital} onChange={(event) => setCapital(event.target.value)} /></label><label>{labels.start}<input type="datetime-local" required value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} /></label><label>{labels.end}<input type="datetime-local" required value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} /></label><button className="rx-button" type="submit" disabled={!strategyVersionId}>{labels.submit}</button>{message ? <small>{message}</small> : null}</form>;
}

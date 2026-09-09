import Link from 'next/link';
import { Badge, Card, CurrencyDisplay, EmptyState } from '@risexpto/ui';
import { readSession } from '../../lib/auth/session';

type Bot = { id: string; status: string; tradingMode: string };
type Trade = { id: string; executedAt: string; realizedPnl?: string };
type Position = { realizedPnl: string };

export default async function DashboardPage() {
  const session = await readSession(true, false);
  if (!session) return <EmptyState title="Session unavailable" description="Sign in again to open your workspace." />;
  const [bots, trades, positions] = await Promise.all([
    api<Bot[]>('/bots', session.accessToken),
    api<Trade[]>('/trades', session.accessToken),
    api<Position[]>('/positions', session.accessToken),
  ]);
  const activeBots = bots.ok ? bots.value.filter((bot) => bot.status === 'RUNNING').length : null;
  const pnl = positions.ok ? positions.value.reduce((total, position) => total + Number(position.realizedPnl || 0), 0) : null;
  return (
    <>
      <div className="page-header">
        <div><span>WORKSPACE</span><h1>Dashboard</h1><p>Real account activity, with Paper Trading clearly separated from live execution.</p></div>
        <Badge tone="brand">PAPER</Badge>
      </div>
      <div className="kpi-grid">
        <Card><small>Paper balance</small><h2><CurrencyDisplay value={0} currency="USD" /></h2><p>Shown as zero until a persisted paper balance exists.</p></Card>
        <Card><small>Active bots</small><h2>{activeBots ?? '—'}</h2><p>{bots.ok ? `${bots.value.length} total bots` : 'Unavailable'}</p></Card>
        <Card><small>Realized P&amp;L</small><h2>{pnl === null ? '—' : <CurrencyDisplay value={pnl} currency="USD" />}</h2><p>Calculated from persisted positions.</p></Card>
        <Card><small>Risk status</small><h2>{bots.ok ? 'Within limits' : 'Unavailable'}</h2><p>Risk decisions remain backend-controlled.</p></Card>
      </div>
      <div className="dashboard-grid">
        <Card className="content-stack"><div className="section-heading"><div><span>ACTIVITY</span><h2>Recent trades</h2></div><Link href="/trades">View all</Link></div>{trades.ok && trades.value.length ? <p>{trades.value.length} persisted trade(s) available in Trades.</p> : <p>No trades yet. Start a Paper bot to see activity here.</p>}</Card>
        <Card className="content-stack"><div className="section-heading"><div><span>SETUP</span><h2>Next step</h2></div></div><p>{bots.ok && bots.value.length ? 'Review your bot status and risk limits.' : 'Choose a strategy and create your first Paper bot.'}</p><Link className="rx-button" href={bots.ok && bots.value.length ? '/bots' : '/strategies'}>{bots.ok && bots.value.length ? 'Review bots' : 'Browse strategies'}</Link></Card>
      </div>
    </>
  );
}

async function api<T>(path: string, accessToken: string): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    const base = process.env.API_BASE_URL ?? `http://localhost:${process.env.API_PORT ?? '3001'}`;
    const response = await fetch(`${base.replace(/\/$/, '')}${path}`, { headers: { authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
    return response.ok ? { ok: true, value: await response.json() as T } : { ok: false };
  } catch { return { ok: false }; }
}

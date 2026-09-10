import Link from 'next/link';
import { Badge, Card, CurrencyDisplay, EmptyState } from '@risexpto/ui';
import { readSession } from '../../lib/auth/session';
import { translate, type Locale } from '@risexpto/i18n';

type Bot = { id: string; status: string; tradingMode: string };
type Trade = { id: string; executedAt: string; realizedPnl?: string };
type Position = { realizedPnl: string };

export default async function DashboardPage() {
  const session = await readSession(true, false);
  const locale: Locale = session?.preferences.locale ?? 'en';
  const t = (key: string) => translate(key, locale);
  if (!session)
    return (
      <EmptyState
        title={t('dashboard.sessionUnavailable')}
        description={t('dashboard.signInAgain')}
      />
    );
  const [bots, trades, positions] = await Promise.all([
    api<Bot[]>('/bots', session.accessToken),
    api<Trade[]>('/trades', session.accessToken),
    api<Position[]>('/positions', session.accessToken),
  ]);
  const activeBots = bots.ok ? bots.value.filter((bot) => bot.status === 'RUNNING').length : null;
  const pnl = positions.ok
    ? positions.value.reduce((total, position) => total + Number(position.realizedPnl || 0), 0)
    : null;
  return (
    <>
      <div className="page-header">
        <div>
          <span>{t('section.workspace')}</span>
          <h1>{t('nav.dashboard')}</h1>
          <p>{t('dashboard.description')}</p>
        </div>
        <Badge tone="brand">PAPER</Badge>
      </div>
      <div className="kpi-grid">
        <Card>
          <small>{t('dashboard.paperBalance')}</small>
          <h2>
            <CurrencyDisplay value={0} currency="USD" />
          </h2>
          <p>{t('dashboard.zeroBalance')}</p>
        </Card>
        <Card>
          <small>{t('marketing.activeBots')}</small>
          <h2>{activeBots ?? '—'}</h2>
          <p>
            {bots.ok
              ? `${bots.value.length} ${t('dashboard.totalBots')}`
              : t('dashboard.unavailable')}
          </p>
        </Card>
        <Card>
          <small>{t('dashboard.realizedPnl')}</small>
          <h2>{pnl === null ? '—' : <CurrencyDisplay value={pnl} currency="USD" />}</h2>
          <p>{t('dashboard.persistedPositions')}</p>
        </Card>
        <Card>
          <small>{t('dashboard.riskStatus')}</small>
          <h2>{bots.ok ? t('marketing.withinLimits') : t('dashboard.unavailable')}</h2>
          <p>{t('dashboard.backendRisk')}</p>
        </Card>
      </div>
      <div className="dashboard-grid">
        <Card className="content-stack">
          <div className="section-heading">
            <div>
              <span>{t('section.activity')}</span>
              <h2>{t('dashboard.recentTrades')}</h2>
            </div>
            <Link href="/trades">{t('dashboard.viewAll')}</Link>
          </div>
          {trades.ok && trades.value.length ? (
            <p>
              {trades.value.length} {t('dashboard.persistedTrades')}
            </p>
          ) : (
            <p>{t('dashboard.noTrades')}</p>
          )}
        </Card>
        <Card className="content-stack">
          <div className="section-heading">
            <div>
              <span>{t('dashboard.setup')}</span>
              <h2>{t('dashboard.nextStep')}</h2>
            </div>
          </div>
          <p>
            {bots.ok && bots.value.length
              ? t('dashboard.reviewBot')
              : t('dashboard.chooseStrategy')}
          </p>
          <Link className="rx-button" href={bots.ok && bots.value.length ? '/bots' : '/strategies'}>
            {bots.ok && bots.value.length
              ? t('dashboard.reviewBots')
              : t('dashboard.browseStrategies')}
          </Link>
        </Card>
      </div>
    </>
  );
}

async function api<T>(
  path: string,
  accessToken: string,
): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    const base = process.env.API_BASE_URL ?? `http://localhost:${process.env.API_PORT ?? '3001'}`;
    const response = await fetch(`${base.replace(/\/$/, '')}${path}`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    return response.ok ? { ok: true, value: (await response.json()) as T } : { ok: false };
  } catch {
    return { ok: false };
  }
}

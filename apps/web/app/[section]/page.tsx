import { Alert, Badge, Card, CurrencyDisplay, DataTable, EmptyState, Tabs } from '@risexpto/ui';
import { notFound } from 'next/navigation';
import { PageHeader } from '../../components/page-header';
import { PreferencesForm } from '../../components/preferences-form';
import { BotControls } from '../../components/bot-controls';
import { readSession } from '../../lib/auth/session';
import { BotCreateWizard } from '../../components/bot-create-wizard';
import { RiskPanel } from '../../components/risk-panel';
import { ExchangeConnectionsPanel } from '../../components/exchange-connections-panel';
import { BillingPanel } from '../../components/billing-panel';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { translate, type Locale } from '@risexpto/i18n';
import { NotificationsPanel } from '../../components/notifications-panel';
import { BacktestRunner } from '../../components/backtest-runner';

const pages = {
  bots: ['section.automation', 'nav.bots', 'section.botsDescription'],
  strategies: ['section.library', 'nav.strategies', 'section.strategiesDescription'],
  'exchange-connections': [
    'nav.connections',
    'section.connectionsTitle',
    'section.connectionsDescription',
  ],
  backtests: ['section.research', 'nav.backtests', 'section.backtestsDescription'],
  trades: ['section.activity', 'nav.trades', 'section.tradesDescription'],
  portfolio: ['section.activity', 'section.portfolio', 'section.portfolioDescription'],
  risk: ['section.controls', 'nav.risk', 'section.riskDescription'],
  notifications: ['section.inbox', 'nav.notifications', 'section.notificationsDescription'],
  billing: ['section.workspace', 'nav.billing', 'section.billingDescription'],
  settings: ['section.workspace', 'nav.settings', 'section.settingsDescription'],
  admin: ['section.operations', 'section.admin', 'section.adminDescription'],
} as const;

export function generateStaticParams() {
  return Object.keys(pages).map((section) => ({ section }));
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = pages[section as keyof typeof pages];
  if (!page) notFound();
  const session = await readSession(true, false);
  const locale: Locale = session?.preferences.locale ?? 'en';
  if (section === 'admin') {
    if (!session?.user.roles.includes('ADMIN')) redirect('/dashboard');
  }
  const data =
    section === 'bots' ||
    section === 'strategies' ||
    section === 'exchange-connections' ||
    section === 'trades' ||
    section === 'portfolio' ||
    section === 'backtests' ||
    section === 'notifications' ||
    section === 'billing'
      ? await loadSectionData(section)
      : null;
  return (
    <>
      <PageHeader
        eyebrow={translate(page[0], locale)}
        title={translate(page[1], locale)}
        description={translate(page[2], locale)}
        action={section === 'bots' ? <BotCreateWizard /> : null}
      />
      <SectionContent section={section} data={data} locale={locale} />
    </>
  );
}

type SectionData =
  | { kind: 'bots'; value: BotRecord[] }
  | { kind: 'strategies'; value: StrategyRecord[] }
  | { kind: 'exchange-connections'; value: ExchangeConnectionRecord[] }
  | { kind: 'trades'; value: TradeRecord[] }
  | { kind: 'positions'; value: PositionRecord[] }
  | { kind: 'billing'; value: BillingRecord }
  | { kind: 'backtests'; value: BacktestRecord[] }
  | { kind: 'notifications'; value: NotificationRecord[] }
  | { kind: 'error'; message: string; status: number };
type BotRecord = {
  id: string;
  name: string;
  status: string;
  productState?: string;
  assetSymbol?: string | null;
  waitingReason?: string | null;
  totalPnl?: number;
  todayPnl?: number;
  currentExposure?: string;
  exchangeConnection?: { provider: string; label: string } | null;
  riskProfile?: { preset?: string | null } | null;
  tradingMode: string;
  configuration?: { authorizedCapital?: string; quoteCurrency?: string } | null;
};
type StrategyRecord = {
  id: string;
  key: string;
  name: string;
  description: string;
  versions: Array<{ id: string; version: number; implementationKey: string }>;
  specialty?: string;
  marketType?: string;
  idealMarketRegime?: string;
  riskDescription?: string;
  paperAvailable?: boolean;
  liveAvailable?: boolean;
  supportedProviders?: string[];
};
type ExchangeConnectionRecord = {
  id: string;
  provider: string;
  label: string;
  status: string;
  maskedApiKey: string;
  lastCheckedAt?: string | null;
};
type TradeRecord = {
  id: string;
  symbol: string;
  side: string;
  tradingMode: string;
  quantity: string;
  price: string;
  executedAt: string;
};
type PositionRecord = {
  id: string;
  symbol: string;
  status: string;
  tradingMode: string;
  quantity: string;
  averagePrice: string;
  realizedPnl: string;
  unrealizedPnl?: string;
  currentValue?: string;
};
type BillingRecord = {
  mode: string;
  subscription: { status: string; plan: string; entitlements: Record<string, unknown> } | null;
};
type BacktestRecord = { id: string; symbol: string; status: string; initialCapital: string; createdAt: string; result?: { returnPercent: string; maxDrawdown: string; tradeCount: number } | null };
type NotificationRecord = { id: string; type: string; severity: string; title: string; body: string; readAt?: string | null; createdAt: string };

async function loadSectionData(
  section: 'bots' | 'strategies' | 'exchange-connections' | 'trades' | 'portfolio' | 'billing' | 'backtests' | 'notifications',
): Promise<SectionData> {
  // Server Components cannot persist refreshed cookies. They still use a fresh
  // access token for this request; BFF route handlers persist refresh results.
  const session = await readSession(true, false);
  if (!session) return { kind: 'error', message: 'dashboard.signInAgain', status: 401 };
  try {
    const apiBaseUrl =
      process.env.API_BASE_URL ?? `http://localhost:${process.env.API_PORT ?? '3001'}`;
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/${section === 'strategies' ? 'traders' : section}`, {
      headers: { authorization: `Bearer ${session.accessToken}` },
      cache: 'no-store',
    });
    if (!response.ok) return sectionError(section, response.status);
    const payload: unknown = await response.json();
    if (section === 'bots') return { kind: 'bots', value: payload as BotRecord[] };
    if (section === 'strategies') return { kind: 'strategies', value: payload as StrategyRecord[] };
    if (section === 'exchange-connections')
      return { kind: 'exchange-connections', value: payload as ExchangeConnectionRecord[] };
    if (section === 'trades') return { kind: 'trades', value: payload as TradeRecord[] };
    if (section === 'billing') return { kind: 'billing', value: payload as BillingRecord };
    if (section === 'backtests') return { kind: 'backtests', value: payload as BacktestRecord[] };
    if (section === 'notifications') return { kind: 'notifications', value: payload as NotificationRecord[] };
    return { kind: 'positions', value: payload as PositionRecord[] };
  } catch {
    return { kind: 'error', message: 'error.unavailable', status: 503 };
  }
}

function sectionError(
  section: 'bots' | 'strategies' | 'exchange-connections' | 'trades' | 'portfolio' | 'billing' | 'backtests' | 'notifications',
  status: number,
): SectionData {
  if (status === 401) return { kind: 'error', message: 'dashboard.signInAgain', status };
  if (status === 403) return { kind: 'error', message: 'error.forbidden', status };
  if (status === 503) return { kind: 'error', message: 'error.unavailable', status };
  return {
    kind: 'error',
    message:
      section === 'bots'
        ? 'workspace.loadBotsError'
        : section === 'strategies'
          ? 'workspace.loadStrategiesError'
          : section === 'exchange-connections'
            ? 'workspace.loadConnectionsError'
            : section === 'trades'
              ? 'workspace.loadTradesError'
              : 'error.generic',
    status,
  };
}

function SectionContent({
  section,
  data,
  locale,
}: {
  section: string;
  data: SectionData | null;
  locale: Locale;
}) {
  const t = (key: string) => translate(key, locale);
  if (section === 'bots')
    return (
      <>
        <Tabs
          active="active"
          tabs={[
            { id: 'active', label: t('workspace.active') },
            { id: 'drafts', label: t('workspace.drafts') },
            { id: 'archived', label: t('workspace.archived') },
          ]}
        />
        {data?.kind === 'error' ? (
          <Alert tone="negative" title={t('workspace.loadBotsError')}>
            {t(data.message)}
          </Alert>
        ) : null}
        {data?.kind === 'bots' && data.value.length === 0 ? (
          <EmptyState
            title={t('workspace.noBots')}
            description={t('workspace.noBotsDescription')}
          />
        ) : null}
        {data?.kind === 'bots' && data.value.length > 0 ? (
          <div className="content-stack">
            <DataTable
              columns={[
                t('workspace.name'),
                t('workspace.asset'),
                t('workspace.provider'),
                t('workspace.mode'),
                t('workspace.capital'),
                t('workspace.exposure'),
                t('workspace.todayPnl'),
                t('workspace.totalPnl'),
                t('workspace.riskPreset'),
                t('workspace.status'),
                t('workspace.actions'),
              ]}
              rows={data.value.map((bot) => [
                <b key={`${bot.id}-name`}>{bot.name}</b>,
                bot.assetSymbol ?? '—',
                bot.exchangeConnection?.provider ?? 'Paper',
                <Badge key={`${bot.id}-mode`} tone="brand">
                  {bot.tradingMode}
                </Badge>,
                <CurrencyDisplay
                  key={`${bot.id}-capital`}
                  value={Number(bot.configuration?.authorizedCapital ?? 0)}
                  currency={bot.configuration?.quoteCurrency ?? 'USD'}
                />,
                <CurrencyDisplay key={`${bot.id}-exposure`} value={Number(bot.currentExposure ?? 0)} currency={bot.configuration?.quoteCurrency ?? 'USD'} />,
                <CurrencyDisplay key={`${bot.id}-today-pnl`} value={bot.todayPnl ?? 0} currency={bot.configuration?.quoteCurrency ?? 'USD'} />,
                <CurrencyDisplay key={`${bot.id}-total-pnl`} value={bot.totalPnl ?? 0} currency={bot.configuration?.quoteCurrency ?? 'USD'} />,
                bot.riskProfile?.preset ?? t('workspace.advanced'),
                <Badge key={`${bot.id}-status`}>{bot.productState ?? bot.status}</Badge>,
                <BotControls
                  key={`${bot.id}-actions`}
                  id={bot.id}
                  status={bot.status}
                  tradingMode={bot.tradingMode}
                />,
              ])}
            />
          </div>
        ) : null}
      </>
    );
  if (section === 'strategies')
    return data?.kind === 'error' ? (
      <Alert tone="negative" title={t('workspace.loadStrategiesError')}>
        {t(data.message)}
      </Alert>
    ) : data?.kind === 'strategies' && data.value.length === 0 ? (
      <EmptyState
        title={t('workspace.noStrategies')}
        description={t('workspace.noStrategiesDescription')}
      />
    ) : (
      <div className="card-grid">
        {data?.kind === 'strategies'
          ? data.value.map((strategy) => (
              <Card key={strategy.id}>
                <Badge tone="brand">{strategy.specialty ?? strategy.key}</Badge>
                <h2>{strategy.name}</h2>
                <p>{strategy.description}</p>
                {strategy.idealMarketRegime ? <small>{strategy.idealMarketRegime} · {strategy.riskDescription}</small> : null}
                {strategy.supportedProviders ? <small>{t('workspace.providers')}: {strategy.supportedProviders.join(', ')}</small> : null}
                {strategy.versions[0] ? (
                  <small>
                    {t('workspace.version')} {strategy.versions[0].version}
                  </small>
                ) : null}
                <Link className="rx-button" href="/bots">
                  {strategy.paperAvailable ? t('workspace.tryPaper') : t('workspace.useStrategy')}
                </Link>
              </Card>
            ))
          : null}
      </div>
    );
  if (section === 'exchange-connections')
    return (
      <>
        <Alert tone="warning" title={t('workspace.tradeOnlyAccess')}>
          {t('workspace.withdrawalsWarning')}
        </Alert>
        {data?.kind === 'error' ? (
          <Alert tone="negative" title={t('workspace.loadConnectionsError')}>
            {t(data.message)}
          </Alert>
        ) : null}
        {data?.kind === 'exchange-connections' ? (
          <ExchangeConnectionsPanel initial={data.value} />
        ) : null}
      </>
    );
  if (section === 'backtests')
    return (
      <>
        <Alert title={t('workspace.historicalResults')}>
          {t('workspace.performanceDisclaimer')}
        </Alert>
        <BacktestRunner labels={{ strategy: t('workspace.backtestStrategy'), asset: t('workspace.asset'), capital: t('workspace.initialCapital'), start: t('workspace.periodStart'), end: t('workspace.periodEnd'), submit: t('workspace.runBacktest'), running: t('workspace.backtestRunning'), success: t('workspace.backtestSaved'), error: t('workspace.backtestError') }} />
        {data?.kind === 'backtests' && data.value.length ? <DataTable columns={[t('workspace.symbol'), t('workspace.status'), t('workspace.return'), t('workspace.maximumDrawdown'), t('workspace.trades')]} rows={data.value.map((item) => [item.symbol, item.status, item.result?.returnPercent ?? '—', item.result?.maxDrawdown ?? '—', item.result?.tradeCount ?? 0])} /> : <EmptyState title={t('workspace.backtestsSoon')} description={t('workspace.backtestsSoonDescription')} />}
      </>
    );
  if (section === 'trades')
    return data?.kind === 'error' ? (
      <Alert tone="negative" title={t('workspace.loadTradesError')}>
        {t(data.message)}
      </Alert>
    ) : data?.kind === 'trades' && data.value.length === 0 ? (
      <EmptyState
        title={t('workspace.noTrades')}
        description={t('workspace.noTradesDescription')}
      />
    ) : (
      <DataTable
        columns={[
          t('workspace.time'),
          t('workspace.pair'),
          t('workspace.side'),
          t('workspace.quantity'),
          t('workspace.price'),
          t('workspace.mode'),
        ]}
        rows={
          data?.kind === 'trades'
            ? data.value.map((trade) => [
                <span key={`${trade.id}-time`} className="rx-number">
                  {new Date(trade.executedAt).toLocaleTimeString()}
                </span>,
                trade.symbol,
                <Badge
                  key={`${trade.id}-side`}
                  tone={trade.side === 'BUY' ? 'positive' : 'negative'}
                >
                  {trade.side}
                </Badge>,
                trade.quantity,
                <CurrencyDisplay key={`${trade.id}-price`} value={Number(trade.price)} />,
                <Badge key={`${trade.id}-mode`} tone="brand">
                  {trade.tradingMode}
                </Badge>,
              ])
            : []
        }
      />
    );
  if (section === 'portfolio')
    return data?.kind === 'error' ? (
      <Alert tone="negative" title={t('workspace.portfolioLoadError')}>
        {data.message}
      </Alert>
    ) : data?.kind === 'positions' && data.value.length === 0 ? (
      <EmptyState
        title={t('workspace.noPositions')}
        description={t('workspace.noPositionsDescription')}
      />
    ) : (
      <DataTable
        columns={[
          t('workspace.symbol'),
          t('workspace.quantity'),
          t('workspace.averagePrice'),
          t('workspace.realizedPnl'),
          t('workspace.unrealizedPnl'),
          t('workspace.exposure'),
          t('workspace.status'),
          t('workspace.mode'),
        ]}
        rows={
          data?.kind === 'positions'
            ? data.value.map((position) => [
                position.symbol,
                position.quantity,
                <CurrencyDisplay
                  key={`${position.id}-price`}
                  value={Number(position.averagePrice)}
                />,
                <CurrencyDisplay key={`${position.id}-pnl`} value={Number(position.realizedPnl)} />,
                <CurrencyDisplay key={`${position.id}-unrealized`} value={Number(position.unrealizedPnl ?? 0)} />,
                <CurrencyDisplay key={`${position.id}-exposure`} value={Number(position.currentValue ?? 0)} />,
                <Badge key={`${position.id}-status`}>{position.status}</Badge>,
                <Badge key={`${position.id}-mode`} tone="brand">
                  {position.tradingMode}
                </Badge>,
              ])
            : []
        }
      />
    );
  if (section === 'risk') return <RiskPanel />;
  if (section === 'notifications')
    return data?.kind === 'notifications' && data.value.length ? <NotificationsPanel items={data.value} /> : <EmptyState title={t('workspace.notificationsSoon')} description={t('workspace.notificationsSoonDescription')} />;
  if (section === 'billing')
    return data?.kind === 'billing' ? (
      <BillingPanel />
    ) : (
      <Alert tone="negative" title={t('error.generic')}>
        {data?.kind === 'error' ? t(data.message) : t('error.generic')}
      </Alert>
    );
  if (section === 'settings') return <PreferencesForm />;
  return (
    <>
      <Alert tone="warning" title={t('workspace.restrictedArea')}>
        {t('workspace.adminRoleRequired')}
      </Alert>
      <EmptyState
        title={t('workspace.adminSoon')}
        description={t('workspace.adminSoonDescription')}
      />
    </>
  );
}

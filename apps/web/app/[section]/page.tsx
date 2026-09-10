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
      <SectionContent section={section} data={data} />
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
  | { kind: 'error'; message: string };
type BotRecord = {
  id: string;
  name: string;
  status: string;
  tradingMode: string;
  configuration?: { authorizedCapital?: string; quoteCurrency?: string } | null;
};
type StrategyRecord = {
  id: string;
  key: string;
  name: string;
  description: string;
  versions: Array<{ id: string; version: number; implementationKey: string }>;
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
};
type BillingRecord = {
  mode: string;
  subscription: { status: string; plan: string; entitlements: Record<string, unknown> } | null;
};

async function loadSectionData(
  section: 'bots' | 'strategies' | 'exchange-connections' | 'trades' | 'portfolio' | 'billing',
): Promise<SectionData> {
  // Server Components cannot persist refreshed cookies. They still use a fresh
  // access token for this request; BFF route handlers persist refresh results.
  const session = await readSession(true, false);
  if (!session)
    return { kind: 'error', message: 'Your session is no longer available. Sign in again.' };
  try {
    const apiBaseUrl =
      process.env.API_BASE_URL ?? `http://localhost:${process.env.API_PORT ?? '3001'}`;
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/${section}`, {
      headers: { authorization: `Bearer ${session.accessToken}` },
      cache: 'no-store',
    });
    if (!response.ok)
      return { kind: 'error', message: `Could not load ${section}. Try again shortly.` };
    const payload: unknown = await response.json();
    if (section === 'bots') return { kind: 'bots', value: payload as BotRecord[] };
    if (section === 'strategies') return { kind: 'strategies', value: payload as StrategyRecord[] };
    if (section === 'exchange-connections')
      return { kind: 'exchange-connections', value: payload as ExchangeConnectionRecord[] };
    if (section === 'trades') return { kind: 'trades', value: payload as TradeRecord[] };
    if (section === 'billing') return { kind: 'billing', value: payload as BillingRecord };
    return { kind: 'positions', value: payload as PositionRecord[] };
  } catch {
    return { kind: 'error', message: `Could not connect to the API. Try again shortly.` };
  }
}

function SectionContent({ section, data }: { section: string; data: SectionData | null }) {
  if (section === 'bots')
    return (
      <>
        <Tabs
          active="active"
          tabs={[
            { id: 'active', label: 'Active' },
            { id: 'drafts', label: 'Drafts' },
            { id: 'archived', label: 'Archived' },
          ]}
        />
        {data?.kind === 'error' ? (
          <Alert tone="negative" title="Unable to load bots">
            {data.message}
          </Alert>
        ) : null}
        {data?.kind === 'bots' && data.value.length === 0 ? (
          <EmptyState
            title="No bots yet"
            description="Create a bot after selecting an active strategy."
          />
        ) : null}
        {data?.kind === 'bots' && data.value.length > 0 ? (
          <div className="content-stack">
            <DataTable
              columns={['Name', 'Mode', 'Capital', 'Status', 'Actions']}
              rows={data.value.map((bot) => [
                <b key={`${bot.id}-name`}>{bot.name}</b>,
                <Badge key={`${bot.id}-mode`} tone="brand">
                  {bot.tradingMode}
                </Badge>,
                <CurrencyDisplay
                  key={`${bot.id}-capital`}
                  value={Number(bot.configuration?.authorizedCapital ?? 0)}
                  currency={bot.configuration?.quoteCurrency ?? 'USD'}
                />,
                <Badge key={`${bot.id}-status`}>{bot.status}</Badge>,
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
      <Alert tone="negative" title="Unable to load strategies">
        {data.message}
      </Alert>
    ) : data?.kind === 'strategies' && data.value.length === 0 ? (
      <EmptyState
        title="No active strategies"
        description="Strategies will appear here when enabled by the platform."
      />
    ) : (
      <div className="card-grid">
        {data?.kind === 'strategies'
          ? data.value.map((strategy) => (
              <Card key={strategy.id}>
                <Badge tone="brand">{strategy.key}</Badge>
                <h2>{strategy.name}</h2>
                <p>{strategy.description}</p>
                {strategy.versions[0] ? (
                  <small>Version {strategy.versions[0].version}</small>
                ) : null}
                <Link className="rx-button" href="/bots">
                  Use strategy
                </Link>
              </Card>
            ))
          : null}
      </div>
    );
  if (section === 'exchange-connections')
    return (
      <>
        <Alert tone="warning" title="Trade-only access">
          Never enable withdrawals on an API key connected to RiseXPTO.
        </Alert>
        {data?.kind === 'error' ? (
          <Alert tone="negative" title="Unable to load connections">
            {data.message}
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
        <Alert title="Historical results">
          Past performance does not guarantee future results.
        </Alert>
        <EmptyState
          title="Backtesting is coming soon"
          description="The backtest engine is not connected to this workspace yet. No simulated results are shown."
        />
      </>
    );
  if (section === 'trades')
    return data?.kind === 'error' ? (
      <Alert tone="negative" title="Unable to load trades">
        {data.message}
      </Alert>
    ) : data?.kind === 'trades' && data.value.length === 0 ? (
      <EmptyState title="No trades yet" description="Executed Paper trades will appear here." />
    ) : (
      <DataTable
        columns={['Time', 'Pair', 'Side', 'Quantity', 'Price', 'Mode']}
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
      <Alert tone="negative" title="Unable to load portfolio">
        {data.message}
      </Alert>
    ) : data?.kind === 'positions' && data.value.length === 0 ? (
      <EmptyState
        title="No positions yet"
        description="Persisted Paper positions will appear here."
      />
    ) : (
      <DataTable
        columns={['Symbol', 'Quantity', 'Average price', 'P&L', 'Status', 'Mode']}
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
    return (
      <EmptyState
        title="Notifications are coming soon"
        description="Operational and risk events will appear here after the notification outbox is connected. No sample events are displayed."
      />
    );
  if (section === 'billing')
    return data?.kind === 'billing' ? (
      <BillingPanel />
    ) : (
      <Alert tone="negative" title="Unable to load billing">
        {data?.kind === 'error' ? data.message : 'Billing is unavailable.'}
      </Alert>
    );
  if (section === 'settings') return <PreferencesForm />;
  return (
    <>
      <Alert tone="warning" title="Restricted area">
        Admin access requires an explicit privileged role and audited actions.
      </Alert>
      <EmptyState
        title="Admin console is coming soon"
        description="Operational health, queues, risk events, exchange status, and kill-switch controls are not connected to this screen yet."
      />
    </>
  );
}

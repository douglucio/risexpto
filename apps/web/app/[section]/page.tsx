import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  CurrencyDisplay,
  DataTable,
  EmptyState,
  FormField,
  Input,
  Progress,
  Radio,
  Switch,
  Tabs,
} from '@risexpto/ui';
import { notFound } from 'next/navigation';
import { PageHeader } from '../../components/page-header';
import { PreferencesForm } from '../../components/preferences-form';
import { BotControls } from '../../components/bot-controls';
import { readSession } from '../../lib/auth/session';

const pages = {
  bots: ['Automation', 'Bots', 'Create, monitor, and control automated strategy instances.'],
  strategies: [
    'Library',
    'Strategies',
    'Choose versioned strategies that generate proposals without executing orders.',
  ],
  'exchange-connections': [
    'Connections',
    'Exchange connections',
    'Manage non-custodial, trade-only exchange access.',
  ],
  backtests: ['Research', 'Backtests', 'Evaluate strategies against historical market data.'],
  trades: ['Activity', 'Trades', 'Inspect proposals, orders, fills, and resulting positions.'],
  portfolio: ['Activity', 'Portfolio', 'Review persisted PAPER positions and realized results.'],
  risk: ['Controls', 'Risk', 'Define hard portfolio and bot-level execution limits.'],
  notifications: ['Inbox', 'Notifications', 'Review operational and risk-related events.'],
  billing: ['Workspace', 'Billing', 'Manage plan access, usage, and invoices.'],
  settings: ['Workspace', 'Settings', 'Manage profile, locale, display, and security preferences.'],
  admin: ['Operations', 'Admin', 'Restricted operational oversight placeholder.'],
} as const;

export function generateStaticParams() {
  return Object.keys(pages).map((section) => ({ section }));
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = pages[section as keyof typeof pages];
  if (!page) notFound();
  const data =
    section === 'bots' || section === 'strategies' || section === 'exchange-connections' || section === 'trades' || section === 'portfolio'
      ? await loadSectionData(section)
      : null;
  return (
    <>
      <PageHeader
        eyebrow={page[0]}
        title={page[1]}
        description={page[2]}
        action={<Button>{section === 'bots' ? 'Create bot' : 'Primary action'}</Button>}
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

async function loadSectionData(
  section: 'bots' | 'strategies' | 'exchange-connections' | 'trades' | 'portfolio',
): Promise<SectionData> {
  const session = await readSession(false);
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
    if (section === 'exchange-connections') return { kind: 'exchange-connections', value: payload as ExchangeConnectionRecord[] };
    if (section === 'trades') return { kind: 'trades', value: payload as TradeRecord[] };
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
                <BotControls key={`${bot.id}-actions`} id={bot.id} status={bot.status} tradingMode={bot.tradingMode} />,
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
        {data?.kind === 'exchange-connections' && data.value.length === 0 ? (
          <EmptyState
            title="No exchange connections"
            description="Add a trade-only Binance connection to use exchange-backed features."
          />
        ) : null}
        {data?.kind === 'exchange-connections' && data.value.length > 0 ? (
          <div className="card-grid content-stack">
            {data.value.map((connection) => (
              <Card key={connection.id}>
                <div className="section-heading">
                  <h2>{connection.label}</h2>
                  <Badge tone={connection.status === 'CONNECTED' ? 'positive' : 'negative'}>
                    {connection.status}
                  </Badge>
                </div>
                <p>
                  {connection.provider} · {connection.maskedApiKey}
                </p>
                {connection.status === 'UNSAFE_PERMISSIONS' ? (
                  <Alert tone="negative" title="Unsafe permissions">
                    Disable withdrawal permissions in Binance API Management and test the
                    connection again.
                  </Alert>
                ) : null}
                <Button>Test connection</Button>
              </Card>
            ))}
          </div>
        ) : null}
        <div className="card-grid content-stack">
          <EmptyState
            title="Add another connection"
            description="The MVP supports one Binance Spot connection."
            action={<Button disabled>Add exchange</Button>}
          />
        </div>
      </>
    );
  if (section === 'backtests')
    return (
      <>
        <Alert title="Historical results">
          Past performance does not guarantee future results.
        </Alert>
        <EmptyState
          title="No completed backtests"
          description="Configure a strategy and period to generate your first reproducible test."
          action={<Button>New backtest</Button>}
        />
      </>
    );
  if (section === 'trades')
    return data?.kind === 'error' ? (
      <Alert tone="negative" title="Unable to load trades">{data.message}</Alert>
    ) : data?.kind === 'trades' && data.value.length === 0 ? (
      <EmptyState title="No trades yet" description="Executed Paper trades will appear here." />
    ) : (
      <DataTable
        columns={['Time', 'Pair', 'Side', 'Quantity', 'Price', 'Mode']}
        rows={data?.kind === 'trades' ? data.value.map((trade) => [
          <span key={`${trade.id}-time`} className="rx-number">{new Date(trade.executedAt).toLocaleTimeString()}</span>,
          trade.symbol,
          <Badge key={`${trade.id}-side`} tone={trade.side === 'BUY' ? 'positive' : 'negative'}>{trade.side}</Badge>,
          trade.quantity,
          <CurrencyDisplay key={`${trade.id}-price`} value={Number(trade.price)} />,
          <Badge key={`${trade.id}-mode`} tone="brand">{trade.tradingMode}</Badge>,
        ]) : []}
      />
    );
  if (section === 'portfolio')
    return data?.kind === 'error' ? (
      <Alert tone="negative" title="Unable to load portfolio">{data.message}</Alert>
    ) : data?.kind === 'positions' && data.value.length === 0 ? (
      <EmptyState title="No positions yet" description="Persisted Paper positions will appear here." />
    ) : (
      <DataTable
        columns={['Symbol', 'Quantity', 'Average price', 'P&L', 'Status', 'Mode']}
        rows={data?.kind === 'positions' ? data.value.map((position) => [
          position.symbol,
          position.quantity,
          <CurrencyDisplay key={`${position.id}-price`} value={Number(position.averagePrice)} />,
          <CurrencyDisplay key={`${position.id}-pnl`} value={Number(position.realizedPnl)} />,
          <Badge key={`${position.id}-status`}>{position.status}</Badge>,
          <Badge key={`${position.id}-mode`} tone="brand">{position.tradingMode}</Badge>,
        ]) : []}
      />
    );
  if (section === 'risk')
    return (
      <div className="settings-grid">
        <Card>
          <h2>Portfolio limits</h2>
          <FormField label="Maximum allocation" hint="Across all bots">
            <Input defaultValue="40" inputMode="decimal" />
          </FormField>
          <FormField label="Maximum daily loss">
            <Input defaultValue="2" inputMode="decimal" />
          </FormField>
          <Progress value={38} label="Current allocation" />
        </Card>
        <Card>
          <h2>Execution policy</h2>
          <Switch label="Proposal cooldown" defaultChecked />
          <Checkbox label="Block symbols outside allowlist" defaultChecked />
          <Radio name="risk" label="Conservative" defaultChecked />
          <Radio name="risk" label="Custom" />
          <Button>Review changes</Button>
        </Card>
      </div>
    );
  if (section === 'notifications')
    return (
      <div className="content-stack">
        <Alert tone="negative" title="Risk proposal blocked">
          SOL/USDT exceeded the configured position exposure. No order was sent.
        </Alert>
        <Alert tone="positive" title="Backtest completed">
          DCA BTC 180D is ready to review.
        </Alert>
        <Alert title="Bot paused">Range ETH was paused by you at 18:12.</Alert>
      </div>
    );
  if (section === 'billing')
    return (
      <div className="settings-grid">
        <Card>
          <Badge tone="brand">PRO</Badge>
          <h2>Professional</h2>
          <p>
            <strong className="price">$49</strong> / month
          </p>
          <Progress value={40} label="Bot usage (4 of 10)" />
          <Button>Manage subscription</Button>
        </Card>
        <Card>
          <h2>Latest invoice</h2>
          <p>August 2026 · Paid</p>
          <CurrencyDisplay value={49} />
          <p>
            <Button>View invoices</Button>
          </p>
        </Card>
      </div>
    );
  if (section === 'settings') return <PreferencesForm />;
  return (
    <>
      <Alert tone="warning" title="Restricted area">
        Admin access requires an explicit privileged role and audited actions.
      </Alert>
      <EmptyState
        title="Admin console foundation"
        description="Operational modules will be implemented in Feature 25."
      />
    </>
  );
}

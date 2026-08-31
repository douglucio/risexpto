import {
  Alert,
  Badge,
  BotStatusIndicator,
  Button,
  Card,
  Checkbox,
  CurrencyDisplay,
  DataTable,
  EmptyState,
  FormField,
  Input,
  Pagination,
  Progress,
  Radio,
  RiskIndicator,
  Select,
  Switch,
  Tabs,
} from '@risexpto/ui';
import { notFound } from 'next/navigation';
import { PageHeader } from '../../components/page-header';

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
  return (
    <>
      <PageHeader
        eyebrow={page[0]}
        title={page[1]}
        description={page[2]}
        action={<Button>{section === 'bots' ? 'Create bot' : 'Primary action'}</Button>}
      />
      <SectionContent section={section} />
    </>
  );
}

function SectionContent({ section }: { section: string }) {
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
        <div className="content-stack">
          <DataTable
            columns={['Name', 'Mode', 'Capital', 'Status']}
            rows={[
              [
                <b key="1">Steady BTC</b>,
                <Badge key="2" tone="brand">
                  PAPER
                </Badge>,
                <CurrencyDisplay key="3" value={12000} />,
                <BotStatusIndicator key="4" status="RUNNING" />,
              ],
              [
                <b key="5">Range ETH</b>,
                <Badge key="6" tone="brand">
                  PAPER
                </Badge>,
                <CurrencyDisplay key="7" value={8000} />,
                <BotStatusIndicator key="8" status="PAUSED" />,
              ],
            ]}
          />
          <Pagination page={1} pages={3} />
        </div>
      </>
    );
  if (section === 'strategies')
    return (
      <div className="card-grid">
        <Card>
          <Badge tone="positive">LOW RISK</Badge>
          <h2>Dollar Cost Averaging</h2>
          <p>Recurring proposals with capital and frequency limits.</p>
          <RiskIndicator level="LOW" />
        </Card>
        <Card>
          <Badge tone="warning">MEDIUM RISK</Badge>
          <h2>Grid</h2>
          <p>Range-based proposal generation with controlled levels.</p>
          <RiskIndicator level="MEDIUM" />
        </Card>
        <Card>
          <Badge>COMING NEXT</Badge>
          <h2>Trend Following</h2>
          <p>Momentum-aware proposals with volatility controls.</p>
        </Card>
      </div>
    );
  if (section === 'exchange-connections')
    return (
      <>
        <Alert tone="warning" title="Trade-only access">
          Never enable withdrawals on an API key connected to RiseXPTO.
        </Alert>
        <div className="card-grid content-stack">
          <Card>
            <div className="section-heading">
              <h2>Binance Spot</h2>
              <Badge tone="positive">CONNECTED</Badge>
            </div>
            <p>Key ending ••••7K2M · checked 2 minutes ago</p>
            <Button>Test connection</Button>
          </Card>
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
    return (
      <DataTable
        columns={['Time', 'Pair', 'Side', 'Quantity', 'Price', 'Mode']}
        rows={[
          [
            <span key="1" className="rx-number">
              20:42:18
            </span>,
            'BTC/USDT',
            <Badge key="2" tone="positive">
              BUY
            </Badge>,
            '0.0042',
            <CurrencyDisplay key="3" value={64218.42} />,
            <Badge key="4" tone="brand">
              PAPER
            </Badge>,
          ],
          [
            <span key="5" className="rx-number">
              18:10:03
            </span>,
            'ETH/USDT',
            <Badge key="6" tone="negative">
              SELL
            </Badge>,
            '0.1200',
            <CurrencyDisplay key="7" value={3421.2} />,
            <Badge key="8" tone="brand">
              PAPER
            </Badge>,
          ],
        ]}
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
  if (section === 'settings')
    return (
      <div className="settings-grid">
        <Card>
          <h2>Regional preferences</h2>
          <FormField label="Language">
            <Select defaultValue="en">
              <option value="en">English</option>
              <option value="pt-BR">Português (Brasil)</option>
            </Select>
          </FormField>
          <FormField label="Reference currency">
            <Select>
              <option>USD</option>
              <option>BRL</option>
            </Select>
          </FormField>
          <Switch label="Dark theme" defaultChecked />
        </Card>
        <Card>
          <h2>Notifications</h2>
          <Checkbox label="Critical risk alerts" defaultChecked disabled />
          <Checkbox label="Bot lifecycle events" defaultChecked />
          <Checkbox label="Weekly performance summary" />
          <Button>Save preferences</Button>
        </Card>
      </div>
    );
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

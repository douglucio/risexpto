import {
  BotStatusIndicator,
  CurrencyDisplay,
  DataTable,
  KpiCard,
  PercentageDisplay,
  PnlIndicator,
  Progress,
  RiskIndicator,
} from '@risexpto/ui';
import { PageHeader } from '../components/page-header';

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Good evening, Ronaldo"
        description="Portfolio and automation status across your connected workspace."
      />
      <section className="kpi-grid" aria-label="Portfolio summary">
        <KpiCard
          label="Portfolio value"
          value={<CurrencyDisplay value={128420.36} />}
          detail={
            <span className="rx-positive">
              <PercentageDisplay value={2.84} /> this month
            </span>
          }
        />
        <KpiCard
          label="Allocated capital"
          value={<CurrencyDisplay value={48600} />}
          detail="37.8% of portfolio"
        />
        <KpiCard
          label="Realized P&L"
          value={<PnlIndicator value={3842.12} />}
          detail="Last 30 days"
        />
        <KpiCard label="Active bots" value="4" detail="All in PAPER mode" />
      </section>
      <section className="dashboard-grid">
        <div className="rx-card chart-card">
          <div className="section-heading">
            <div>
              <span>PERFORMANCE</span>
              <h2>Portfolio trajectory</h2>
            </div>
            <PercentageDisplay value={8.42} />
          </div>
          <div className="mock-chart" aria-label="Illustrative portfolio chart">
            <svg viewBox="0 0 600 180" role="img">
              <title>Portfolio performance trend</title>
              <defs>
                <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="var(--rx-color-brand)" stopOpacity=".28" />
                  <stop offset="1" stopColor="var(--rx-color-brand)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 150 C55 138 72 146 112 121 S177 132 218 94 S280 109 327 73 S388 82 430 48 S511 64 600 20 V180 H0Z"
                fill="url(#area)"
              />
              <path
                d="M0 150 C55 138 72 146 112 121 S177 132 218 94 S280 109 327 73 S388 82 430 48 S511 64 600 20"
                fill="none"
                stroke="var(--rx-color-brand)"
                strokeWidth="3"
              />
            </svg>
          </div>
        </div>
        <div className="rx-card risk-panel">
          <div className="section-heading">
            <div>
              <span>RISK CAPACITY</span>
              <h2>Within limits</h2>
            </div>
            <RiskIndicator level="LOW" />
          </div>
          <Progress value={38} label="Capital allocation" />
          <Progress value={24} label="Daily loss capacity" />
          <Progress value={42} label="Position exposure" />
          <p>Risk Engine evaluated 1,284 proposals today. 17 were blocked.</p>
        </div>
      </section>
      <section>
        <div className="section-heading">
          <div>
            <span>AUTOMATION</span>
            <h2>Running bots</h2>
          </div>
          <a href="/bots">View all</a>
        </div>
        <DataTable
          columns={['Bot', 'Strategy', 'Market', 'Status', 'P&L']}
          rows={[
            [
              <b key="a">Steady BTC</b>,
              'DCA',
              'BTC / USDT',
              <BotStatusIndicator key="b" status="RUNNING" />,
              <PnlIndicator key="c" value={842.12} />,
            ],
            [
              <b key="d">Range ETH</b>,
              'Grid',
              'ETH / USDT',
              <BotStatusIndicator key="e" status="PAUSED" />,
              <PnlIndicator key="f" value={-42.8} />,
            ],
            [
              <b key="g">Trend SOL</b>,
              'Trend',
              'SOL / USDT',
              <BotStatusIndicator key="h" status="RISK_BLOCKED" />,
              <PnlIndicator key="i" value={218.4} />,
            ],
          ]}
        />
      </section>
      <p className="risk-disclaimer">
        Paper Trading simulation. Past performance does not guarantee future results.
      </p>
    </>
  );
}

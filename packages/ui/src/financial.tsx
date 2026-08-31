import type { ReactNode } from 'react';
import { Badge, Card } from './primitives';

export function CurrencyDisplay({
  value,
  currency = 'USD',
  locale = 'en-US',
}: {
  value: number;
  currency?: string;
  locale?: string;
}) {
  return (
    <span className="rx-number">
      {new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)}
    </span>
  );
}
export function PercentageDisplay({ value }: { value: number }) {
  return (
    <span className="rx-number">
      {value > 0 ? '+' : ''}
      {value.toFixed(2)}%
    </span>
  );
}
export function PnlIndicator({ value }: { value: number }) {
  return (
    <span className={`rx-pnl ${value >= 0 ? 'rx-positive' : 'rx-negative'}`}>
      <span aria-hidden="true">{value >= 0 ? '↗' : '↘'}</span>
      <CurrencyDisplay value={value} />
    </span>
  );
}
export function RiskIndicator({ level }: { level: 'LOW' | 'MEDIUM' | 'HIGH' }) {
  return (
    <Badge tone={level === 'LOW' ? 'positive' : level === 'MEDIUM' ? 'warning' : 'negative'}>
      Risk: {level}
    </Badge>
  );
}
export function BotStatusIndicator({
  status,
}: {
  status: 'RUNNING' | 'PAUSED' | 'STOPPED' | 'RISK_BLOCKED';
}) {
  const tone =
    status === 'RUNNING'
      ? 'positive'
      : status === 'RISK_BLOCKED'
        ? 'negative'
        : status === 'PAUSED'
          ? 'warning'
          : 'neutral';
  return (
    <Badge tone={tone}>
      <i className="rx-status-dot" aria-hidden="true" />
      {status.replace('_', ' ')}
    </Badge>
  );
}
export function KpiCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <Card className="rx-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </Card>
  );
}
export function DataTable({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  return (
    <div className="rx-table-wrap">
      <table className="rx-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

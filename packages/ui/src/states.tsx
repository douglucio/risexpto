import type { ReactNode } from 'react';
import { Button, Card } from './primitives';

function State({
  symbol,
  title,
  description,
  action,
}: {
  symbol: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="rx-state">
      <span className="rx-state-symbol" aria-hidden="true">
        {symbol}
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </Card>
  );
}
export function EmptyState({
  title = 'Nothing here yet',
  description = 'New records will appear here.',
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return <State symbol="○" title={title} description={description} action={action} />;
}
export function ErrorState({ retry }: { retry?: () => void }) {
  return (
    <State
      symbol="!"
      title="Unable to load data"
      description="The request could not be completed. No financial operation was submitted."
      action={retry && <Button onClick={retry}>Try again</Button>}
    />
  );
}

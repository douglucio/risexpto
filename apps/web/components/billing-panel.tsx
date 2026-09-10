'use client';

import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Progress } from '@risexpto/ui';

type Billing = {
  mode: string;
  subscription: { status: string; plan: string; entitlements: Record<string, unknown> } | null;
};

export function BillingPanel() {
  const [billing, setBilling] = useState<Billing | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    void fetch('/api/billing').then(async (response) =>
      response.ok
        ? setBilling((await response.json()) as Billing)
        : setMessage('Could not load billing data.'),
    );
  }, []);
  async function checkout(planKey: string) {
    setMessage(null);
    const response = await fetch('/api/billing', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ planKey }),
    });
    const payload = (await response.json()) as { url?: string; message?: string };
    if (!response.ok || !payload.url) {
      setMessage(payload.message ?? 'Checkout is unavailable.');
      return;
    }
    window.location.assign(payload.url);
  }
  async function portal() {
    const response = await fetch('/api/billing/portal', { method: 'POST' });
    const payload = (await response.json()) as { url?: string; message?: string };
    if (!response.ok || !payload.url) {
      setMessage(payload.message ?? 'Billing portal is unavailable.');
      return;
    }
    window.location.assign(payload.url);
  }
  if (!billing)
    return message ? (
      <Alert tone="negative" title="Billing">
        {message}
      </Alert>
    ) : (
      <Card>Loading billing…</Card>
    );
  const subscription = billing.subscription;
  const maxBots =
    typeof subscription?.entitlements.maxBots === 'number'
      ? subscription.entitlements.maxBots
      : 'not available';
  return (
    <div className="settings-grid content-stack">
      <Card className="content-stack">
        <div className="section-heading">
          <h2>{subscription?.plan ?? 'No active plan'}</h2>
          <Badge tone="warning">{billing.mode} MODE</Badge>
        </div>
        <p>
          {subscription
            ? `Subscription status: ${subscription.status}`
            : 'Choose a plan to enable account entitlements.'}
        </p>
        {subscription ? (
          <>
            <Progress value={0} label={`Bot limit: ${maxBots}`} />
            <Button onClick={() => void portal()}>Manage subscription</Button>
          </>
        ) : (
          <>
            <Button onClick={() => void checkout('STARTER')}>Start Starter Test plan</Button>
            <Button onClick={() => void checkout('PRO')}>Choose Professional Test plan</Button>
          </>
        )}
      </Card>
      {message ? (
        <Alert tone="negative" title="Billing">
          {message}
        </Alert>
      ) : null}
    </div>
  );
}

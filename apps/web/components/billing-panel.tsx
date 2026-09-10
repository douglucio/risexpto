'use client';

import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Progress } from '@risexpto/ui';
import { translate } from '@risexpto/i18n';
import { useLocale } from './locale-provider';

type Billing = {
  mode: string;
  subscription: { status: string; plan: string; entitlements: Record<string, unknown> } | null;
};

export function BillingPanel() {
  const { locale } = useLocale();
  const t = (key: string) => translate(key, locale);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    void fetch('/api/billing').then(async (response) =>
      response.ok
        ? setBilling((await response.json()) as Billing)
        : setMessage(t('workspace.billingUnavailable')),
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
      setMessage(payload.message ?? t('workspace.checkoutUnavailable'));
      return;
    }
    window.location.assign(payload.url);
  }
  async function portal() {
    const response = await fetch('/api/billing/portal', { method: 'POST' });
    const payload = (await response.json()) as { url?: string; message?: string };
    if (!response.ok || !payload.url) {
      setMessage(payload.message ?? t('workspace.portalUnavailable'));
      return;
    }
    window.location.assign(payload.url);
  }
  if (!billing)
    return message ? (
      <Alert tone="negative" title={t('nav.billing')}>
        {message}
      </Alert>
    ) : (
      <Card>{t('workspace.loadingBilling')}</Card>
    );
  const subscription = billing.subscription;
  const maxBots =
    typeof subscription?.entitlements.maxBots === 'number'
      ? subscription.entitlements.maxBots
      : t('dashboard.unavailable');
  return (
    <div className="settings-grid content-stack">
      <Card className="content-stack">
        <div className="section-heading">
          <h2>{subscription?.plan ?? t('workspace.noActivePlan')}</h2>
          <Badge tone="warning">{billing.mode} MODE</Badge>
        </div>
        <p>
          {subscription
            ? `${t('workspace.subscriptionStatus')}: ${subscription.status}`
            : t('workspace.choosePlan')}
        </p>
        {subscription ? (
          <>
            <Progress value={0} label={`${t('workspace.botLimit')}: ${maxBots}`} />
            <Button onClick={() => void portal()}>{t('workspace.manageSubscription')}</Button>
          </>
        ) : (
          <>
            <Button onClick={() => void checkout('STARTER')}>{t('workspace.startStarter')}</Button>
            <Button onClick={() => void checkout('PRO')}>
              {t('workspace.chooseProfessional')}
            </Button>
          </>
        )}
      </Card>
      {message ? (
        <Alert tone="negative" title={t('nav.billing')}>
          {message}
        </Alert>
      ) : null}
    </div>
  );
}

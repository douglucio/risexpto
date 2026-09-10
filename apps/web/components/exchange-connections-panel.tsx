'use client';

import { useState } from 'react';
import { Alert, Badge, Button, Card, FormField, Input } from '@risexpto/ui';
import { tradingProviders } from '@risexpto/shared';
import { translate } from '@risexpto/i18n';
import { useLocale } from './locale-provider';

type Connection = {
  id: string;
  provider: string;
  label: string;
  status: string;
  maskedApiKey: string;
  permissions?: string[];
  lastCheckedAt?: string | null;
};

export function ExchangeConnectionsPanel({ initial }: { initial: Connection[] }) {
  const { locale } = useLocale();
  const t = (key: string) => translate(key, locale);
  const [connections, setConnections] = useState(initial);
  const [label, setLabel] = useState('Binance Testnet');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/exchange-connections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label, apiKey, apiSecret }),
      });
      if (!response.ok) throw new Error(t('workspace.couldNotSaveConnection'));
      const created = (await response.json()) as Connection;
      setConnections((current) => [created, ...current]);
      setApiKey('');
      setApiSecret('');
      setMessage(t('workspace.exchangeSaved'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('workspace.couldNotSaveConnection'));
    } finally {
      setBusy(false);
    }
  }

  async function test(id: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/exchange-connections/${encodeURIComponent(id)}/test`, {
        method: 'POST',
      });
      const payload = (await response.json()) as { status?: string; message?: string };
      if (!response.ok) throw new Error(payload.message ?? t('workspace.exchangeTestFailed'));
      setConnections((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: payload.status ?? item.status } : item,
        ),
      );
      setMessage(t('workspace.testnetConnection'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('workspace.exchangeTestFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/exchange-connections/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(t('workspace.couldNotSaveConnection'));
      setConnections((current) => current.filter((item) => item.id !== id));
      setMessage(t('workspace.exchangeRevoked'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('workspace.couldNotSaveConnection'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="content-stack">
      <Card className="content-stack">
        <h2>{t('workspace.chooseProvider')}</h2>
        <p>{t('workspace.providerRoadmap')}</p>
        <div className="provider-grid">
          {tradingProviders.map((provider) => (
            <div key={provider.id} className="provider-option">
              <div>
                <strong>{provider.displayName}</strong>
                <small>{provider.marketTypes.join(' · ')}</small>
              </div>
              <Badge tone={provider.status === 'AVAILABLE' ? 'positive' : 'warning'}>
                {provider.status === 'AVAILABLE'
                  ? t('workspace.available')
                  : t('workspace.comingSoon')}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
      <Card className="content-stack">
        <div className="section-heading">
          <h2>{t('workspace.yourConnections')}</h2>
          <Badge tone="warning">TESTNET</Badge>
        </div>
        <p>{t('workspace.providerChoose')}</p>
        <p>{t('workspace.withdrawalsWarning')}</p>
        <FormField label={t('workspace.label')}>
          <Input value={label} onChange={(event) => setLabel(event.target.value)} />
        </FormField>
        <FormField label={t('workspace.apiKey')}>
          <Input
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            autoComplete="off"
          />
        </FormField>
        <FormField label={t('workspace.apiSecret')}>
          <Input
            type="password"
            value={apiSecret}
            onChange={(event) => setApiSecret(event.target.value)}
            autoComplete="new-password"
          />
        </FormField>
        <Button
          disabled={busy || !label.trim() || !apiKey.trim() || !apiSecret.trim()}
          onClick={() => void add()}
        >
          {t('workspace.saveTestnet')}
        </Button>
      </Card>
      {message ? (
        <Alert tone="info" title={t('workspace.exchangeConnection')}>
          {message}
        </Alert>
      ) : null}
      {connections.map((connection) => (
        <Card key={connection.id} className="content-stack">
          <div className="section-heading">
            <h2>{connection.label}</h2>
            <Badge tone={connection.status === 'CONNECTED' ? 'positive' : 'negative'}>
              {connection.status}
            </Badge>
          </div>
          <p>
            {connection.provider} · {connection.maskedApiKey} · TESTNET
          </p>
          {connection.permissions?.length ? (
            <p>Permissions: {connection.permissions.join(', ')}</p>
          ) : null}
          <div className="section-heading">
            <Button disabled={busy} onClick={() => void test(connection.id)}>
              {t('workspace.testConnection')}
            </Button>
            <Button disabled={busy} onClick={() => void revoke(connection.id)}>
              {t('workspace.revoke')}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Alert, Badge, Button, Card, FormField, Input } from '@risexpto/ui';

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
  const [connections, setConnections] = useState(initial);
  const [label, setLabel] = useState('Binance Testnet');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch('/api/exchange-connections', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label, apiKey, apiSecret }),
      });
      if (!response.ok) throw new Error('Could not save the Binance connection.');
      const created = await response.json() as Connection;
      setConnections((current) => [created, ...current]);
      setApiKey(''); setApiSecret('');
      setMessage('Connection saved. The secret will not be shown again.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save connection.'); }
    finally { setBusy(false); }
  }

  async function test(id: string) {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/exchange-connections/${encodeURIComponent(id)}/test`, { method: 'POST' });
      const payload = await response.json() as { status?: string; message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Connection test failed.');
      setConnections((current) => current.map((item) => item.id === id ? { ...item, status: payload.status ?? item.status } : item));
      setMessage('Binance Testnet connection tested.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Connection test failed.'); }
    finally { setBusy(false); }
  }

  async function revoke(id: string) {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/exchange-connections/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not revoke connection.');
      setConnections((current) => current.filter((item) => item.id !== id));
      setMessage('Connection revoked.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not revoke connection.'); }
    finally { setBusy(false); }
  }

  return <div className="content-stack">
    <Card className="content-stack">
      <div className="section-heading"><h2>Your connections</h2><Badge tone="warning">TESTNET</Badge></div>
      <p>Choose a trading provider. Binance is available now; other providers are coming soon.</p>
      <p>Use a Spot Testnet key with withdrawals disabled. The API secret is encrypted and never returned.</p>
      <FormField label="Label"><Input value={label} onChange={(event) => setLabel(event.target.value)} /></FormField>
      <FormField label="API key"><Input value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" /></FormField>
      <FormField label="API secret"><Input type="password" value={apiSecret} onChange={(event) => setApiSecret(event.target.value)} autoComplete="new-password" /></FormField>
      <Button disabled={busy || !label.trim() || !apiKey.trim() || !apiSecret.trim()} onClick={() => void add()}>Save Testnet connection</Button>
    </Card>
    {message ? <Alert tone="info" title="Exchange connection">{message}</Alert> : null}
    {connections.map((connection) => <Card key={connection.id} className="content-stack">
      <div className="section-heading"><h2>{connection.label}</h2><Badge tone={connection.status === 'CONNECTED' ? 'positive' : 'negative'}>{connection.status}</Badge></div>
      <p>{connection.provider} · {connection.maskedApiKey} · TESTNET</p>
      {connection.permissions?.length ? <p>Permissions: {connection.permissions.join(', ')}</p> : null}
      <div className="section-heading"><Button disabled={busy} onClick={() => void test(connection.id)}>Test connection</Button><Button disabled={busy} onClick={() => void revoke(connection.id)}>Revoke</Button></div>
    </Card>)}
  </div>;
}

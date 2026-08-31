'use client';

import { Alert, Button, Card, Checkbox, FormField, Select, Switch } from '@risexpto/ui';
import { useEffect, useState, type FormEvent } from 'react';

type Preferences = { locale: 'en' | 'pt-BR'; timezone: string; currency: 'USD' | 'BRL' | 'EUR' };
type Profile = { name: string; email: string; emailVerified: boolean };
const defaults: Preferences = { locale: 'en', timezone: 'UTC', currency: 'USD' };

export function PreferencesForm() {
  const [preferences, setPreferences] = useState(defaults);
  const [user, setUser] = useState<Profile | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  useEffect(() => {
    void fetch('/auth/session', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) return;
      const body = (await response.json()) as { preferences: Preferences; user: Profile };
      setPreferences(body.preferences);
      setUser(body.user);
    });
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus('saving');
    const response = await fetch('/auth/preferences', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(preferences),
    });
    setStatus(response.ok ? 'saved' : 'error');
  }
  return (
    <form className="settings-grid" onSubmit={(event) => void submit(event)}>
      <Card>
        <h2>Profile</h2>
        <dl className="profile-list">
          <div>
            <dt>Name</dt>
            <dd>{user?.name ?? 'Loading…'}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user?.email ?? 'Loading…'}</dd>
          </div>
          <div>
            <dt>Verification</dt>
            <dd>{user?.emailVerified ? 'Verified' : 'Required'}</dd>
          </div>
        </dl>
        <a className="auth-link" href="/auth/login?action=recover">
          Change password securely
        </a>
      </Card>
      <Card>
        <h2>Regional preferences</h2>
        <FormField label="Language">
          <Select
            value={preferences.locale}
            onChange={(event) =>
              setPreferences({
                ...preferences,
                locale: event.target.value as Preferences['locale'],
              })
            }
          >
            <option value="en">English</option>
            <option value="pt-BR">Português (Brasil)</option>
          </Select>
        </FormField>
        <FormField label="Timezone">
          <Select
            value={preferences.timezone}
            onChange={(event) => setPreferences({ ...preferences, timezone: event.target.value })}
          >
            <option value="UTC">UTC</option>
            <option value="America/Sao_Paulo">America/São Paulo</option>
            <option value="America/New_York">America/New York</option>
            <option value="Europe/London">Europe/London</option>
          </Select>
        </FormField>
        <FormField label="Reference currency">
          <Select
            value={preferences.currency}
            onChange={(event) =>
              setPreferences({
                ...preferences,
                currency: event.target.value as Preferences['currency'],
              })
            }
          >
            <option>USD</option>
            <option>BRL</option>
            <option>EUR</option>
          </Select>
        </FormField>
        <Switch label="Dark theme" defaultChecked />
      </Card>
      <Card>
        <h2>Notifications</h2>
        <Checkbox label="Critical risk alerts" defaultChecked disabled />
        <Checkbox label="Bot lifecycle events" defaultChecked />
        <Checkbox label="Weekly performance summary" />
        {status === 'saved' && (
          <Alert tone="positive" title="Preferences saved">
            Your secure session was updated.
          </Alert>
        )}
        {status === 'error' && (
          <Alert tone="negative" title="Unable to save">
            No preference was changed.
          </Alert>
        )}
        <Button disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save preferences'}
        </Button>
      </Card>
    </form>
  );
}

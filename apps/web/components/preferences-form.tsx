'use client';

import { Alert, Button, Card, Checkbox, FormField, Select, Switch } from '@risexpto/ui';
import { useEffect, useState, type FormEvent } from 'react';
import { useLocale } from './locale-provider';
import { translate } from '@risexpto/i18n';

type Preferences = {
  locale: 'en' | 'pt-BR' | 'es';
  timezone: string;
  currency: 'USD' | 'BRL' | 'EUR';
};
type Profile = { name: string; email: string; emailVerified: boolean };
const defaults: Preferences = { locale: 'en', timezone: 'UTC', currency: 'USD' };

export function PreferencesForm() {
  const { locale, setLocale } = useLocale();
  const t = (key: string) => translate(key, locale);
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
    const nextPreferences = { ...preferences, locale };
    const [sessionResponse, profileResponse] = await Promise.all([
      fetch('/auth/preferences', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(nextPreferences),
      }),
      fetch('/api/profile/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(nextPreferences),
      }),
    ]);
    setStatus(sessionResponse.ok && profileResponse.ok ? 'saved' : 'error');
  }
  return (
    <form className="settings-grid" onSubmit={(event) => void submit(event)}>
      <Card>
        <h2>{t('settings.profile')}</h2>
        <dl className="profile-list">
          <div>
            <dt>{t('settings.name')}</dt>
            <dd>{user?.name ?? t('workspace.loading')}</dd>
          </div>
          <div>
            <dt>{t('settings.email')}</dt>
            <dd>{user?.email ?? t('workspace.loading')}</dd>
          </div>
          <div>
            <dt>{t('settings.verification')}</dt>
            <dd>{user?.emailVerified ? t('settings.verified') : t('settings.required')}</dd>
          </div>
        </dl>
        <a className="auth-link" href="/auth/login?action=recover">
          {t('settings.changePassword')}
        </a>
      </Card>
      <Card>
        <h2>{t('settings.regional')}</h2>
        <FormField label={t('settings.language')}>
          <Select
            value={preferences.locale}
            onChange={(event) => {
              setPreferences({
                ...preferences,
                locale: event.target.value as Preferences['locale'],
              });
              setLocale(event.target.value as Preferences['locale']);
            }}
          >
            <option value="en">English</option>
            <option value="pt-BR">Português (Brasil)</option>
            <option value="es">Español</option>
          </Select>
        </FormField>
        <FormField label={t('settings.timezone')}>
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
        <FormField label={t('settings.currency')}>
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
        <Switch label={t('workspace.darkTheme')} defaultChecked />
      </Card>
      <Card>
        <h2>{t('nav.notifications')}</h2>
        <Checkbox label={t('settings.criticalAlerts')} defaultChecked disabled />
        <Checkbox label={t('settings.botEvents')} defaultChecked />
        <Checkbox label={t('settings.weeklySummary')} />
        {status === 'saved' && (
          <Alert tone="positive" title={t('settings.saved')}>
            {t('settings.sessionUpdated')}
          </Alert>
        )}
        {status === 'error' && (
          <Alert tone="negative" title={t('settings.saveError')}>
            {t('settings.noChange')}
          </Alert>
        )}
        <Button disabled={status === 'saving'}>
          {status === 'saving' ? t('settings.saving') : t('settings.save')}
        </Button>
      </Card>
    </form>
  );
}

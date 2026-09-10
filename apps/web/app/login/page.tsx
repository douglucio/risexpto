import { Alert, Card } from '@risexpto/ui';
import { normalizeLocale, translate } from '@risexpto/i18n';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string; locale?: string }>;
}) {
  const { error, returnTo = '/dashboard', locale: requestedLocale } = await searchParams;
  const locale = normalizeLocale(requestedLocale);
  const t = (key: string) => translate(key, locale);
  const encodedReturnTo = encodeURIComponent(returnTo);
  return (
    <div className="auth-page">
      <Card className="auth-card">
        <div className="auth-mark">R</div>
        <h1>{t('auth.welcome')}</h1>
        <p>{t('auth.description')}</p>
        {error && (
          <Alert tone="negative" title={t(errorTitleKey(error ?? ''))}>
            {t(errorMessageKey(error ?? ''))}
          </Alert>
        )}
        <a
          className="rx-button auth-action"
          href={`/auth/login?returnTo=${encodedReturnTo}&locale=${locale}`}
        >
          {t('auth.signIn')}
        </a>
        <a
          className="auth-link"
          href={`/auth/login?action=register&returnTo=${encodedReturnTo}&locale=${locale}`}
        >
          {t('auth.createAccount')}
        </a>
        <a className="auth-link" href={`/auth/login?action=recover&locale=${locale}`}>
          {t('auth.recover')}
        </a>
        <small>{t('auth.disclaimer')}</small>
      </Card>
    </div>
  );
}

function errorTitleKey(error: string): string {
  if (error === 'email_not_verified') return 'auth.error.emailTitle';
  if (error === 'code_expired') return 'auth.error.expiredTitle';
  if (error === 'invalid_state_or_pkce') return 'auth.error.sessionTitle';
  if (error === 'identity_claims_missing') return 'auth.error.profileTitle';
  return 'auth.error.failedTitle';
}

function errorMessageKey(error: string): string {
  if (error === 'email_not_verified') return 'auth.error.emailMessage';
  if (error === 'code_expired') return 'auth.error.expiredMessage';
  if (error === 'invalid_state_or_pkce') return 'auth.error.sessionMessage';
  if (error === 'identity_claims_missing') return 'auth.error.profileMessage';
  if (error === 'access_token_audience_invalid') return 'auth.error.audienceMessage';
  if (error === 'id_token_invalid' || error === 'token_invalid') return 'auth.error.tokenMessage';
  if (error === 'token_exchange_failed') return 'auth.error.exchangeMessage';
  return 'auth.error.genericMessage';
}

import { Alert, Card } from '@risexpto/ui';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const { error, returnTo = '/' } = await searchParams;
  const encodedReturnTo = encodeURIComponent(returnTo);
  return (
    <div className="auth-page">
      <Card className="auth-card">
        <div className="auth-mark">R</div>
        <h1>Welcome to RiseXPTO</h1>
        <p>
          Sign in through our secure identity service. Your trading credentials are never part of
          your login.
        </p>
        {error && (
          <Alert tone="negative" title={errorTitle(error)}>
            {errorMessage(error)}
          </Alert>
        )}
        <a className="rx-button auth-action" href={`/auth/login?returnTo=${encodedReturnTo}`}>
          Sign in
        </a>
        <a className="auth-link" href={`/auth/login?action=register&returnTo=${encodedReturnTo}`}>
          Create account
        </a>
        <a className="auth-link" href="/auth/login?action=recover">
          Recover password
        </a>
        <small>
          By continuing, you acknowledge that trading involves risk and returns are not guaranteed.
        </small>
      </Card>
    </div>
  );
}

function errorTitle(error: string): string {
  if (error === 'email_not_verified') return 'Email verification required';
  if (error === 'code_expired') return 'Login expired';
  if (error === 'invalid_state_or_pkce') return 'Login session invalid';
  if (error === 'identity_claims_missing') return 'Profile incomplete';
  return 'Authentication failed';
}

function errorMessage(error: string): string {
  if (error === 'email_not_verified') return 'Verify your email in Keycloak before continuing.';
  if (error === 'code_expired') return 'This login attempt expired. Start a new sign-in attempt.';
  if (error === 'invalid_state_or_pkce')
    return 'The login session was invalid or expired. Try again.';
  if (error === 'identity_claims_missing')
    return 'Your Keycloak profile is missing a valid email. Update it and try again.';
  if (error === 'access_token_audience_invalid')
    return 'The identity service returned a token for the wrong application.';
  if (error === 'id_token_invalid' || error === 'token_invalid')
    return 'The identity token could not be validated safely.';
  if (error === 'token_exchange_failed')
    return 'The authorization code could not be exchanged. Start a new sign-in attempt.';
  return 'The login could not be completed safely. Please try again.';
}

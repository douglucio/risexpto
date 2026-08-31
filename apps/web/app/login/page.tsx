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
          <Alert tone="negative" title="Authentication failed">
            The login could not be completed safely. Please try again.
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

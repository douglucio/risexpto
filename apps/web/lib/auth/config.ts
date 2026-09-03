export type AuthConfig = Readonly<{
  issuer: string;
  clientId: string;
  apiAudience: string;
  baseUrl: string;
  sessionSecret: string;
  secureCookies: boolean;
}>;

export function authConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const issuerBase = required(env.KEYCLOAK_URL, 'KEYCLOAK_URL').replace(/\/$/, '');
  const realm = required(env.KEYCLOAK_REALM, 'KEYCLOAK_REALM');
  const baseUrl = required(env.AUTH_BASE_URL, 'AUTH_BASE_URL').replace(/\/$/, '');
  const sessionSecret = required(env.AUTH_SESSION_SECRET, 'AUTH_SESSION_SECRET');
  if (new TextEncoder().encode(sessionSecret).length < 32) {
    throw new Error('AUTH_SESSION_SECRET must contain at least 32 bytes');
  }
  return {
    issuer: `${issuerBase}/realms/${encodeURIComponent(realm)}`,
    clientId: required(env.KEYCLOAK_CLIENT_ID, 'KEYCLOAK_CLIENT_ID'),
    apiAudience: required(env.KEYCLOAK_API_AUDIENCE, 'KEYCLOAK_API_AUDIENCE'),
    baseUrl,
    sessionSecret,
    secureCookies: new URL(baseUrl).protocol === 'https:',
  };
}

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

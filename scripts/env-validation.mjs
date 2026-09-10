export function validateDevelopmentEnvironment(env = process.env) {
  const required = [
    'DATABASE_URL',
    'REDIS_URL',
    'KEYCLOAK_URL',
    'KEYCLOAK_REALM',
    'KEYCLOAK_CLIENT_ID',
    'KEYCLOAK_API_AUDIENCE',
    'AUTH_BASE_URL',
    'AUTH_SESSION_SECRET',
    'BINANCE_CREDENTIAL_MASTER_KEY',
    'BINANCE_TRADING_ENVIRONMENT',
    'BINANCE_TESTNET_BASE_URL',
  ];
  for (const name of required)
    if (!env[name]?.trim()) throw new Error(`${name} is required for development`);
  if (env.NODE_ENV !== 'development') throw new Error('pnpm dev requires NODE_ENV=development');
  if (env.BINANCE_BASE_URL?.trim())
    throw new Error('BINANCE_BASE_URL is obsolete; use BINANCE_TESTNET_BASE_URL explicitly');
  if (env.BINANCE_TRADING_ENVIRONMENT.trim().toUpperCase() !== 'TESTNET')
    throw new Error(
      'Development private Binance paths require BINANCE_TRADING_ENVIRONMENT=TESTNET',
    );
  if (env.BINANCE_TESTNET_BASE_URL.trim() !== 'https://testnet.binance.vision')
    throw new Error('BINANCE_TESTNET_BASE_URL must be https://testnet.binance.vision');
  if (env.BINANCE_PRODUCTION_BASE_URL?.trim() === env.BINANCE_TESTNET_BASE_URL.trim())
    throw new Error('Binance Testnet and Production URLs must not be identical');
  if (byteLength(env.AUTH_SESSION_SECRET) < 32)
    throw new Error('AUTH_SESSION_SECRET must contain at least 32 bytes');
  if (decodeBase64Url(env.BINANCE_CREDENTIAL_MASTER_KEY).byteLength !== 32)
    throw new Error('BINANCE_CREDENTIAL_MASTER_KEY must decode to exactly 32 bytes');
  if (env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.startsWith('sk_test_'))
    throw new Error('Development Stripe configuration accepts only sk_test_ keys');
  return true;
}

function byteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}
function decodeBase64Url(value) {
  try {
    return Buffer.from(value, 'base64url');
  } catch {
    throw new Error('BINANCE_CREDENTIAL_MASTER_KEY must be a valid base64url value');
  }
}

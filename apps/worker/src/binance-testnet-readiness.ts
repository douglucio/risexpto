export type ReadinessCheck = { name: string; ok: boolean; detail: string };
const TESTNET_BASE_URL = 'https://testnet.binance.vision';

export function evaluateTestnetReadiness(env: NodeJS.ProcessEnv = process.env): ReadinessCheck[] {
  const baseUrl = env.BINANCE_TESTNET_BASE_URL;
  return [
    {
      name: 'environment',
      ok: env.BINANCE_TRADING_ENVIRONMENT === 'TESTNET',
      detail: env.BINANCE_TRADING_ENVIRONMENT === 'TESTNET' ? 'TESTNET' : 'requires BINANCE_TRADING_ENVIRONMENT=TESTNET',
    },
    {
      name: 'endpoint',
      ok: (baseUrl ?? TESTNET_BASE_URL) === TESTNET_BASE_URL,
      detail: baseUrl ?? 'connector uses the fixed Testnet endpoint',
    },
    {
      name: 'live-flag',
      ok: env.LIVE_TRADING_ENABLED !== 'true' || env.BINANCE_TRADING_ENVIRONMENT === 'TESTNET',
      detail: env.LIVE_TRADING_ENABLED === 'true' ? 'LIVE enabled only on TESTNET' : 'LIVE disabled by default',
    },
    {
      name: 'api-key',
      ok: Boolean(env.BINANCE_TESTNET_API_KEY),
      detail: env.BINANCE_TESTNET_API_KEY ? 'configured (value hidden)' : 'missing BINANCE_TESTNET_API_KEY',
    },
    {
      name: 'api-secret',
      ok: Boolean(env.BINANCE_TESTNET_API_SECRET),
      detail: env.BINANCE_TESTNET_API_SECRET ? 'configured (value hidden)' : 'missing BINANCE_TESTNET_API_SECRET',
    },
    {
      name: 'database',
      ok: Boolean(env.DATABASE_URL || env.E2E_DATABASE_URL),
      detail: env.DATABASE_URL || env.E2E_DATABASE_URL ? 'connection string configured' : 'missing DATABASE_URL/E2E_DATABASE_URL',
    },
    {
      name: 'redis',
      ok: Boolean(env.REDIS_URL || env.E2E_REDIS_URL),
      detail: env.REDIS_URL || env.E2E_REDIS_URL ? 'connection string configured' : 'missing REDIS_URL/E2E_REDIS_URL',
    },
  ];
}

if (process.env.NODE_ENV !== 'test') {
  const checks = evaluateTestnetReadiness();
  console.log(JSON.stringify({ environment: 'TESTNET', ready: checks.every((check) => check.ok), checks }));
  if (checks.some((check) => !check.ok)) process.exitCode = 1;
}

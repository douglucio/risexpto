import { ServiceUnavailableException } from '@nestjs/common';

export const BINANCE_TESTNET_BASE_URL = 'https://testnet.binance.vision';

/**
 * Resolve the private Binance endpoint without allowing an ambiguous fallback.
 * Production remains intentionally unavailable until an explicit human gate.
 */
export function resolveBinancePrivateBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const environment = env.BINANCE_TRADING_ENVIRONMENT?.trim().toUpperCase();
  if (environment !== 'TESTNET') {
    throw new ServiceUnavailableException(
      'Binance private connections are disabled unless BINANCE_TRADING_ENVIRONMENT=TESTNET',
    );
  }

  const configured = (env.BINANCE_TESTNET_BASE_URL ?? BINANCE_TESTNET_BASE_URL).trim();
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new ServiceUnavailableException('BINANCE_TESTNET_BASE_URL must be a valid HTTPS URL');
  }
  if (url.protocol !== 'https:' || url.origin !== BINANCE_TESTNET_BASE_URL)
    throw new ServiceUnavailableException(
      'Binance Testnet requires BINANCE_TESTNET_BASE_URL=https://testnet.binance.vision',
    );
  return url.origin;
}

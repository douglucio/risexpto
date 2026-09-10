import { BinanceSpotTestnetConnector, CredentialVault } from '@risexpto/binance-connection';
import type { BinanceSpotTestnetConnector as BinanceSpotTestnetConnectorType } from '@risexpto/binance-connection';
import type { PrismaClient } from '@risexpto/database';
import { LiveExecutionEngine } from '@risexpto/live-execution';
import { PrismaLiveOrderStore, type LiveOrderContextResolver } from './live-order-store.js';

export type TestnetLiveRuntime = {
  engine: LiveExecutionEngine;
  connector: BinanceSpotTestnetConnectorType;
};

export async function createTestnetLiveExecutionEngine(
  database: PrismaClient,
  exchangeConnectionId: string,
  resolveContext: LiveOrderContextResolver,
): Promise<TestnetLiveRuntime> {
  assertTestnetLiveEnabled();
  const connection = await database.exchangeConnection.findFirst({
    where: { id: exchangeConnectionId, provider: 'BINANCE', status: 'CONNECTED', revokedAt: null },
    select: {
      apiKeyCiphertext: true,
      apiSecretCiphertext: true,
      encryptionKeyVersion: true,
      revokedAt: true,
    },
  });
  if (!connection) throw new Error('LIVE_TESTNET_CONNECTION_NOT_FOUND');
  const masterKey = process.env.BINANCE_CREDENTIAL_MASTER_KEY;
  if (!masterKey) throw new Error('BINANCE_CREDENTIAL_MASTER_KEY is required');
  const credentials = new CredentialVault(Buffer.from(masterKey, 'base64url')).decrypt({
    apiKeyCiphertext: Buffer.from(connection.apiKeyCiphertext).toString('utf8'),
    apiSecretCiphertext: Buffer.from(connection.apiSecretCiphertext).toString('utf8'),
    keyVersion: connection.encryptionKeyVersion,
    revokedAt: connection.revokedAt?.toISOString() ?? null,
  });
  const connector = new BinanceSpotTestnetConnector(credentials.apiKey, credentials.apiSecret);
  const store = new PrismaLiveOrderStore(database, resolveContext);
  return { engine: new LiveExecutionEngine(connector, true, store), connector };
}

export function assertTestnetLiveEnabled(): void {
  if (process.env.BINANCE_TRADING_ENVIRONMENT !== 'TESTNET')
    throw new Error('LIVE execution requires BINANCE_TRADING_ENVIRONMENT=TESTNET');
  if (process.env.LIVE_TRADING_ENABLED !== 'true') throw new Error('LIVE execution is disabled');
}

import { randomUUID } from 'node:crypto';
import { BinanceSpotTestnetConnector } from '@risexpto/binance-connection';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function assertSmokeEnvironment(): void {
  if (process.env.RUN_BINANCE_TESTNET_SMOKE !== 'true')
    throw new Error('Set RUN_BINANCE_TESTNET_SMOKE=true to run this smoke test');
  if (process.env.BINANCE_TRADING_ENVIRONMENT !== 'TESTNET')
    throw new Error('Smoke test accepts only BINANCE_TRADING_ENVIRONMENT=TESTNET');
  if ((process.env.BINANCE_TESTNET_BASE_URL ?? 'https://testnet.binance.vision') !== 'https://testnet.binance.vision')
    throw new Error('BINANCE_TESTNET_BASE_URL must be https://testnet.binance.vision');
}

async function main(): Promise<void> {
  assertSmokeEnvironment();
  const connector = new BinanceSpotTestnetConnector(
    required('BINANCE_TESTNET_API_KEY'),
    required('BINANCE_TESTNET_API_SECRET'),
  );
  const symbol = (process.env.BINANCE_TESTNET_SMOKE_SYMBOL ?? 'BTCUSDT').trim().toUpperCase();
  const rules = await connector.exchangeInfo(symbol);
  const balances = await connector.accountBalances();
  console.info(JSON.stringify({ event: 'binance_testnet_readiness_ok', symbol: rules.symbol, status: rules.status, balances: balances.length }));
  if (process.env.BINANCE_TESTNET_SMOKE_ORDER !== 'true') {
    console.info(JSON.stringify({ event: 'binance_testnet_order_skipped', reason: 'explicit_order_flag_missing' }));
    return;
  }
  const quoteAmount = required('BINANCE_TESTNET_SMOKE_QUOTE_AMOUNT');
  const result = await connector.submit({
    clientOrderId: `smoke-${randomUUID()}`,
    symbol,
    side: 'BUY',
    type: 'MARKET',
    quoteAmount,
  });
  console.info(JSON.stringify({ event: 'binance_testnet_order_submitted', externalOrderId: result.externalOrderId, status: result.status }));
  const observed = await connector.query(result.clientOrderId);
  if (!['FILLED', 'CANCELED', 'REJECTED'].includes(observed.status)) {
    const canceled = await connector.cancel(result.clientOrderId);
    console.info(JSON.stringify({ event: 'binance_testnet_order_canceled', externalOrderId: canceled.externalOrderId, status: canceled.status }));
  }
  const final = await connector.query(result.clientOrderId);
  console.info(JSON.stringify({ event: 'binance_testnet_order_reconciled', externalOrderId: final.externalOrderId, status: final.status, filledQuantity: final.filledQuantity }));
}

if (process.env.NODE_ENV !== 'test') void main().catch((error: unknown) => {
  console.error(JSON.stringify({ event: 'binance_testnet_smoke_failed', error: error instanceof Error ? error.message : 'Unknown error' }));
  process.exitCode = 1;
});

# Binance Spot Testnet smoke test

O smoke test nunca usa produção. Ele exige `BINANCE_TRADING_ENVIRONMENT=TESTNET` e `RUN_BINANCE_TESTNET_SMOKE=true`.

Configure as credenciais somente no ambiente local/secret manager:

```bash
BINANCE_TESTNET_API_KEY=...
BINANCE_TESTNET_API_SECRET=...
RUN_BINANCE_TESTNET_SMOKE=true
BINANCE_TRADING_ENVIRONMENT=TESTNET
BINANCE_TESTNET_SMOKE_ORDER=false
```

Execute a validação de leitura:

```bash
pnpm --filter @risexpto/worker smoke:testnet
```

O teste consulta `exchangeInfo` e saldo. Para uma ordem mínima de compra na Testnet, definir explicitamente:

```bash
BINANCE_TESTNET_SMOKE_ORDER=true
BINANCE_TESTNET_SMOKE_SYMBOL=BTCUSDT
BINANCE_TESTNET_SMOKE_QUOTE_AMOUNT=5
```

O fluxo envia uma ordem MARKET, consulta o estado, cancela se ainda estiver aberta e consulta novamente. A ordem deve usar uma conta Spot Testnet descartável e nunca uma chave de produção. Nenhum segredo é impresso nos logs.

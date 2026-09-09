import { createHmac } from 'node:crypto';
import { BinanceConnectionError } from './errors.js';

type LiveOrder = {
  clientOrderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity?: string;
  quoteAmount?: string;
  limitPrice?: string;
};
type ExchangeOrder = {
  clientOrderId: string;
  externalOrderId: string;
  status: 'SUBMITTED' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'UNKNOWN';
  filledQuantity: string;
};
type LiveConnector = {
  submit(order: LiveOrder): Promise<ExchangeOrder>;
  query(clientOrderId: string): Promise<ExchangeOrder>;
  cancel(clientOrderId: string): Promise<ExchangeOrder>;
};

type Dependencies = { fetch?: typeof fetch; now?: () => number };
type BinanceOrderResponse = {
  orderId?: number | string;
  clientOrderId?: string;
  origClientOrderId?: string;
  status?: string;
  executedQty?: string;
};
export type BinanceAccountBalance = { asset: string; free: string; locked: string };
export type BinanceTradeFill = {
  id: number | string;
  price: string;
  qty: string;
  quoteQty: string;
  commission: string;
  commissionAsset: string;
  time: number;
};
type SymbolRules = {
  symbol: string;
  status: string;
  isSpotTradingAllowed: boolean;
  orderTypes: string[];
  priceFilter?: { minPrice: string; maxPrice: string; tickSize: string } | undefined;
  lotSize?: { minQty: string; maxQty: string; stepSize: string } | undefined;
  minNotional?: string | undefined;
  maxNotional?: string | undefined;
};

const TESTNET_ORIGIN = 'https://testnet.binance.vision';

/** Binance Spot Testnet adapter. Production URLs are rejected by design. */
export class BinanceSpotTestnetConnector implements LiveConnector {
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;
  private readonly baseUrl: URL;

  constructor(
    private readonly apiKey: string,
    private readonly apiSecret: string,
    dependencies: Dependencies = {},
    baseUrl = TESTNET_ORIGIN,
  ) {
    if (!apiKey.trim() || !apiSecret.trim())
      throw new BinanceConnectionError('Binance Testnet credentials are required');
    this.baseUrl = new URL(baseUrl);
    if (this.baseUrl.origin !== TESTNET_ORIGIN)
      throw new BinanceConnectionError('Binance Testnet connector rejects non-Testnet URLs');
    this.fetcher = dependencies.fetch ?? globalThis.fetch;
    this.now = dependencies.now ?? Date.now;
  }

  async submit(order: LiveOrder): Promise<ExchangeOrder> {
    validateOrderShape(order);
    const rules = await this.exchangeInfo(order.symbol);
    validateOrderAgainstRules(order, rules);
    const params: Record<string, string> = {
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      newClientOrderId: order.clientOrderId,
      newOrderRespType: 'RESULT',
    };
    if (order.quantity) params.quantity = order.quantity;
    if (order.quoteAmount) params.quoteOrderQty = order.quoteAmount;
    if (order.type === 'LIMIT') {
      params.timeInForce = 'GTC';
      params.price = order.limitPrice as string;
    }
    return this.request('POST', '/api/v3/order', params);
  }

  async exchangeInfo(symbol: string): Promise<SymbolRules> {
    if (!/^[A-Z0-9]{5,20}$/.test(symbol)) throw new BinanceConnectionError('Invalid Binance symbol');
    const url = new URL('/api/v3/exchangeInfo', this.baseUrl);
    url.searchParams.set('symbol', symbol);
    let response: Response;
    try {
      response = await this.fetcher(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      throw new BinanceConnectionError('Binance Testnet unavailable');
    }
    const body = (await response.json().catch(() => undefined)) as {
      symbols?: Array<Record<string, unknown>>;
    } | undefined;
    const raw = body?.symbols?.[0];
    if (!response.ok || !raw) throw new BinanceConnectionError(`Binance Testnet exchange info failed (${response.status})`, response.status);
    return parseSymbolRules(raw);
  }

  async accountBalances(): Promise<BinanceAccountBalance[]> {
    const params = new URLSearchParams({ recvWindow: '5000', timestamp: String(this.now()) });
    params.set('signature', createHmac('sha256', this.apiSecret).update(params.toString()).digest('hex'));
    const url = new URL('/api/v3/account', this.baseUrl);
    url.search = params.toString();
    let response: Response;
    try {
      response = await this.fetcher(url, {
        headers: { 'X-MBX-APIKEY': this.apiKey, accept: 'application/json' },
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      throw new BinanceConnectionError('Binance Testnet unavailable');
    }
    const body = (await response.json().catch(() => undefined)) as { balances?: BinanceAccountBalance[] } | undefined;
    if (!response.ok || !Array.isArray(body?.balances))
      throw new BinanceConnectionError(`Binance Testnet account request failed (${response.status})`, response.status);
    return body.balances.filter((balance) => typeof balance.asset === 'string' && typeof balance.free === 'string' && typeof balance.locked === 'string');
  }

  async myTrades(symbol: string, orderId: string): Promise<BinanceTradeFill[]> {
    if (!/^[A-Z0-9]{5,20}$/.test(symbol) || !/^\d+$/.test(orderId))
      throw new BinanceConnectionError('Invalid Binance trade query');
    const params = new URLSearchParams({ symbol, orderId, limit: '1000', recvWindow: '5000', timestamp: String(this.now()) });
    params.set('signature', createHmac('sha256', this.apiSecret).update(params.toString()).digest('hex'));
    const url = new URL('/api/v3/myTrades', this.baseUrl);
    url.search = params.toString();
    let response: Response;
    try {
      response = await this.fetcher(url, { headers: { 'X-MBX-APIKEY': this.apiKey, accept: 'application/json' }, signal: AbortSignal.timeout(5_000) });
    } catch {
      throw new BinanceConnectionError('Binance Testnet unavailable');
    }
    const body = (await response.json().catch(() => undefined)) as unknown;
    if (!response.ok || !Array.isArray(body))
      throw new BinanceConnectionError(`Binance Testnet trades request failed (${response.status})`, response.status);
    return body.filter(isTradeFill);
  }

  query(clientOrderId: string): Promise<ExchangeOrder> {
    validateClientOrderId(clientOrderId);
    return this.request('GET', '/api/v3/order', { origClientOrderId: clientOrderId });
  }

  cancel(clientOrderId: string): Promise<ExchangeOrder> {
    validateClientOrderId(clientOrderId);
    return this.request('DELETE', '/api/v3/order', { origClientOrderId: clientOrderId });
  }

  private async request(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    values: Record<string, string>,
  ): Promise<ExchangeOrder> {
    const params = new URLSearchParams({ ...values, recvWindow: '5000', timestamp: String(this.now()) });
    const signature = createHmac('sha256', this.apiSecret).update(params.toString()).digest('hex');
    params.set('signature', signature);
    const url = new URL(path, this.baseUrl);
    url.search = params.toString();
    let response: Response;
    try {
      response = await this.fetcher(url, {
        method,
        headers: { 'X-MBX-APIKEY': this.apiKey, accept: 'application/json' },
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      throw new BinanceConnectionError('Binance Testnet unavailable');
    }
    const body = (await response.json().catch(() => undefined)) as BinanceOrderResponse | undefined;
    if (!response.ok || !body?.status || body.orderId === undefined)
      throw new BinanceConnectionError(`Binance Testnet order request failed (${response.status})`, response.status);
    return {
      clientOrderId: body.clientOrderId ?? body.origClientOrderId ?? values.newClientOrderId ?? values.origClientOrderId ?? '',
      externalOrderId: String(body.orderId),
      status: mapStatus(body.status),
      filledQuantity: body.executedQty ?? '0',
    };
  }
}

function validateOrderShape(order: LiveOrder): void {
  validateClientOrderId(order.clientOrderId);
  if (!/^[A-Z0-9]{5,20}$/.test(order.symbol)) throw new BinanceConnectionError('Invalid Binance symbol');
  if (order.type === 'MARKET' && !order.quantity && !order.quoteAmount)
    throw new BinanceConnectionError('Market order requires quantity or quote amount');
  if (order.type === 'LIMIT' && (!order.quantity || !order.limitPrice))
    throw new BinanceConnectionError('Limit order requires quantity and limit price');
}

function parseSymbolRules(raw: Record<string, unknown>): SymbolRules {
  const filters = Array.isArray(raw.filters) ? raw.filters.filter(isRecord) : [];
  const find = (type: string) => filters.find((filter) => isRecord(filter) && filter.filterType === type);
  const price = find('PRICE_FILTER');
  const lot = find('LOT_SIZE');
  const minNotional = find('MIN_NOTIONAL') ?? find('NOTIONAL');
  return {
    symbol: text(raw.symbol),
    status: text(raw.status),
    isSpotTradingAllowed: raw.isSpotTradingAllowed === true,
    orderTypes: Array.isArray(raw.orderTypes) ? raw.orderTypes.filter((value): value is string => typeof value === 'string') : [],
    priceFilter: price && isRecord(price) ? {
      minPrice: text(price.minPrice), maxPrice: text(price.maxPrice), tickSize: text(price.tickSize),
    } : undefined,
    lotSize: lot && isRecord(lot) ? {
      minQty: text(lot.minQty), maxQty: text(lot.maxQty), stepSize: text(lot.stepSize),
    } : undefined,
    minNotional: minNotional && isRecord(minNotional) ? text(minNotional.minNotional) : undefined,
    maxNotional: minNotional && isRecord(minNotional) && minNotional.maxNotional !== undefined ? text(minNotional.maxNotional) : undefined,
  };
}

function validateOrderAgainstRules(order: LiveOrder, rules: SymbolRules): void {
  if (rules.symbol !== order.symbol || rules.status !== 'TRADING' || !rules.isSpotTradingAllowed)
    throw new BinanceConnectionError('Binance symbol is not available for Spot trading');
  if (!rules.orderTypes.includes(order.type)) throw new BinanceConnectionError('Binance symbol does not support this order type');
  if (order.quantity && rules.lotSize) {
    if (compareDecimal(order.quantity, rules.lotSize.minQty) < 0 || compareDecimal(order.quantity, rules.lotSize.maxQty) > 0 || !isMultiple(order.quantity, rules.lotSize.stepSize))
      throw new BinanceConnectionError('Order quantity violates Binance LOT_SIZE');
  }
  if (order.type === 'LIMIT' && order.limitPrice && rules.priceFilter) {
    if (compareDecimal(order.limitPrice, rules.priceFilter.minPrice) < 0 || compareDecimal(order.limitPrice, rules.priceFilter.maxPrice) > 0 || !isMultiple(order.limitPrice, rules.priceFilter.tickSize))
      throw new BinanceConnectionError('Order price violates Binance PRICE_FILTER');
  }
  if (order.type === 'MARKET' && !order.quoteAmount && rules.minNotional)
    throw new BinanceConnectionError('Market order requires quote amount for safe notional validation');
  const notional = order.quoteAmount ?? (order.quantity && order.limitPrice ? multiplyDecimal(order.quantity, order.limitPrice) : undefined);
  if (notional && rules.minNotional && compareDecimal(notional, rules.minNotional) < 0)
    throw new BinanceConnectionError('Order violates Binance minimum notional');
  if (notional && rules.maxNotional && compareDecimal(notional, rules.maxNotional) > 0)
    throw new BinanceConnectionError('Order violates Binance maximum notional');
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isTradeFill(value: unknown): value is BinanceTradeFill {
  return isRecord(value) && typeof value.id === 'number' && typeof value.price === 'string' &&
    typeof value.qty === 'string' && typeof value.quoteQty === 'string' && typeof value.commission === 'string' &&
    typeof value.commissionAsset === 'string' && typeof value.time === 'number';
}
function decimalParts(value: string): [bigint, number] {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) throw new BinanceConnectionError('Invalid decimal value');
  const [whole, fraction = ''] = value.split('.');
  return [BigInt(`${whole}${fraction}`), fraction.length];
}
function compareDecimal(left: string, right: string): number {
  const [leftInt, leftScale] = decimalParts(left);
  const [rightInt, rightScale] = decimalParts(right);
  const scale = Math.max(leftScale, rightScale);
  const a = leftInt * 10n ** BigInt(scale - leftScale);
  const b = rightInt * 10n ** BigInt(scale - rightScale);
  return a < b ? -1 : a > b ? 1 : 0;
}
function isMultiple(value: string, step: string): boolean {
  const [valueInt, valueScale] = decimalParts(value);
  const [stepInt, stepScale] = decimalParts(step);
  const scale = Math.max(valueScale, stepScale);
  const a = valueInt * 10n ** BigInt(scale - valueScale);
  const b = stepInt * 10n ** BigInt(scale - stepScale);
  return b > 0n && a % b === 0n;
}
function multiplyDecimal(left: string, right: string): string {
  const [leftInt, leftScale] = decimalParts(left);
  const [rightInt, rightScale] = decimalParts(right);
  const scale = leftScale + rightScale;
  const raw = (leftInt * rightInt).toString().padStart(scale + 1, '0');
  return scale === 0 ? raw : `${raw.slice(0, -scale)}.${raw.slice(-scale)}`;
}

function validateClientOrderId(value: string): void {
  if (!/^[.\-_a-zA-Z0-9]{1,36}$/.test(value)) throw new BinanceConnectionError('Invalid client order ID');
}

function mapStatus(status: string): ExchangeOrder['status'] {
  if (status === 'NEW' || status === 'PENDING_CANCEL') return 'SUBMITTED';
  if (status === 'PARTIALLY_FILLED') return 'PARTIALLY_FILLED';
  if (status === 'FILLED') return 'FILLED';
  if (status === 'CANCELED' || status === 'EXPIRED') return 'CANCELED';
  if (status === 'REJECTED') return 'REJECTED';
  return 'UNKNOWN';
}

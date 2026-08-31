export type DcaParameters = {
  symbol: string;
  intervalMs: number;
  quoteAmount: number;
  maxCapital: number;
  minPrice?: number;
  maxPrice?: number;
};
export type DcaContext = {
  now: number;
  lastPurchaseAt: number | null;
  spentCapital: number;
  price: number;
  mode: 'PAPER' | 'LIVE';
};
export type DcaProposal = {
  side: 'BUY';
  symbol: string;
  quoteAmount: number;
  strategyKey: 'dca';
  strategyVersion: string;
  rationale: string;
};

export function validateDcaParameters(value: unknown): DcaParameters {
  if (!value || typeof value !== 'object') throw new Error('DCA parameters are required');
  const p = value as Partial<DcaParameters>;
  const intervalMs = p.intervalMs ?? NaN;
  const quoteAmount = p.quoteAmount ?? NaN;
  const maxCapital = p.maxCapital ?? NaN;
  const symbol = typeof p.symbol === 'string' ? p.symbol.trim().toUpperCase() : '';
  if (
    !/^[A-Z0-9]{5,20}$/.test(symbol) ||
    !Number.isFinite(intervalMs) ||
    intervalMs <= 0 ||
    !Number.isFinite(quoteAmount) ||
    quoteAmount <= 0 ||
    !Number.isFinite(maxCapital) ||
    maxCapital < quoteAmount ||
    (p.minPrice !== undefined && (!Number.isFinite(p.minPrice) || p.minPrice <= 0)) ||
    (p.maxPrice !== undefined && (!Number.isFinite(p.maxPrice) || p.maxPrice <= 0))
  )
    throw new Error('Invalid DCA parameters');
  if (p.minPrice !== undefined && p.maxPrice !== undefined && p.minPrice > p.maxPrice)
    throw new Error('DCA price range is invalid');
  return {
    symbol,
    intervalMs,
    quoteAmount,
    maxCapital,
    ...(p.minPrice !== undefined ? { minPrice: p.minPrice } : {}),
    ...(p.maxPrice !== undefined ? { maxPrice: p.maxPrice } : {}),
  };
}

export function createDcaStrategy(version: string, parameters: DcaParameters) {
  const validated = validateDcaParameters(parameters);
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid strategy version');
  return {
    key: 'dca' as const,
    version,
    parameters: validated,
    analyze(context: DcaContext): DcaProposal[] {
      if (context.mode !== 'PAPER') return [];
      if (context.spentCapital + validated.quoteAmount > validated.maxCapital) return [];
      if (
        context.lastPurchaseAt !== null &&
        context.now - context.lastPurchaseAt < validated.intervalMs
      )
        return [];
      if (validated.minPrice !== undefined && context.price < validated.minPrice) return [];
      if (validated.maxPrice !== undefined && context.price > validated.maxPrice) return [];
      return [
        {
          side: 'BUY',
          symbol: validated.symbol,
          quoteAmount: validated.quoteAmount,
          strategyKey: 'dca',
          strategyVersion: version,
          rationale: `Scheduled DCA purchase at ${context.price}`,
        },
      ];
    },
  };
}

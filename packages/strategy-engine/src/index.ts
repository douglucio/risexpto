export type StrategyLifecycle = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type StrategyContext = {
  symbol: string;
  price: string;
  timestamp: number;
  candles?: readonly Candle[];
  mode: 'PAPER' | 'LIVE';
};
export type Candle = {
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  openTime: number;
};
export type TradeProposal = {
  proposalId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity?: string;
  quoteAmount?: string;
  strategyKey: string;
  strategyVersion: string;
  generatedAt: number;
  mode: 'PAPER' | 'LIVE';
  rationale: string;
};
export type ParameterSchema<T> = { parse: (value: unknown) => T };
export type TradingStrategy<T> = {
  key: string;
  version: string;
  analyze: (context: StrategyContext, parameters: T) => Promise<TradeProposal[]>;
};
export type StrategyDefinition<T> = TradingStrategy<T> & {
  name: string;
  description: string;
  schema: ParameterSchema<T>;
  lifecycle: StrategyLifecycle;
};
export type StrategyMetrics = {
  analyses: number;
  proposals: number;
  failures: number;
  lastAnalysisAt: number | null;
};

export class StrategyEngine {
  private readonly definitions = new Map<string, StrategyDefinition<unknown>>();
  private readonly counters: StrategyMetrics = {
    analyses: 0,
    proposals: 0,
    failures: 0,
    lastAnalysisAt: null,
  };
  constructor(
    private readonly logger: (event: {
      event: string;
      strategyKey: string;
      version: string;
      at: number;
    }) => void = () => undefined,
    private readonly now: () => number = Date.now,
  ) {}

  register<T>(definition: StrategyDefinition<T>): void {
    if (
      !/^[a-z][a-z0-9-]{1,50}$/.test(definition.key) ||
      !/^\d+\.\d+\.\d+$/.test(definition.version)
    )
      throw new Error('Invalid strategy identity');
    if (definition.lifecycle === 'ARCHIVED')
      throw new Error('Archived strategy cannot be registered');
    if (this.definitions.has(`${definition.key}@${definition.version}`))
      throw new Error('Strategy version already registered');
    this.definitions.set(
      `${definition.key}@${definition.version}`,
      definition as StrategyDefinition<unknown>,
    );
  }

  setLifecycle(key: string, version: string, lifecycle: StrategyLifecycle): void {
    const definition = this.get(key, version);
    if (lifecycle === 'ACTIVE' && definition.lifecycle === 'ARCHIVED')
      throw new Error('Archived strategy cannot be activated');
    definition.lifecycle = lifecycle;
  }
  list(): Array<Pick<StrategyDefinition<unknown>, 'key' | 'version' | 'name' | 'lifecycle'>> {
    return [...this.definitions.values()].map(({ key, version, name, lifecycle }) => ({
      key,
      version,
      name,
      lifecycle,
    }));
  }

  async analyze(
    key: string,
    version: string,
    context: StrategyContext,
    parameters: unknown,
  ): Promise<TradeProposal[]> {
    const definition = this.get(key, version);
    if (definition.lifecycle !== 'ACTIVE') throw new Error('Strategy is not active');
    const parsed = definition.schema.parse(parameters);
    this.counters.analyses += 1;
    this.counters.lastAnalysisAt = this.now();
    this.logger({
      event: 'STRATEGY_ANALYSIS_STARTED',
      strategyKey: key,
      version,
      at: this.counters.lastAnalysisAt,
    });
    try {
      const proposals = await definition.analyze(context, parsed);
      const safe = proposals.map((proposal) => ({
        ...proposal,
        strategyKey: key,
        strategyVersion: version,
        generatedAt: proposal.generatedAt || this.now(),
        mode: context.mode,
      }));
      this.counters.proposals += safe.length;
      this.logger({
        event: 'TRADE_PROPOSALS_GENERATED',
        strategyKey: key,
        version,
        at: this.now(),
      });
      return safe;
    } catch (error) {
      this.counters.failures += 1;
      this.logger({ event: 'STRATEGY_ANALYSIS_FAILED', strategyKey: key, version, at: this.now() });
      throw error;
    }
  }
  metrics(): Readonly<StrategyMetrics> {
    return { ...this.counters };
  }
  private get(key: string, version: string): StrategyDefinition<unknown> {
    const found = this.definitions.get(`${key}@${version}`);
    if (!found) throw new Error('Strategy version not found');
    return found;
  }
}

export const numberParameter = (name: string, minimum = 0): ParameterSchema<number> => ({
  parse(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum)
      throw new Error(`Invalid parameter: ${name}`);
    return value;
  },
});

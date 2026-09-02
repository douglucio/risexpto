export type BotStatus =
  | 'DRAFT'
  | 'READY'
  | 'RUNNING'
  | 'PAUSED'
  | 'STOPPED'
  | 'ERROR'
  | 'RISK_BLOCKED'
  | 'ARCHIVED';
export type TradingMode = 'PAPER' | 'LIVE';
export type BotEvent = {
  id: string;
  botId: string;
  type: string;
  payload?: Record<string, unknown>;
  createdAt: number;
};
export type Bot = {
  id: string;
  userId: string;
  name: string;
  strategyVersionId: string;
  exchangeConnectionId?: string;
  tradingMode: TradingMode;
  status: BotStatus;
  configuration: BotConfiguration;
  createdAt: number;
  updatedAt: number;
  events: BotEvent[];
};
export type BotConfiguration = {
  parameters: Record<string, unknown>;
  allowedSymbols: string[];
  authorizedCapital: number;
  quoteCurrency: string;
  revision: number;
};
export type CreateBotInput = Omit<Bot, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'events'>;
export type UpdateBotInput = Partial<
  Pick<Bot, 'name' | 'exchangeConnectionId' | 'tradingMode' | 'configuration'>
>;
export type BotEventListener = (event: BotEvent) => void;

const transitions: Record<BotStatus, readonly BotStatus[]> = {
  DRAFT: ['READY', 'ARCHIVED'],
  READY: ['RUNNING', 'DRAFT', 'ARCHIVED'],
  RUNNING: ['PAUSED', 'STOPPED', 'ERROR', 'RISK_BLOCKED'],
  PAUSED: ['RUNNING', 'STOPPED', 'ARCHIVED'],
  STOPPED: ['READY', 'ARCHIVED'],
  ERROR: ['READY', 'STOPPED', 'ARCHIVED'],
  RISK_BLOCKED: ['PAUSED', 'STOPPED', 'READY'],
  ARCHIVED: [],
};

function clone<T>(value: T): T {
  return structuredClone(value);
}
function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 120) throw new Error(`Invalid bot ${field}`);
  return normalized;
}
function validateConfiguration(configuration: BotConfiguration): BotConfiguration {
  if (
    !Number.isFinite(configuration.authorizedCapital) ||
    configuration.authorizedCapital <= 0 ||
    !/^[A-Z]{3,16}$/.test(configuration.quoteCurrency) ||
    configuration.allowedSymbols.length === 0 ||
    configuration.allowedSymbols.some((symbol) => !/^[A-Z0-9]{5,20}$/.test(symbol)) ||
    configuration.revision < 1 ||
    !Number.isInteger(configuration.revision)
  )
    throw new Error('Invalid bot configuration');
  return { ...configuration, allowedSymbols: [...new Set(configuration.allowedSymbols)] };
}

export class BotManager {
  private readonly bots = new Map<string, Bot>();
  private readonly listeners = new Set<BotEventListener>();
  constructor(
    private readonly now: () => number = Date.now,
    private readonly id: () => string = () => crypto.randomUUID(),
  ) {}

  subscribe(listener: BotEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  create(input: CreateBotInput): Bot {
    const name = requireText(input.name, 'name');
    if (input.tradingMode === 'LIVE' && !input.exchangeConnectionId)
      throw new Error('LIVE bot requires an exchange connection');
    if (input.userId.trim() === '' || input.strategyVersionId.trim() === '')
      throw new Error('Bot ownership and strategy are required');
    const timestamp = this.now();
    const bot: Bot = {
      ...input,
      name,
      configuration: validateConfiguration(input.configuration),
      id: this.id(),
      status: 'DRAFT',
      createdAt: timestamp,
      updatedAt: timestamp,
      events: [],
    };
    this.bots.set(bot.id, bot);
    this.emit(bot, 'BOT_CREATED');
    return clone(bot);
  }
  get(id: string, userId?: string): Bot {
    const bot = this.bots.get(id);
    if (!bot || (userId !== undefined && bot.userId !== userId)) throw new Error('Bot not found');
    return clone(bot);
  }
  list(userId: string): Bot[] {
    return [...this.bots.values()].filter((bot) => bot.userId === userId).map(clone);
  }
  update(id: string, userId: string, input: UpdateBotInput): Bot {
    const bot = this.requireOwned(id, userId);
    if (bot.status === 'RUNNING') throw new Error('Running bot cannot be edited');
    if (input.name !== undefined) bot.name = requireText(input.name, 'name');
    if (input.exchangeConnectionId !== undefined)
      bot.exchangeConnectionId = input.exchangeConnectionId;
    if (input.tradingMode !== undefined) bot.tradingMode = input.tradingMode;
    if (bot.tradingMode === 'LIVE' && !bot.exchangeConnectionId)
      throw new Error('LIVE bot requires an exchange connection');
    if (input.configuration !== undefined)
      bot.configuration = validateConfiguration(input.configuration);
    bot.updatedAt = this.now();
    this.emit(bot, 'BOT_UPDATED');
    return clone(bot);
  }
  validate(id: string, userId: string): Bot {
    const bot = this.requireOwned(id, userId);
    this.transition(bot, 'READY');
    this.emit(bot, 'BOT_VALIDATED');
    return clone(bot);
  }
  start(id: string, userId: string): Bot {
    return this.change(id, userId, 'RUNNING', 'BOT_STARTED');
  }
  pause(id: string, userId: string): Bot {
    return this.change(id, userId, 'PAUSED', 'BOT_PAUSED');
  }
  resume(id: string, userId: string): Bot {
    return this.change(id, userId, 'RUNNING', 'BOT_RESUMED');
  }
  stop(id: string, userId: string): Bot {
    return this.change(id, userId, 'STOPPED', 'BOT_STOPPED');
  }
  archive(id: string, userId: string): Bot {
    return this.change(id, userId, 'ARCHIVED', 'BOT_ARCHIVED');
  }
  duplicate(id: string, userId: string, name: string): Bot {
    const source = this.requireOwned(id, userId);
    return this.create({
      userId,
      name,
      strategyVersionId: source.strategyVersionId,
      ...(source.exchangeConnectionId ? { exchangeConnectionId: source.exchangeConnectionId } : {}),
      tradingMode: source.tradingMode,
      configuration: {
        ...source.configuration,
        parameters: clone(source.configuration.parameters),
        revision: 1,
      },
    });
  }
  history(id: string, userId: string): BotEvent[] {
    return this.requireOwned(id, userId).events.map(clone);
  }
  private change(id: string, userId: string, status: BotStatus, event: string): Bot {
    const bot = this.requireOwned(id, userId);
    this.transition(bot, status);
    this.emit(bot, event);
    return clone(bot);
  }
  private requireOwned(id: string, userId: string): Bot {
    return this.bots.get(id)?.userId === userId
      ? this.bots.get(id)!
      : (() => {
          throw new Error('Bot not found');
        })();
  }
  private transition(bot: Bot, next: BotStatus): void {
    if (!transitions[bot.status].includes(next))
      throw new Error(`Invalid bot transition: ${bot.status} to ${next}`);
    bot.status = next;
    bot.updatedAt = this.now();
  }
  private emit(bot: Bot, type: string): void {
    const event = { id: this.id(), botId: bot.id, type, createdAt: this.now() };
    bot.events.push(event);
    for (const listener of this.listeners) listener(clone(event));
  }
}

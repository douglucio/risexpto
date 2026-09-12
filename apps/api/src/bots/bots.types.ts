import type { TradingMode } from '@risexpto/database';

export type CreateBotBody = {
  name?: unknown;
  strategyVersionId?: unknown;
  tradingMode?: unknown;
  exchangeConnectionId?: unknown;
  parameters?: unknown;
  allowedSymbols?: unknown;
  authorizedCapital?: unknown;
  quoteCurrency?: unknown;
  riskProfile?: unknown;
  capitalMode?: unknown;
  digitalTraderSlug?: unknown;
};

export type RiskProfileBody = {
  name?: unknown;
  maxAllocatedCapital?: unknown;
  maxTradeAmount?: unknown;
  maxExposurePercent?: unknown;
  maxPositionPercent?: unknown;
  maxPositions?: unknown;
  maxDailyLossPercent?: unknown;
  maxDrawdownPercent?: unknown;
  allowedSymbols?: unknown;
  cooldownSeconds?: unknown;
  preset?: unknown;
};

export type BotStatusChange = 'READY' | 'RUNNING' | 'PAUSED' | 'STOPPED' | 'ARCHIVED';

export type BotData = {
  id: string;
  name: string;
  status: string;
  tradingMode: TradingMode;
  strategyVersionId: string;
  exchangeConnectionId: string | null;
  configuration: unknown;
  createdAt: Date;
  updatedAt: Date;
};

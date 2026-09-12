import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../src/auth/auth.types';
import { BotsService } from '../src/bots/bots.service';
import { Decimal } from 'decimal.js';

const user: AuthenticatedUser = {
  id: 'keycloak-sub',
  applicationUserId: 'application-user-id',
  email: 'user@example.com',
  name: 'User',
  emailVerified: true,
  roles: ['USER'],
};

describe('BotsService', () => {
  it('always scopes list queries to the provisioned application user', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new BotsService({ bot: { findMany } } as never);

    await service.list(user);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'application-user-id', archivedAt: null },
      }),
    );
  });

  it('does not allow LIVE bot creation through the initial API slice', async () => {
    const service = new BotsService({ bot: { findMany: vi.fn() } } as never);

    await expect(
      service.create(user, {
        name: 'Live attempt',
        strategyVersionId: '00000000-0000-4000-8000-000000000001',
        tradingMode: 'LIVE',
        allowedSymbols: ['BTCUSDT'],
        authorizedCapital: '10',
        quoteCurrency: 'USDT',
      }),
    ).rejects.toThrow('LIVE trading is not enabled');
  });

  it('creates PAPER bot, configuration, risk profile and allocation atomically', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'bot-1', tradingMode: 'PAPER' });
    const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({ bot: { create } }),
    );
    const service = new BotsService({
      strategyVersion: { findFirst: vi.fn().mockResolvedValue({ id: 'strategy-1' }) },
      bot: { create: vi.fn() },
      $transaction: transaction,
    } as never);

    await expect(
      service.create(user, {
        name: 'Paper DCA',
        strategyVersionId: '00000000-0000-4000-8000-000000000001',
        tradingMode: 'PAPER',
        allowedSymbols: ['BTCUSDT'],
        authorizedCapital: '100',
        quoteCurrency: 'USDT',
        parameters: { symbol: 'BTCUSDT', quoteAmount: 10, maxCapital: 100 },
        riskProfile: {
          name: 'Paper DCA risk',
          maxAllocatedCapital: '100',
          maxTradeAmount: '10',
          maxExposurePercent: '50',
          maxPositionPercent: '50',
          maxPositions: 1,
          maxDailyLossPercent: '5',
          maxDrawdownPercent: '10',
          allowedSymbols: ['BTCUSDT'],
          cooldownSeconds: 60,
        },
      }),
    ).resolves.toEqual({ id: 'bot-1', tradingMode: 'PAPER' });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    const call = create.mock.calls[0] as unknown as [
      {
        data: {
          riskProfile: { create: { userId: string; maxPositions: number } };
          paperCapitalAllocation: { create: { allocated: number } };
        };
      },
    ];
    expect(call[0].data.riskProfile.create).toMatchObject({
      userId: 'application-user-id',
      maxPositions: 1,
    });
    expect(call[0].data.paperCapitalAllocation).toEqual({ create: { allocated: 0 } });
  });

  it('enforces the PAPER lifecycle transitions and ownership query', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'bot-1', status: 'READY', archivedAt: null });
    const update = vi.fn().mockResolvedValue({ id: 'bot-1', status: 'RUNNING' });
    const service = new BotsService({ bot: { findFirst, update } } as never);

    await expect(service.changeStatus(user, 'bot-1', 'RUNNING')).resolves.toEqual({
      id: 'bot-1',
      status: 'RUNNING',
    });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bot-1', userId: 'application-user-id', archivedAt: null },
      }),
    );
    await expect(service.changeStatus(user, 'bot-1', 'STOPPED')).rejects.toThrow(
      'Invalid bot transition',
    );
  });

  it('does not expose a bot that belongs to another application user', async () => {
    const service = new BotsService({
      bot: { findFirst: vi.fn().mockResolvedValue(null) },
    } as never);
    await expect(service.get(user, 'foreign-bot')).rejects.toThrow('Bot not found');
  });

  it('keeps Paper allocation across pause/resume and releases it once on stop', async () => {
    let status: 'READY' | 'RUNNING' | 'PAUSED' | 'STOPPED' = 'READY';
    const allocation = { active: false, allocated: new Decimal(200), paperPortfolioId: 'portfolio-1' };
    const portfolio = { availableCapital: new Decimal(800), allocatedCapital: new Decimal(200) };
    const findFirst = vi.fn().mockImplementation(() => ({ id: 'paper-bot', userId: user.applicationUserId, status, tradingMode: 'PAPER', archivedAt: null, paperPortfolioId: 'portfolio-1', configuration: { authorizedCapital: new Decimal(200), quoteCurrency: 'USDT' } }));
    const tx = {
      paperCapitalAllocation: {
        findUnique: vi.fn().mockResolvedValue(allocation),
        upsert: vi.fn().mockImplementation(() => { allocation.active = true; return allocation; }),
        update: vi.fn().mockImplementation(() => { allocation.active = false; return allocation; }),
      },
      paperPortfolio: {
        findUnique: vi.fn().mockResolvedValue(portfolio),
        update: vi.fn().mockResolvedValue(portfolio),
      },
      paperBalance: { upsert: vi.fn() },
      bot: { update: vi.fn().mockImplementation(({ data }: { data: { status: typeof status } }) => { status = data.status; return { id: 'paper-bot', status }; }) },
    };
    const service = new BotsService({ bot: { findFirst }, $transaction: vi.fn((callback: (value: unknown) => unknown) => callback(tx)) } as never);
    await service.changeStatus(user, 'paper-bot', 'RUNNING');
    status = 'PAUSED';
    await service.changeStatus(user, 'paper-bot', 'RUNNING');
    status = 'PAUSED';
    await service.changeStatus(user, 'paper-bot', 'STOPPED');
    expect(tx.paperPortfolio.update).toHaveBeenCalledTimes(2);
    expect(tx.paperCapitalAllocation.upsert).toHaveBeenCalledTimes(1);
    expect(tx.paperCapitalAllocation.update).toHaveBeenCalledTimes(1);
  });
});

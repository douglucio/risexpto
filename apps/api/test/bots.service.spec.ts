import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../src/auth/auth.types';
import { BotsService } from '../src/bots/bots.service';

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

  it('enforces the PAPER lifecycle transitions and ownership query', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'bot-1', status: 'READY', archivedAt: null });
    const update = vi.fn().mockResolvedValue({ id: 'bot-1', status: 'RUNNING' });
    const service = new BotsService({ bot: { findFirst, update } } as never);

    await expect(service.changeStatus(user, 'bot-1', 'RUNNING')).resolves.toEqual({ id: 'bot-1', status: 'RUNNING' });
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'bot-1', userId: 'application-user-id', archivedAt: null } }));
    await expect(service.changeStatus(user, 'bot-1', 'STOPPED')).rejects.toThrow('Invalid bot transition');
  });

  it('does not expose a bot that belongs to another application user', async () => {
    const service = new BotsService({ bot: { findFirst: vi.fn().mockResolvedValue(null) } } as never);
    await expect(service.get(user, 'foreign-bot')).rejects.toThrow('Bot not found');
  });
});

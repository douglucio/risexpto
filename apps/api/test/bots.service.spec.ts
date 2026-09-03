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
});

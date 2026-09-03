import { describe, expect, it, vi } from 'vitest';
import { TradingActivityService } from '../src/trading-activity/trading-activity.service';

describe('TradingActivityService', () => {
  it('scopes trades through the owning user relation', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new TradingActivityService({ trade: { findMany } } as never);
    await service.trades({
      id: 'keycloak-sub', applicationUserId: 'user-a', email: 'a@example.com', name: 'A',
      emailVerified: true, roles: ['USER'],
    });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { order: { bot: { userId: 'user-a' } } },
    }));
  });
});

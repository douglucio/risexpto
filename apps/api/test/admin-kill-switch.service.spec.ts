import { describe, expect, it, vi } from 'vitest';
import { AdminKillSwitchService } from '../src/admin/admin-kill-switch.service';
import type { AppRole } from '../src/auth/roles';

const actor = {
  id: 'keycloak-admin',
  applicationUserId: 'application-admin',
  email: 'admin@example.com',
  name: 'Admin',
  emailVerified: true,
  roles: ['ADMIN'] as AppRole[],
};

describe('AdminKillSwitchService', () => {
  it('upserts an active scope and records the application actor', async () => {
    const upsert = vi.fn().mockResolvedValue({ active: true });
    const service = new AdminKillSwitchService({ killSwitchState: { upsert } } as never);

    await service.activate('SYSTEM', 'global', 'manual safety stop', actor);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { scope_targetId: { scope: 'SYSTEM', targetId: 'global' } },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        create: expect.objectContaining({ activatedBy: 'application-admin' }),
      }),
    );
  });

  it('checks system, user and bot scopes in one persistent query', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'kill-1' }]);
    const service = new AdminKillSwitchService({ killSwitchState: { findMany } } as never);

    await expect(service.isBlocked('user-1', 'bot-1')).resolves.toBe(true);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: expect.objectContaining({ active: true, OR: expect.any(Array) }),
        take: 1,
      }),
    );
  });
});

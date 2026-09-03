import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../src/auth/auth.types';
import {
  UserProvisioningError,
  UserProvisioningService,
} from '../src/users/user-provisioning.service';

const user: AuthenticatedUser = {
  id: 'keycloak-subject',
  email: 'user@example.com',
  name: 'Test User',
  emailVerified: true,
  roles: ['USER'],
};

describe('UserProvisioningService', () => {
  it('upserts the external subject and profile without persisting Keycloak roles', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 'application-user-id', deletedAt: null });
    const service = new UserProvisioningService({ user: { upsert } } as never);

    await expect(service.provision(user)).resolves.toMatchObject({
      ...user,
      applicationUserId: 'application-user-id',
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { externalAuthId: 'keycloak-subject' },
        create: expect.objectContaining({
          externalAuthId: 'keycloak-subject',
          email: 'user@example.com',
          profile: { create: { displayName: 'Test User' } },
        }) as unknown,
      }),
    );
  });

  it('rejects a soft-deleted application user', async () => {
    const service = new UserProvisioningService({
      user: { upsert: vi.fn().mockResolvedValue({ id: 'id', deletedAt: new Date() }) },
    } as never);

    await expect(service.provision(user)).rejects.toMatchObject(
      new UserProvisioningError('DEACTIVATED'),
    );
  });
});

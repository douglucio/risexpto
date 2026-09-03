import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@risexpto/database';
import type { AuthenticatedUser } from '../auth/auth.types';

export const DATABASE = Symbol('DATABASE');

export class UserProvisioningError extends Error {
  constructor(
    readonly code: 'DEACTIVATED' | 'UNAVAILABLE',
    cause?: unknown,
  ) {
    super(code, { cause });
    this.name = 'UserProvisioningError';
  }
}

@Injectable()
export class UserProvisioningService {
  constructor(@Inject(DATABASE) private readonly db: PrismaClient) {}

  async provision(user: AuthenticatedUser): Promise<AuthenticatedUser> {
    let stored;
    try {
      stored = await this.db.user.upsert({
        where: { externalAuthId: user.id },
        update: {
          email: user.email,
          emailVerifiedAt: user.emailVerified ? new Date() : null,
          profile: {
            upsert: {
              create: { displayName: user.name },
              update: { displayName: user.name },
            },
          },
        },
        create: {
          externalAuthId: user.id,
          email: user.email,
          emailVerifiedAt: user.emailVerified ? new Date() : null,
          profile: { create: { displayName: user.name } },
        },
        select: { id: true, deletedAt: true },
      });
    } catch (error) {
      throw new UserProvisioningError('UNAVAILABLE', error);
    }
    if (stored.deletedAt) throw new UserProvisioningError('DEACTIVATED');
    return { ...user, applicationUserId: stored.id };
  }
}

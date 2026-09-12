import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@risexpto/database';
import { DATABASE } from '../users/user-provisioning.service';
import type { AuthenticatedUser } from '../auth/auth.types';

@Injectable()
export class NotificationsService {
  constructor(@Inject(DATABASE) private readonly db: PrismaClient) {}

  async list(user: AuthenticatedUser) {
    return this.db.notification.findMany({ where: { userId: id(user) }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async unreadCount(user: AuthenticatedUser) {
    return { count: await this.db.notification.count({ where: { userId: id(user), readAt: null } }) };
  }

  async markRead(user: AuthenticatedUser, notificationId: string) {
    return this.db.notification.updateMany({ where: { id: notificationId, userId: id(user) }, data: { readAt: new Date(), status: 'READ' } });
  }
}

function id(user: AuthenticatedUser): string {
  if (!user.applicationUserId) throw new Error('Application user is not provisioned');
  return user.applicationUserId;
}

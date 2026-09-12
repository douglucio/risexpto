import { Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser) { return this.notifications.list(user); }
  @Get('unread-count') unreadCount(@CurrentUser() user: AuthenticatedUser) { return this.notifications.unreadCount(user); }
  @Patch(':id/read') markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.notifications.markRead(user, id); }
}

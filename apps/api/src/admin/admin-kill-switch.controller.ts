import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AdminKillSwitchService } from './admin-kill-switch.service';

@Controller('admin/kill-switches')
@Roles('ADMIN')
export class AdminKillSwitchController {
  constructor(private readonly service: AdminKillSwitchService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post(':scope/:targetId')
  activate(
    @Param('scope') scope: string,
    @Param('targetId') targetId: string,
    @Body() body: { reason?: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.activate(scope, targetId, body.reason ?? '', actor);
  }

  @Delete(':scope/:targetId')
  deactivate(@Param('scope') scope: string, @Param('targetId') targetId: string) {
    return this.service.deactivate(scope, targetId);
  }
}

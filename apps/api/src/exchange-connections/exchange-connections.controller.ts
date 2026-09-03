import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ExchangeConnectionsService } from './exchange-connections.service';

@Controller('exchange-connections')
export class ExchangeConnectionsController {
  constructor(private readonly connections: ExchangeConnectionsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.connections.list(user);
  }
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    return this.connections.create(user, body);
  }
  @Post(':id/test')
  test(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.connections.test(user, id);
  }
  @Delete(':id')
  revoke(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.connections.revoke(user, id);
  }
}

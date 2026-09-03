import { Global, Module } from '@nestjs/common';
import { AdminKillSwitchController } from './admin-kill-switch.controller';
import { AdminKillSwitchService } from './admin-kill-switch.service';
import { DATABASE } from '../users/user-provisioning.service';

@Global()
@Module({ controllers: [AdminKillSwitchController], providers: [AdminKillSwitchService] })
export class AdminModule {
  static withDatabase(database: unknown) {
    return {
      module: AdminModule,
      providers: [{ provide: DATABASE, useValue: database }, AdminKillSwitchService],
      exports: [AdminKillSwitchService],
    };
  }
}

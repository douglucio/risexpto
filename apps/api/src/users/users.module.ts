import { Global, Module } from '@nestjs/common';
import { DATABASE, UserProvisioningService } from './user-provisioning.service';

@Global()
@Module({
  providers: [UserProvisioningService],
  exports: [UserProvisioningService],
})
export class UsersModule {
  static withDatabase(database: object) {
    return {
      module: UsersModule,
      providers: [{ provide: DATABASE, useValue: database }],
      exports: [UserProvisioningService],
    };
  }
}

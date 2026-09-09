import { Global, Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { DATABASE } from '../users/user-provisioning.service';

@Global()
@Module({
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {
  static withDatabase(database: object) {
    return { module: BillingModule, providers: [{ provide: DATABASE, useValue: database }, BillingService], exports: [BillingService] };
  }
}

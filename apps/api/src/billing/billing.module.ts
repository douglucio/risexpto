import { Global, Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { DATABASE } from '../users/user-provisioning.service';
import { PublicPlansController } from './public-plans.controller';

@Global()
@Module({
  controllers: [BillingController, PublicPlansController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {
  static withDatabase(database: object) {
    return {
      module: BillingModule,
      controllers: [BillingController, PublicPlansController],
      providers: [{ provide: DATABASE, useValue: database }, BillingService],
      exports: [BillingService],
    };
  }
}

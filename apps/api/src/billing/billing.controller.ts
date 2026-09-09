import { Body, Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { Public } from '../auth/auth.decorators';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}
  @Get() billing(@CurrentUser() user: AuthenticatedUser) { return this.billingService.billing(user); }
  @Post('checkout') checkout(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) { return this.billingService.checkout(user, body); }
  @Post('portal') portal(@CurrentUser() user: AuthenticatedUser) { return this.billingService.portal(user); }
  @Post('webhooks/stripe') @Public() webhook(@Req() request: { rawBody?: Buffer }, @Headers('stripe-signature') signature?: string) {
    if (!request.rawBody || !signature) throw new Error('Stripe raw body and signature are required');
    return this.billingService.webhook(request.rawBody, signature);
  }
}

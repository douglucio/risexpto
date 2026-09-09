import { Body, Controller, Get, Inject, Patch, BadRequestException } from '@nestjs/common';
import type { PrismaClient } from '@risexpto/database';
import { Roles } from '../auth/auth.decorators';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { DATABASE } from '../users/user-provisioning.service';
@Controller('profile')
export class ProfileController {
  constructor(@Inject(DATABASE) private readonly db: PrismaClient) {}
  @Get()
  @Roles('USER', 'SUPPORT', 'ADMIN')
  profile(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.applicationUserId ?? user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      roles: user.roles,
    };
  }

  @Patch('preferences')
  async preferences(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const userId = user.applicationUserId;
    if (!userId || !isPreferences(body)) throw new BadRequestException('Invalid preferences');
    const profile = await this.db.userProfile.upsert({ where: { userId }, update: { locale: body.locale, timezone: body.timezone, referenceCurrency: body.currency }, create: { userId, locale: body.locale, timezone: body.timezone, referenceCurrency: body.currency } });
    return { locale: profile.locale, timezone: profile.timezone, currency: profile.referenceCurrency };
  }
}

function isPreferences(value: unknown): value is { locale: 'en' | 'pt-BR' | 'es'; timezone: string; currency: 'USD' | 'BRL' | 'EUR' } {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return ['en', 'pt-BR', 'es'].includes(String(item.locale)) && ['USD', 'BRL', 'EUR'].includes(String(item.currency)) && typeof item.timezone === 'string' && item.timezone.length <= 64;
}

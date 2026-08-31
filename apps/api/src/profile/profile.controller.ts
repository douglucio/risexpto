import { Controller, Get } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
@Controller('profile')
export class ProfileController {
  @Get()
  @Roles('USER', 'SUPPORT', 'ADMIN')
  profile(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      roles: user.roles,
    };
  }
}

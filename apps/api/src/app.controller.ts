import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/auth.decorators';

@Controller()
export class AppController {
  @Get('health')
  @Public()
  health() {
    return { service: 'api', status: 'ok' } as const;
  }
}

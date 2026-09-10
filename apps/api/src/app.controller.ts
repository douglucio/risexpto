import { Controller, Get, Inject, Optional, Res } from '@nestjs/common';
import Redis from 'ioredis';
import type { PrismaClient } from '@risexpto/database';
import { Public } from './auth/auth.decorators';
import { DATABASE } from './users/user-provisioning.service';

type StatusResponse = { status(code: number): void };

@Controller()
export class AppController {
  constructor(@Optional() @Inject(DATABASE) private readonly database?: PrismaClient) {}

  @Get('health')
  @Public()
  health() {
    return { service: 'api', status: 'ok' } as const;
  }

  @Get('ready')
  @Public()
  async ready(@Res({ passthrough: true }) response: StatusResponse) {
    const checks = {
      postgres: await this.checkPostgres(),
      redis: await this.checkRedis(),
    };
    const ready = Object.values(checks).every(Boolean);
    if (!ready) response.status(503);
    return { service: 'api', status: ready ? 'ready' : 'not_ready', checks } as const;
  }

  private async checkPostgres(): Promise<boolean> {
    if (!this.database) return false;
    try {
      await this.database.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    const url = process.env.REDIS_URL?.trim();
    if (!url) return false;
    const redis = new Redis(url, {
      lazyConnect: true,
      connectTimeout: 1_000,
      maxRetriesPerRequest: 1,
    });
    try {
      await redis.connect();
      return (await redis.ping()) === 'PONG';
    } catch {
      return false;
    } finally {
      redis.disconnect();
    }
  }
}

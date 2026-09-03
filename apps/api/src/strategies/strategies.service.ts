import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@risexpto/database';
import { DATABASE } from '../users/user-provisioning.service';

@Injectable()
export class StrategiesService {
  constructor(@Inject(DATABASE) private readonly db: PrismaClient) {}

  async list() {
    return this.db.strategyDefinition.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: {
        versions: {
          where: { active: true },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });
  }
}

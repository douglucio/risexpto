import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@risexpto/database';
import type { AuthenticatedUser } from '../auth/auth.types';
import { DATABASE } from '../users/user-provisioning.service';

const scopes = ['USER', 'BOT', 'SYSTEM'] as const;
type KillScope = (typeof scopes)[number];

@Injectable()
export class AdminKillSwitchService {
  constructor(@Inject(DATABASE) private readonly database: PrismaClient) {}

  list() {
    return this.database.killSwitchState.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  activate(scope: string, targetId: string, reason: string, actor: AuthenticatedUser) {
    if (!scopes.includes(scope as KillScope) || !targetId.trim() || !reason.trim())
      throw new BadRequestException('scope, targetId and reason are required');
    return this.database.killSwitchState.upsert({
      where: { scope_targetId: { scope: scope as KillScope, targetId: targetId.trim() } },
      create: {
        scope: scope as KillScope,
        targetId: targetId.trim(),
        reason: reason.trim(),
        activatedBy: actor.applicationUserId ?? actor.id,
      },
      update: {
        reason: reason.trim(),
        activatedBy: actor.applicationUserId ?? actor.id,
        active: true,
        activatedAt: new Date(),
        deactivatedAt: null,
      },
    });
  }

  deactivate(scope: string, targetId: string) {
    if (!scopes.includes(scope as KillScope) || !targetId.trim())
      throw new BadRequestException('scope and targetId are required');
    return this.database.killSwitchState.update({
      where: { scope_targetId: { scope: scope as KillScope, targetId: targetId.trim() } },
      data: { active: false, deactivatedAt: new Date() },
    });
  }

  async isBlocked(userId: string, botId?: string): Promise<boolean> {
    const states = await this.database.killSwitchState.findMany({
      where: {
        active: true,
        OR: [
          { scope: 'SYSTEM', targetId: 'global' },
          { scope: 'USER', targetId: userId },
          ...(botId ? [{ scope: 'BOT' as const, targetId: botId }] : []),
        ],
      },
      select: { id: true },
      take: 1,
    });
    return states.length > 0;
  }
}

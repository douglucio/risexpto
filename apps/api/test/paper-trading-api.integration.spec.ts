import { describe, expect, it, vi } from 'vitest';
import { BotsController } from '../src/bots/bots.controller';
import type { AuthenticatedUser } from '../src/auth/auth.types';

const user: AuthenticatedUser = {
  id: 'keycloak-sub', applicationUserId: 'application-user-id', email: 'user@example.com',
  name: 'User', emailVerified: true, roles: ['USER'],
};

describe('Paper Trading API flow', () => {
  it('transitions a bot and enqueues a cycle through the controller contract', async () => {
    const get = vi.fn().mockResolvedValue({ id: 'bot-1', status: 'RUNNING', tradingMode: 'PAPER' });
    const changeStatus = vi.fn().mockResolvedValue({ id: 'bot-1', status: 'RUNNING' });
    const enqueueBotCycle = vi.fn().mockResolvedValue({ id: 'cycle-1' });
    const controller = new BotsController({ get, changeStatus } as never, { enqueueBotCycle } as never);

    await expect(controller.changeStatus(user, 'bot-1', 'RUNNING')).resolves.toEqual({ id: 'bot-1', status: 'RUNNING' });
    await expect(controller.cycle(user, 'bot-1', 'cycle-key')).resolves.toEqual({ queued: true, jobId: 'cycle-1', botId: 'bot-1' });
    expect(changeStatus).toHaveBeenCalledWith(user, 'bot-1', 'RUNNING');
    expect(enqueueBotCycle).toHaveBeenCalledWith('bot-1', 'cycle-key');
  });

  it('refuses to enqueue a paused bot', async () => {
    const controller = new BotsController({ get: vi.fn().mockResolvedValue({ id: 'bot-1', status: 'PAUSED', tradingMode: 'PAPER' }) } as never, { enqueueBotCycle: vi.fn() } as never);
    await expect(controller.cycle(user, 'bot-1', 'cycle-key')).rejects.toThrow('Only running PAPER bots');
  });
});

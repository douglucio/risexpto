import { describe, expect, it, vi } from 'vitest';
import { NotificationService } from './index.js';
describe('NotificationService', () => {
  it('publishes in-app/email notifications through adapters', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const service = new NotificationService(
      () => 10,
      () => 'n1',
    );
    const result = await service.publish(
      'u1',
      'RISK_BLOCKED',
      'Risk blocked',
      'Trade rejected',
      ['IN_APP', 'EMAIL'],
      'proposal-1',
      { EMAIL: { send } },
    );
    expect(result).toHaveLength(2);
    expect(send).toHaveBeenCalledOnce();
    expect(service.list('u1')).toHaveLength(2);
  });
  it('deduplicates event delivery and validates input', async () => {
    const service = new NotificationService();
    await service.publish('u1', 'BOT_STARTED', 'Started', 'Bot started', ['IN_APP'], 'bot-1');
    expect(
      await service.publish('u1', 'BOT_STARTED', 'Started', 'Bot started', ['IN_APP'], 'bot-1'),
    ).toEqual([]);
    await expect(service.publish('', 'BOT_STARTED', 'x', 'y', ['IN_APP'], 'z')).rejects.toThrow(
      'required',
    );
  });
});

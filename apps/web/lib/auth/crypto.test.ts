import { describe, expect, it } from 'vitest';
import { seal, unseal } from './crypto';

describe('encrypted auth state', () => {
  const secret = '0123456789abcdef0123456789abcdef';
  it('round trips without exposing plaintext', async () => {
    const token = await seal({ refreshToken: 'never-log-this' }, secret, 60, 'test');
    expect(token).not.toContain('never-log-this');
    await expect(unseal(token, secret, 'test')).resolves.toEqual({
      refreshToken: 'never-log-this',
    });
  });
  it('rejects a token for a different audience', async () => {
    const token = await seal({ state: 'abc' }, secret, 60, 'expected');
    await expect(unseal(token, secret, 'wrong')).rejects.toThrow();
  });
});

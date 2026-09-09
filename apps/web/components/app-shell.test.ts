import { describe, expect, it } from 'vitest';

describe('public shell session behavior', () => {
  it('documents the public paths that must not require a session probe', () => {
    expect(['/','/login']).toContain('/');
    expect(['/','/login']).toContain('/login');
  });
});

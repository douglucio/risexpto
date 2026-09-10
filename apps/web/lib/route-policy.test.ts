import { describe, expect, it } from 'vitest';
import { isAdminPath, isPublicPath } from './route-policy';

describe('web route policy', () => {
  it.each(['/', '/login', '/auth/session', '/auth/callback', '/api/public/plans'])(
    'allows %s without authentication',
    (path) => {
      expect(isPublicPath(path)).toBe(true);
    },
  );

  it.each(['/dashboard', '/api/bots', '/billing', '/admin'])(
    'requires authentication for %s',
    (path) => {
      expect(isPublicPath(path)).toBe(false);
    },
  );

  it('recognizes the protected admin subtree', () => {
    expect(isAdminPath('/admin')).toBe(true);
    expect(isAdminPath('/admin/jobs')).toBe(true);
    expect(isAdminPath('/dashboard')).toBe(false);
  });
});

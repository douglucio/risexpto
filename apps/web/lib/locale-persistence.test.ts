import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isPublicLocalePath, persistLocaleSelection } from './locale-persistence';

describe('locale persistence boundary', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { cookie: '', documentElement: { lang: '' } });
    vi.stubGlobal('localStorage', { setItem: vi.fn() });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('classifies public authentication surfaces without requiring a session', () => {
    expect(isPublicLocalePath('/')).toBe(true);
    expect(isPublicLocalePath('/login')).toBe(true);
    expect(isPublicLocalePath('/auth/login')).toBe(true);
    expect(isPublicLocalePath('/dashboard')).toBe(false);
  });

  it('persists public locale without calling authenticated endpoints', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const result = await persistLocaleSelection('pt-BR', '/', fetcher);
    expect(result).toBe('public');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('persists authenticated locale only after a valid session', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue({ ok: true } as Response);
    const result = await persistLocaleSelection('es', '/dashboard', fetcher);
    expect(result).toBe('authenticated');
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher).toHaveBeenNthCalledWith(1, '/auth/session', { cache: 'no-store' });
    expect(fetcher).toHaveBeenCalledWith(
      '/auth/preferences',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ locale: 'es' }) }),
    );
  });
});

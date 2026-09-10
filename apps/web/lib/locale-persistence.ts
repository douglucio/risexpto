import type { Locale } from '@risexpto/i18n';

export type LocalePersistenceResult = 'public' | 'authenticated' | 'anonymous';

export function isPublicLocalePath(pathname: string): boolean {
  return pathname === '/' || pathname === '/login' || pathname.startsWith('/auth/');
}

export async function persistLocaleSelection(
  locale: Locale,
  pathname: string,
  fetcher: typeof fetch = fetch,
): Promise<LocalePersistenceResult> {
  document.cookie = `rx-locale=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  localStorage.setItem('rx-locale', locale);
  document.documentElement.lang = locale;

  if (isPublicLocalePath(pathname)) return 'public';

  const session = await fetcher('/auth/session', { cache: 'no-store' }).catch(() => null);
  if (!session?.ok) return 'anonymous';

  await Promise.all([
    fetcher('/auth/preferences', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale }),
    }),
    fetcher('/api/profile/preferences', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale }),
    }),
  ]);
  return 'authenticated';
}

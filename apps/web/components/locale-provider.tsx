'use client';

import { normalizeLocale, type Locale } from '@risexpto/i18n';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void };
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setValue] = useState<Locale>('en');
  useEffect(() => {
    const cookie = document.cookie
      .split('; ')
      .find((item) => item.startsWith('rx-locale='))
      ?.split('=')[1];
    const stored = cookie ?? localStorage.getItem('rx-locale') ?? undefined;
    const next = stored ? normalizeLocale(stored) : normalizeLocale(window.navigator.language);
    setValue(next);
    document.documentElement.lang = next;
  }, []);
  const setLocale = useCallback((next: Locale) => {
    setValue(next);
    document.cookie = `rx-locale=${encodeURIComponent(next)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    localStorage.setItem('rx-locale', next);
    document.documentElement.lang = next;
    void fetch('/auth/preferences', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: next }),
    }).catch(() => undefined);
    void fetch('/api/profile/preferences', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: next }),
    }).catch(() => undefined);
  }, []);
  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used inside LocaleProvider');
  return context;
}

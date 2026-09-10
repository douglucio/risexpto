'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocale } from './locale-provider';
import { translate } from '@risexpto/i18n';

const navigation = [
  ['nav.dashboard', '/dashboard'],
  ['nav.bots', '/bots'],
  ['nav.strategies', '/strategies'],
  ['nav.connections', '/exchange-connections'],
  ['nav.backtests', '/backtests'],
  ['nav.trades', '/trades'],
  ['nav.risk', '/risk'],
  ['nav.notifications', '/notifications'],
  ['nav.billing', '/billing'],
  ['nav.settings', '/settings'],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { locale, setLocale } = useLocale();
  const t = (key: string) => translate(key, locale);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [user, setUser] = useState<{ name: string; email: string; roles: string[] } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuItemsRef = useRef<HTMLDivElement>(null);
  const sessionLoaded = useRef(false);
  useEffect(() => {
    const saved = localStorage.getItem('rx-theme');
    const next = saved === 'light' || saved === 'dark' ? saved : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);
  useEffect(() => {
    // The public landing page does not need an anonymous session probe. This
    // avoids an expected 401 and keeps the public runtime free of auth noise.
    if (pathname === '/' || pathname === '/login' || sessionLoaded.current) return;
    sessionLoaded.current = true;
    void fetch('/auth/session', { cache: 'no-store' }).then(async (response) => {
      if (response.ok) {
        const body = (await response.json()) as {
          user: { name: string; email: string; roles: string[] };
          preferences?: { locale?: 'en' | 'pt-BR' | 'es' };
        };
        setUser(body.user);
        const explicitLocale = document.cookie
          .split('; ')
          .find((item) => item.startsWith('rx-locale='))
          ?.split('=')[1];
        if (explicitLocale) {
          // An explicit visitor/user selection wins over a stale persisted
          // profile. setLocale also reconciles the session and profile.
          if (explicitLocale !== body.preferences?.locale) setLocale(locale);
        } else if (body.preferences?.locale) {
          setLocale(body.preferences.locale);
        }
      }
    });
  }, [pathname]);
  useEffect(() => {
    setUserMenuOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!userMenuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) setUserMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [userMenuOpen]);
  useEffect(() => {
    if (userMenuOpen)
      userMenuItemsRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [userMenuOpen]);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('rx-theme', next);
    document.documentElement.dataset.theme = next;
  };
  const activeLabel = t(navigation.find(([, href]) => href === pathname)?.[0] ?? 'nav.dashboard');
  if (pathname === '/' || pathname === '/login') return <>{children}</>;
  return (
    <div className="app-shell">
      <aside
        className={mobileOpen ? 'app-sidebar is-open' : 'app-sidebar'}
        aria-label="Primary navigation"
      >
        <Link href="/" className="app-brand" onClick={() => setMobileOpen(false)}>
          <span aria-hidden="true">R</span>
          <b>RiseXPTO</b>
        </Link>
        <nav>
          {navigation.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              onClick={() => setMobileOpen(false)}
            >
              {t(label)}
            </Link>
          ))}
          {user?.roles.includes('ADMIN') ? (
            <Link
              href="/admin"
              aria-current={pathname === '/admin' ? 'page' : undefined}
              onClick={() => setMobileOpen(false)}
            >
              {t('nav.admin')}
            </Link>
          ) : null}
        </nav>
        <div className="mode-guard">
          <small>{t('nav.tradingMode')}</small>
          <b>
            <i /> PAPER
          </b>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="app-workspace">
        <header className="app-topbar">
          <button
            className="menu-button"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            ☰
          </button>
          <div className="breadcrumbs">
            <span>RiseXPTO</span>
            <b>/</b>
            <strong>{activeLabel}</strong>
          </div>
          <div className="topbar-actions">
            <select
              aria-label="Language / Idioma / Idioma"
              value={locale}
              onChange={(event) => setLocale(event.target.value as typeof locale)}
            >
              <option value="en">🇺🇸 EN</option>
              <option value="pt-BR">🇧🇷 PT</option>
              <option value="es">🇪🇸 ES</option>
            </select>
            <button
              onClick={toggleTheme}
              aria-label={`Use ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <button aria-label="Open notifications">●</button>
            <div className="avatar-menu" ref={userMenuRef}>
              <button
                className="avatar"
                type="button"
                title={user?.email}
                aria-label={user?.email ? `Open user menu for ${user.email}` : 'Open user menu'}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                onClick={() => setUserMenuOpen((open) => !open)}
              >
                {user ? initials(user.name) : 'RX'}
              </button>
              {userMenuOpen ? (
                <div
                  className="avatar-menu-items"
                  ref={userMenuItemsRef}
                  role="menu"
                  onKeyDown={(event) => {
                    const items = Array.from(
                      event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'),
                    );
                    const current = items.indexOf(document.activeElement as HTMLElement);
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                      event.preventDefault();
                      const offset = event.key === 'ArrowDown' ? 1 : -1;
                      items[(current + offset + items.length) % items.length]?.focus();
                    }
                    if (event.key === 'Home' || event.key === 'End') {
                      event.preventDefault();
                      items[event.key === 'Home' ? 0 : items.length - 1]?.focus();
                    }
                  }}
                >
                  <Link href="/settings" role="menuitem">
                    {t('nav.profile')}
                  </Link>
                  <Link href="/settings" role="menuitem">
                    {t('nav.settings')}
                  </Link>
                  {user?.roles.includes('ADMIN') ? (
                    <Link href="/admin" role="menuitem">
                      {t('nav.admin')}
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => (
                      setUserMenuOpen(false),
                      document.querySelector<HTMLFormElement>('[data-logout-form]')?.requestSubmit()
                    )}
                  >
                    {t('nav.logout')}
                  </button>
                </div>
              ) : null}
            </div>
            <form action="/auth/logout" method="post" data-logout-form hidden />
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'RX'
  );
}

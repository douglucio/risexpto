'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

const navigation = [
  ['Dashboard', '/'],
  ['Bots', '/bots'],
  ['Strategies', '/strategies'],
  ['Exchanges', '/exchange-connections'],
  ['Backtests', '/backtests'],
  ['Trades', '/trades'],
  ['Risk', '/risk'],
  ['Notifications', '/notifications'],
  ['Billing', '/billing'],
  ['Settings', '/settings'],
  ['Admin', '/admin'],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  useEffect(() => {
    const saved = localStorage.getItem('rx-theme');
    const next = saved === 'light' || saved === 'dark' ? saved : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);
  useEffect(() => {
    if (pathname === '/login') return;
    void fetch('/auth/session', { cache: 'no-store' }).then(async (response) => {
      if (response.ok) {
        const body = (await response.json()) as { user: { name: string; email: string } };
        setUser(body.user);
      }
    });
  }, [pathname]);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('rx-theme', next);
    document.documentElement.dataset.theme = next;
  };
  const activeLabel = navigation.find(([, href]) => href === pathname)?.[0] ?? 'Dashboard';
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
              {label}
            </Link>
          ))}
        </nav>
        <div className="mode-guard">
          <small>TRADING MODE</small>
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
            <button
              onClick={toggleTheme}
              aria-label={`Use ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <button aria-label="Open notifications">●</button>
            <span className="avatar" title={user?.email}>
              {user ? initials(user.name) : 'RX'}
            </span>
            <form action="/auth/logout" method="post">
              <button type="submit" aria-label="Sign out">
                ↪
              </button>
            </form>
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

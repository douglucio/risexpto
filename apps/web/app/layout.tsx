import type { Metadata } from 'next';
import { AppShell } from '../components/app-shell';
import './globals.css';
import '@risexpto/ui/styles.css';
import { LocaleProvider } from '../components/locale-provider';

export const metadata: Metadata = {
  title: 'RiseXPTO — Trading automation with guardrails',
  description:
    'Non-custodial crypto automation with risk controls, Paper Trading, and transparent monitoring.',
  openGraph: {
    title: 'RiseXPTO',
    description: 'Trading automation with guardrails.',
    type: 'website',
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <LocaleProvider>
          <AppShell>{children}</AppShell>
        </LocaleProvider>
      </body>
    </html>
  );
}

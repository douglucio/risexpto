import type { Metadata } from 'next';
import { AppShell } from '../components/app-shell';
import './globals.css';
import '@risexpto/ui/styles.css';

export const metadata: Metadata = {
  title: 'RiseXPTO',
  description: 'Controlled trading automation.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

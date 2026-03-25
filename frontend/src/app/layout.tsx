import type { Metadata } from 'next';
import { Providers } from './providers';
import { ServerThemeInjector } from '@/components/layout/ServerThemeInjector';
import './globals.css';

export const metadata: Metadata = {
  title: 'SchoolOS',
  description: 'Multi-tenant School ERP Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/*
         * ServerThemeInjector is a Server Component that fetches the school's
         * theme and injects CSS custom properties as a <style> tag at SSR time.
         * Placed at the top of <body> (not <head>) to avoid Next.js 15's head
         * reconciliation reordering elements between SSR and client hydration,
         * which was the root cause of the hydration mismatch error.
         * A <style> in <body> is valid HTML5 and applies globally.
         */}
        <ServerThemeInjector />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

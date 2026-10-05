import type { ReactNode } from 'react';
import { SwayLogo } from '@/components/sway-logo';
import { cn } from '@/lib/utils';
import './entry-page.css';

export function EntryPage({
  children,
  artwork = 'crowd',
}: {
  children: ReactNode;
  artwork?: 'crowd' | 'dj';
}) {
  return (
    <div
      className={cn(
        'dark entry-page flex min-h-svh flex-col items-center gap-6 p-6 md:p-10',
        artwork === 'dj' && 'entry-page--dj',
      )}
    >
      <header className="flex w-full justify-center">
        <a href="https://sway.onl" aria-label="Sway home">
          <SwayLogo className="h-8" />
        </a>
      </header>
      <main className="flex w-full flex-1 items-center justify-center py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

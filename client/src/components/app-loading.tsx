import { SwayLogo } from '@/components/sway-logo';

import { cn } from '@/lib/utils';

export function AppLoading({
  label = 'Getting things ready',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-svh w-full items-center justify-center bg-background px-6 text-foreground',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center text-center">
        <SwayLogo className="h-10" />
        <p className="mt-5 text-sm text-muted-foreground">{label}</p>
        <div className="mt-5 flex items-center gap-1.5" aria-hidden="true">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

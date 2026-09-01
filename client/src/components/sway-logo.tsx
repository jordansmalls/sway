import { cn } from '@/lib/utils';

export function SwayLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="320 260 1200 380"
      width="1200"
      height="380"
      role="img"
      aria-label="Sway"
      className={cn('block h-6 w-auto shrink-0', className)}
    >
      {/* Frame the artwork without changing the supplied PNGs or their proportions. */}
      <image
        href="/brand/sway-logo-black.png"
        width="1774"
        height="887"
        className="block dark:hidden print:block!"
      />
      <image
        href="/brand/sway-logo-white.png"
        width="1774"
        height="887"
        className="hidden dark:block print:hidden!"
      />
    </svg>
  );
}

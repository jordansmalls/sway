import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ExplicitBadgeProps {
  explicit?: boolean;
  className?: string;
}

// Spotify-style "E" marker. Renders nothing unless the track is known to be explicit.
export function ExplicitBadge({ explicit, className }: ExplicitBadgeProps) {
  if (explicit !== true) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label="Explicit"
          className={cn(
            "inline-flex size-4 shrink-0 select-none items-center justify-center rounded-[3px] bg-muted-foreground/80 text-[10px] leading-none font-semibold text-background",
            className
          )}
        >
          E
        </span>
      </TooltipTrigger>
      <TooltipContent>Explicit</TooltipContent>
    </Tooltip>
  );
}

export default ExplicitBadge;

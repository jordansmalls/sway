import * as React from "react"

import { cn } from "@/lib/utils"

type MarqueeProps = React.ComponentProps<"div"> & {
  reverse?: boolean
  pauseOnHover?: boolean
  vertical?: boolean
  repeat?: number
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  vertical = false,
  repeat = 4,
  children,
  style,
  ...props
}: MarqueeProps) {
  const copies = Math.max(2, Math.floor(repeat))

  return (
    <div
      {...props}
      style={{ ...style, "--marquee-repeat": copies } as React.CSSProperties}
      className={cn(
        "group isolate flex overflow-hidden p-2 [--duration:28s] [--gap:0.75rem]",
        vertical ? "flex-col" : "flex-row",
        className
      )}
    >
      <div
        className={cn(
          "flex shrink-0 [backface-visibility:hidden] [will-change:transform] motion-reduce:animate-none",
          vertical
            ? "animate-[marquee-vertical_var(--duration)_linear_infinite] flex-col"
            : "w-max animate-[marquee_var(--duration)_linear_infinite] flex-row",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
      >
        {Array.from({ length: copies }).map((_, index) => (
          <div
            key={index}
            aria-hidden={index > 0}
            inert={index > 0 ? true : undefined}
            className={cn(
              "flex shrink-0 [gap:var(--gap)]",
              vertical ? "flex-col pb-[var(--gap)]" : "flex-row pr-[var(--gap)]"
            )}
          >
            {children}
          </div>
        ))}
      </div>
    </div>
  )
}

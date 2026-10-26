import * as React from "react"

import { cn } from "@/lib/utils"
import { MarqueeCopyContext } from "@/registry/magicui/marquee-copy"

type MarqueeProps = React.ComponentProps<"div"> & {
  reverse?: boolean
  pauseOnHover?: boolean
  vertical?: boolean
  repeat?: number
  /**
   * Lets pointer and touch users interact with every visible copy. Repeated copies stay
   * hidden from assistive tech; children should read `useMarqueeCopy()` and drop their
   * controls from the tab order when it returns true. Copies are removed under reduced
   * motion, where the track becomes a plain horizontal scroller.
   */
  interactiveCopies?: boolean
  /** Also pauses while focus is inside the marquee and briefly after a touch. */
  pauseOnInteraction?: boolean
}

const TOUCH_RESUME_DELAY_MS = 3000

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  vertical = false,
  repeat = 4,
  interactiveCopies = false,
  pauseOnInteraction = false,
  children,
  style,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  ...props
}: MarqueeProps) {
  const copies = Math.max(2, Math.floor(repeat))
  const [touchPaused, setTouchPaused] = React.useState(false)
  const resumeTimer = React.useRef<number | undefined>(undefined)

  React.useEffect(() => () => window.clearTimeout(resumeTimer.current), [])

  const holdForTouch = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pauseOnInteraction || event.pointerType === "mouse") return
    window.clearTimeout(resumeTimer.current)
    setTouchPaused(true)
  }

  const releaseTouch = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pauseOnInteraction || event.pointerType === "mouse") return
    window.clearTimeout(resumeTimer.current)
    resumeTimer.current = window.setTimeout(() => setTouchPaused(false), TOUCH_RESUME_DELAY_MS)
  }

  return (
    <div
      {...props}
      data-paused={touchPaused || undefined}
      onPointerDown={(event) => { holdForTouch(event); onPointerDown?.(event) }}
      onPointerUp={(event) => { releaseTouch(event); onPointerUp?.(event) }}
      onPointerCancel={(event) => { releaseTouch(event); onPointerCancel?.(event) }}
      style={{ ...style, "--marquee-repeat": copies } as React.CSSProperties}
      className={cn(
        "group isolate flex overflow-hidden p-2 [--duration:28s] [--gap:0.75rem]",
        vertical ? "flex-col" : "flex-row",
        interactiveCopies && (vertical ? "motion-reduce:overflow-y-auto" : "motion-reduce:overflow-x-auto"),
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
          pauseOnHover && "group-hover:[animation-play-state:paused]",
          pauseOnInteraction && "group-focus-within:[animation-play-state:paused] group-data-paused:[animation-play-state:paused]"
        )}
      >
        {Array.from({ length: copies }).map((_, index) => (
          <div
            key={index}
            aria-hidden={index > 0}
            inert={index > 0 && !interactiveCopies ? true : undefined}
            className={cn(
              "flex shrink-0 [gap:var(--gap)]",
              vertical ? "flex-col pb-[var(--gap)]" : "flex-row pr-[var(--gap)]",
              index > 0 && interactiveCopies && "motion-reduce:hidden"
            )}
          >
            <MarqueeCopyContext.Provider value={index > 0 && interactiveCopies}>
              {children}
            </MarqueeCopyContext.Provider>
          </div>
        ))}
      </div>
    </div>
  )
}

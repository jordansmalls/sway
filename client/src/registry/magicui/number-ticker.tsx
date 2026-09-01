import * as React from "react"

import { cn } from "@/lib/utils"

type NumberTickerProps = React.ComponentProps<"span"> & {
  value: number
  decimalPlaces?: number
  delay?: number
  duration?: number
}

export function NumberTicker({
  value,
  decimalPlaces = 0,
  delay = 0,
  duration = 900,
  className,
  ...props
}: NumberTickerProps) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const [displayValue, setDisplayValue] = React.useState(0)

  React.useEffect(() => {
    const element = ref.current
    if (!element) return

    let frame = 0
    let timeout = 0

    const animate = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setDisplayValue(value)
        return
      }

      const startValue = displayValue
      const startedAt = performance.now()
      const tick = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplayValue(startValue + (value - startValue) * eased)
        if (progress < 1) frame = requestAnimationFrame(tick)
      }
      timeout = window.setTimeout(() => { frame = requestAnimationFrame(tick) }, delay * 1000)
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        animate()
        observer.disconnect()
      }
    })
    observer.observe(element)

    return () => {
      observer.disconnect()
      window.clearTimeout(timeout)
      cancelAnimationFrame(frame)
    }
    // displayValue is intentionally captured as the animation's starting point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, duration, value])

  return (
    <span ref={ref} className={cn("tabular-nums", className)} {...props}>
      {displayValue.toLocaleString(undefined, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      })}
    </span>
  )
}

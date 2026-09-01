import * as React from "react"

import { cn } from "@/lib/utils"

type AnimatedListProps = React.ComponentProps<"div"> & {
  delay?: number
}

export function AnimatedList({
  children,
  className,
  delay = 70,
  ...props
}: AnimatedListProps) {
  const items = React.Children.toArray(children)
  const itemRefs = React.useRef(new Map<string, HTMLDivElement>())
  const previousPositions = React.useRef(new Map<string, DOMRect>())

  React.useLayoutEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const nextPositions = new Map<string, DOMRect>()

    itemRefs.current.forEach((element, key) => {
      const nextPosition = element.getBoundingClientRect()
      nextPositions.set(key, nextPosition)
      const previousPosition = previousPositions.current.get(key)

      if (!reducedMotion && previousPosition) {
        const x = previousPosition.left - nextPosition.left
        const y = previousPosition.top - nextPosition.top
        if (x !== 0 || y !== 0) {
          element.animate(
            [{ transform: `translate(${x}px, ${y}px)` }, { transform: "translate(0, 0)" }],
            { duration: 260, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
          )
        }
      }
    })

    previousPositions.current = nextPositions
  })

  return (
    <div className={cn("relative", className)} role="list" {...props}>
      {items.map((item, index) => {
        const key = String(React.isValidElement(item) ? item.key ?? index : index)
        return (
          <div
            key={key}
            ref={(element) => {
              if (element) itemRefs.current.set(key, element)
              else itemRefs.current.delete(key)
            }}
            role="listitem"
            className="animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none"
            style={{ animationDelay: `${Math.min(index * delay, 350)}ms`, animationFillMode: "backwards" }}
          >
            {item}
          </div>
        )
      })}
    </div>
  )
}

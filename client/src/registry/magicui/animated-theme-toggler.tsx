import { Moon, Sun } from "lucide-react"
import * as React from "react"
import { flushSync } from "react-dom"

import { useTheme } from "@/components/theme/theme-provider"
import { cn } from "@/lib/utils"

export function AnimatedThemeToggler({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { setTheme } = useTheme()

  const toggleTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement
    const nextTheme = root.classList.contains("dark") ? "light" : "dark"
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const applyTheme = () => {
      flushSync(() => setTheme(nextTheme))
      root.classList.remove("light", "dark")
      root.classList.add(nextTheme)
    }

    if (!("startViewTransition" in document) || prefersReducedMotion) {
      applyTheme()
      return
    }

    const x = event.clientX
    const y = event.clientY
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    const transition = document.startViewTransition(applyTheme)
    void transition.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: 450,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      )
    })
  }

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex size-7 items-center justify-center rounded-md border border-transparent bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      {...props}
    >
      <Sun className="size-4 scale-100 rotate-0 transition-all duration-300 dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute size-4 scale-0 rotate-90 transition-all duration-300 dark:scale-100 dark:rotate-0" />
    </button>
  )
}

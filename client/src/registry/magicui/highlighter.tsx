"use client"

import { useLayoutEffect, useRef } from "react"
import type React from "react"
import { useInView, useReducedMotion } from "motion/react"
import { annotate } from "rough-notation"
import { type RoughAnnotation } from "rough-notation/lib/model"

type AnnotationAction =
  | "highlight"
  | "underline"
  | "box"
  | "circle"
  | "strike-through"
  | "crossed-off"
  | "bracket"

interface HighlighterProps {
  children: React.ReactNode
  action?: AnnotationAction
  color?: string
  strokeWidth?: number
  animationDuration?: number
  /** Delay in milliseconds before drawing the annotation. */
  delay?: number
  iterations?: number
  padding?: number
  multiline?: boolean
  isView?: boolean
}

export function Highlighter({
  children,
  action = "highlight",
  color = "#ffd1dc",
  strokeWidth = 1.5,
  animationDuration = 600,
  delay = 0,
  iterations = 2,
  padding = 2,
  multiline = true,
  isView = false,
}: HighlighterProps) {
  const elementRef = useRef<HTMLSpanElement>(null)
  const reducedMotion = useReducedMotion()

  const isInView = useInView(elementRef, {
    once: true,
    margin: "-10%",
  })

  // If isView is false, always show. If isView is true, wait for inView
  const shouldShow = !isView || isInView

  useLayoutEffect(() => {
    const element = elementRef.current
    let annotation: RoughAnnotation | null = null
    let resizeObserver: ResizeObserver | null = null
    let timeout: ReturnType<typeof setTimeout> | undefined

    if (shouldShow && element) {
      const annotationConfig = {
        type: action,
        animate: !reducedMotion,
        color,
        strokeWidth,
        animationDuration,
        iterations,
        padding,
        multiline,
      }

      const currentAnnotation = annotate(element, annotationConfig)
      annotation = currentAnnotation
      let hasShown = false
      const showAnnotation = () => {
        hasShown = true
        currentAnnotation.show()
      }
      if (delay > 0 && !reducedMotion) {
        timeout = setTimeout(showAnnotation, delay)
      } else {
        showAnnotation()
      }

      resizeObserver = new ResizeObserver(() => {
        if (!hasShown) return
        currentAnnotation.hide()
        currentAnnotation.show()
      })

      resizeObserver.observe(element)
      resizeObserver.observe(document.body)
    }

    return () => {
      clearTimeout(timeout)
      annotation?.remove()
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  }, [
    shouldShow,
    reducedMotion,
    action,
    color,
    strokeWidth,
    animationDuration,
    delay,
    iterations,
    padding,
    multiline,
  ])

  return (
    <span ref={elementRef} className="relative inline-block bg-transparent">
      {children}
    </span>
  )
}

import { createContext, useContext } from "react"
import type { DemoSession } from "@/lib/demo-session"

export const DemoContext = createContext<DemoSession | null>(null)
export const useDemoSession = () => useContext(DemoContext)

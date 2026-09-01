import type { Room, User } from "@/api/types"

export type DemoSession = { djToken: string; guestToken: string; expiresAt: string; room: Room; user: User }
const storageKey = "sway-demo-session"
let current: DemoSession | null = null

export function readDemoSession(): DemoSession | null {
  if (current) return current
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) ?? "null")
    if (value?.djToken && value?.guestToken && value?.room?.roomCode && value?.expiresAt) current = value
  } catch { /* Storage may be unavailable; the session still works in memory. */ }
  return current
}

export function saveDemoSession(session: DemoSession) {
  current = session
  try { sessionStorage.setItem(storageKey, JSON.stringify(session)) } catch { /* Use the in-memory session. */ }
}

export function isDemoExperience() {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/demo/")
}

export function demoRole() {
  return /\/demo\/(dj$|room\/admin\/)/.test(window.location.pathname) ? "dj" : "guest"
}

export function activeDemoToken() {
  const session = readDemoSession()
  return session ? (demoRole() === "dj" ? session.djToken : session.guestToken) : null
}

/** Keep room links inside the demo without changing production links. */
export function roomExperiencePath(path: string) {
  return isDemoExperience() ? `/demo${path}` : path
}

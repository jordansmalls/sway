import { useEffect, useState } from "react"
import axios from "axios"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Link, Navigate, Outlet, useLocation, useParams } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { AppLoading } from "@/components/app-loading"
import { SwayLogo } from "@/components/sway-logo"
import { DemoContext } from "@/components/demo/demo-context"
import { getApiErrorMessage } from "@/api/client"
import { activeDemoToken, readDemoSession, saveDemoSession, type DemoSession } from "@/lib/demo-session"

const demoApi = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? "", withCredentials: false })
let opening: Promise<DemoSession> | null = null

function openDemo(allowCreate: boolean) {
  if (opening) return opening
  opening = (async () => {
    const saved = readDemoSession()
    if (saved && new Date(saved.expiresAt).getTime() > Date.now()) {
      try {
        const { data } = await demoApi.get("/api/demo/session", { headers: { "X-Demo-Token": saved.guestToken } })
        const session = { ...saved, ...data }
        saveDemoSession(session)
        return session
      } catch (error) {
        if (!axios.isAxiosError(error) || error.response?.status !== 410) throw error
      }
    }
    if (!allowCreate) throw new Error("This demo has expired or belongs to another browser session. Start a fresh demo below.")
    const { data } = await demoApi.post<DemoSession>("/api/demo/session")
    saveDemoSession(data)
    return data
  })().finally(() => { opening = null })
  return opening
}

export default function DemoExperience() {
  const { pathname } = useLocation()
  const { roomCode } = useParams()
  const entry = pathname === "/demo/dj" || pathname === "/demo/guest"
  const [session, setSession] = useState<DemoSession | null>(null)
  const [error, setError] = useState("")
  const [now, setNow] = useState(Date.now)
  const [resetting, setResetting] = useState(false)
  const [revision, setRevision] = useState(0)
  // Production and demo caches never share user, catalog, or analytics data.
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: {
    queries: { retry: false, refetchInterval: 5000, refetchOnWindowFocus: true },
    mutations: { retry: false },
  } }))

  useEffect(() => {
    let cancelled = false
    openDemo(entry).then((value) => { if (!cancelled) setSession(value) })
      .catch((reason) => { if (!cancelled) setError(getApiErrorMessage(reason)) })
    return () => { cancelled = true }
  }, [entry])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    const expired = () => setError("Your demo has expired. Start a fresh demo to keep exploring.")
    window.addEventListener("sway:demo-expired", expired)
    return () => { clearInterval(timer); window.removeEventListener("sway:demo-expired", expired) }
  }, [])

  const remaining = session ? Math.max(0, Math.ceil((new Date(session.expiresAt).getTime() - now) / 60_000)) : 0
  async function reset() {
    setResetting(true)
    try {
      await demoApi.post("/api/demo/reset", {}, { headers: { "X-Demo-Token": activeDemoToken() } })
      await queryClient.cancelQueries()
      queryClient.clear()
      setRevision((value) => value + 1)
      toast.success("Demo reset", { description: "Your room and song queue are back to their starting state. Your original session timer is unchanged." })
    } catch (reason) {
      toast.error("Couldn't reset the demo", { description: getApiErrorMessage(reason, "Please try again. Your current demo has been kept.") })
    }
    finally { setResetting(false) }
  }

  if (error || (session && remaining === 0)) return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <Link to="/demo"><SwayLogo className="h-10" /></Link>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Let’s get you back to the demo.</h1>
      <p className="max-w-xl text-lg text-muted-foreground sm:text-xl">{error || "Your 30 minute demo has expired."}</p>
      <Button size="lg" className="h-12 px-8 text-lg" asChild><Link to="/demo">Try again?</Link></Button>
    </main>
  )
  if (!session) return <AppLoading label="Preparing your private demo room" />
  const guestPath = `/demo/room/${session.room.roomCode}`
  const djPath = `/demo/room/admin/${session.room.roomCode}`
  if (entry) return <Navigate replace to={pathname === "/demo/dj" ? djPath : guestPath} />
  if (roomCode?.toUpperCase() !== session.room.roomCode) return <Navigate replace to="/demo" />

  return (
    <DemoContext.Provider value={session}>
      <QueryClientProvider client={queryClient}>
        <div className="flex h-svh flex-col overflow-hidden">
          <aside className="z-30 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-blue-50 px-4 py-2 text-blue-950 dark:bg-blue-950 dark:text-blue-50" aria-label="Demo controls">
            <div className="text-xs leading-5"><strong>Demo mode</strong> · Real songs, demo activity · {remaining} min left
              <p className="text-blue-800 dark:text-blue-200">Private to this session. No audio playback or external accounts.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild><Link to={pathname.includes("/admin/") ? guestPath : djPath}>{pathname.includes("/admin/") ? "As Guest" : "As DJ"}</Link></Button>
              <Button size="sm" variant="outline" disabled={resetting} onClick={reset}>{resetting ? "Resetting…" : "Reset demo"}</Button>
              <Button size="sm" variant="ghost" asChild><Link to="/demo">Exit demo</Link></Button>
            </div>
          </aside>
          <div className="min-h-0 flex-1 overflow-auto" key={revision}><Outlet /></div>
        </div>
      </QueryClientProvider>
    </DemoContext.Provider>
  )
}

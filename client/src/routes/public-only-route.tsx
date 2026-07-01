import { useEffect } from "react"
import { Navigate, Outlet } from "react-router-dom"

import { useCurrentUserQuery } from "@/api/users"
import { useAuthStore } from "@/stores/auth-store"
import { Spinner } from "../components/ui/spinner"

export default function PublicOnlyRoute() {
  const setUser = useAuthStore((state) => state.setUser)
  const clearUser = useAuthStore((state) => state.clearUser)

  const { data, isLoading } = useCurrentUserQuery()

  useEffect(() => {
    if (data?.user) {
      setUser(data.user)
    } else {
      clearUser()
    }
  }, [data, setUser, clearUser])

  if (isLoading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col items-center justify-center gap-8 text-center">
          <div className="flex items-center gap-2 font-black tracking-tighter text-muted-foreground">
            <span>Sway</span>
          </div>

          {/* Spinner & Loading Text Container */}
          <div className="flex flex-col items-center gap-3">
            <Spinner className="size-16" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Loading...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  // If a user exists, redirect them away from login/signup to the dashboard
  if (data?.user) {
    return <Navigate to="/dashboard" replace />
  }

  // If no user, render the login/signup pages safely
  return <Outlet />
}
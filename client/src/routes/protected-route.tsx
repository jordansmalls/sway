import { useEffect } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useCurrentUserQuery } from "@/api/users"
import { useAuthStore } from "@/stores/auth-store"
import { AppLoading } from "@/components/app-loading"

export default function ProtectedRoute() {
  const setUser = useAuthStore((state) => state.setUser)
  const clearUser = useAuthStore((state) => state.clearUser)
  const location = useLocation()

  const { data, isLoading, isError } = useCurrentUserQuery()

  useEffect(() => {
    if (data?.user) {
      setUser(data.user)
    } else {
      clearUser()
    }
  }, [data, setUser, clearUser])

  if (isLoading) {
    return <AppLoading label="Opening your workspace" className={location.pathname === "/username" ? "dark bg-[#0c0d0e] text-foreground [color-scheme:dark]" : undefined} />
  }

  if (isError || !data?.user) {
    return <Navigate to="/login" replace />
  }

  if (!data.user.hasUsername && location.pathname !== "/username") {
    return <Navigate to="/username" replace />
  }

  return <Outlet />
}

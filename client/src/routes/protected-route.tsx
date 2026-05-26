import { useEffect } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useCurrentUserQuery } from "@/api/users"
import { useAuthStore } from "@/stores/auth-store"

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
    return <div>Loading...</div>
  }

  if (isError || !data?.user) {
    return <Navigate to="/login" replace />
  }

  // 🔄 NEW TRAFFIC CONTROL LOGIC
  // If they don't have a username, and they aren't ALREADY on the username page, send them there.
  if (!data.user.hasUsername && location.pathname !== "/username") {
    return <Navigate to="/username" replace />
  }

  return <Outlet />
}
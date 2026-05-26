import { useEffect } from "react"
import { Navigate, Outlet } from "react-router-dom"

import { useCurrentUserQuery } from "@/api/users"
import { useAuthStore } from "@/stores/auth-store"

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
    return <div>Loading...</div>
  }

  // If a user exists, redirect them away from login/signup to the dashboard
  if (data?.user) {
    return <Navigate to="/dashboard" replace />
  }

  // If no user, render the login/signup pages safely
  return <Outlet />
}
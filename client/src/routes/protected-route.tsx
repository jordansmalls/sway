import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useCurrentUserQuery } from "@/api/users"
import { AppLoading } from "@/components/app-loading"

export default function ProtectedRoute() {
  const location = useLocation()

  const { data, isLoading, isError } = useCurrentUserQuery()

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

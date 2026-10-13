import { Navigate, Outlet } from "react-router-dom"

import { useCurrentUserQuery } from "@/api/users"
import { AppLoading } from "@/components/app-loading"

export default function PublicOnlyRoute() {
  const { data, isLoading } = useCurrentUserQuery()

  if (isLoading) {
    return <AppLoading label="Loading Sway" className="dark bg-[#0c0d0e] text-foreground [color-scheme:dark]" />
  }

  // If a user exists, redirect them away from login/signup to the dashboard
  if (data?.user) {
    return <Navigate to={data.user.hasUsername ? "/dashboard" : "/username"} replace />
  }

  // If no user, render the login/signup pages safely
  return <Outlet />
}

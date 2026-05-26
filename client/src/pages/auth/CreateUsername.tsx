import { useEffect } from "react"
import { Navigate, useNavigate } from "react-router-dom"

import { useCurrentUserQuery } from "@/api/users"
import { CreateUsernameForm } from '../../components/forms/auth/create-username-form'

export default function CreateUsername() {
  const { data, isLoading } = useCurrentUserQuery()
  const navigate = useNavigate()

  // Guard clause: Wait for user data to load
  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div>Loading...</div>
      </div>
    )
  }

  // If the backend says they already set up their username, kick them to the dashboard
  if (data?.user?.hasUsername) {
    return <Navigate to="/dashboard" replace />
  }

  // Otherwise, safely render the username creation screen
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <CreateUsernameForm />
      </div>
    </div>
  )
}
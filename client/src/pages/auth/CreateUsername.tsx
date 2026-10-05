import { EntryPage } from '@/components/entry-page/entry-page';
import { Navigate } from "react-router-dom"

import { useCurrentUserQuery } from "@/api/users"
import { AppLoading } from "@/components/app-loading"
import { CreateUsernameForm } from '../../components/forms/auth/create-username-form'

export default function CreateUsername() {
  const { data, isLoading } = useCurrentUserQuery()

  // Guard clause: Wait for user data to load
  if (isLoading) {
    return <AppLoading label="Preparing your profile" className="dark bg-[#0c0d0e] text-foreground [color-scheme:dark]" />
  }

  // If the backend says they already set up their username, kick them to the dashboard
  if (data?.user?.hasUsername) {
    return <Navigate to="/dashboard" replace />
  }

  // Otherwise, safely render the username creation screen
  return (
    <EntryPage artwork="dj">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl tracking-tighter font-bold text-white">
          You&apos;re in! Let&apos;s pick your handle.
        </h1>
        <p className="text-xs text-white/50">
          This is how you'll appear to all users and party guests on Sway.
        </p>
      </div>
      <CreateUsernameForm />
    </EntryPage>
  )
}

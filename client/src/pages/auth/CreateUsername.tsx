import { SwayLogo } from '@/components/sway-logo';
import { Navigate } from "react-router-dom"

import { useCurrentUserQuery } from "@/api/users"
import { AppLoading } from "@/components/app-loading"
import { CreateUsernameForm } from '../../components/forms/auth/create-username-form'

export default function CreateUsername() {
  const { data, isLoading } = useCurrentUserQuery()

  // Guard clause: Wait for user data to load
  if (isLoading) {
    return <AppLoading label="Preparing your profile" />
  }

  // If the backend says they already set up their username, kick them to the dashboard
  if (data?.user?.hasUsername) {
    return <Navigate to="/dashboard" replace />
  }

  // Otherwise, safely render the username creation screen
  return (
    <div className="min-h-svh bg-white text-zinc-950 dark:bg-background dark:text-foreground">
      <main className="flex min-h-svh items-center justify-center px-6 py-12 sm:px-10 lg:px-14">
        <div className="w-full max-w-md">
          <div className="mb-9 flex flex-col items-center text-center">
            <a
              href="https://www.sway.onl"
              className="mb-7 flex w-fit items-center gap-2.5 text-xl font-bold tracking-[-0.04em]"
            >
              <SwayLogo className="h-8" />
            </a>
            <h1 className="max-w-sm text-3xl font-semibold leading-[1.1] tracking-[-0.04em] sm:text-4xl">
              You&apos;re in. Let&apos;s pick your handle.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-500 dark:text-muted-foreground">
              Choose the username you&apos;ll use to share live request queues
              with clients and guests.
            </p>
          </div>
          <CreateUsernameForm />
        </div>
      </main>
    </div>
  )
}

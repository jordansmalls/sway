import { Settings as SettingsIcon } from "lucide-react"

import { SettingsForm } from "@/components/forms/auth/settings-form"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function Settings() {
  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] shrink-0 items-center bg-card">
        <div className="flex items-center gap-3 px-4 sm:px-6">
          <SidebarTrigger className="-ml-2" />
          <div className="flex items-center gap-2">
            <SettingsIcon className="size-4 text-zinc-400 dark:text-icon-orange" />
            <span className="text-sm font-semibold">Settings</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <section>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Settings
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Manage your account settings and preferences.
            </p>
          </section>

          <SettingsForm />
        </div>
      </div>
    </>
  )
}

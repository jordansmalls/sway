import { Outlet } from "react-router-dom"

import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useAuthStore } from "@/stores/auth-store"
import { useDemoSession } from "@/components/demo/demo-context"

export function AppLayout() {
  const user = useAuthStore((state) => state.user)
  const demo = useDemoSession()

  return (
    <SidebarProvider className={demo ? "relative h-full min-h-0 bg-sidebar" : "bg-sidebar"}>
      <AppSidebar user={demo?.user ?? user} className={demo ? "absolute h-full" : undefined} />
      <SidebarInset
        className={`min-w-0 overflow-hidden ${demo ? "h-full" : "h-svh"}`}
      >
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}

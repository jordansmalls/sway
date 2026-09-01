import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import {
  ChartSpline,
  ChevronRight,
  CircleHelp,
  FileDown,
  Folder,
  Eye,
  Layers,
  ListMusic,
  Plus,
  Settings,
  Trash2,
  User as UserIcon,
} from "lucide-react"

import { getApiErrorMessage } from "@/api/client"
import { useDeleteRoomMutation, useLatestRoomsQuery } from "@/api/rooms"
import type { User } from "@/api/types"
import { AnimatedThemeToggler } from "@/registry/magicui/animated-theme-toggler"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/stores/auth-store"
import { toast } from "sonner"
import { NavUser } from "./nav-user"
import { SwayLogo } from "@/components/sway-logo"
import { useDemoSession } from "@/components/demo/demo-context"
import { roomExperiencePath } from "@/lib/demo-session"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user?: User | null
  showNewRoomAction?: boolean
}

export function AppSidebar({
  user: suppliedUser,
  showNewRoomAction = true,
  ...props
}: AppSidebarProps) {
  const storedUser = useAuthStore((state) => state.user)
  const demo = useDemoSession()
  const user = suppliedUser ?? storedUser
  const location = useLocation()
  const hasActiveRoom = Boolean(user?.hasActiveRoom)
  const latestRoomsQuery = useLatestRoomsQuery({ enabled: Boolean(user?._id) })
  const latestRooms = latestRoomsQuery.data?.latestRooms ?? []
  const deleteRoomMutation = useDeleteRoomMutation()
  const [roomToDelete, setRoomToDelete] = React.useState<{
    _id: string
    roomName: string
    roomCode: string
  } | null>(null)
  const profilePath = user?.username ? `/${user.username}` : "/username"
  const navItems = demo ? [
    { label: "DJ room", icon: Folder, iconClassName: "text-violet-500 dark:text-icon-gold", to: `/demo/room/admin/${demo.room.roomCode}`, active: location.pathname.includes("/admin/") },
    { label: "Guest view", icon: Eye, iconClassName: "text-blue-500 dark:text-icon-gray", to: `/demo/room/${demo.room.roomCode}`, active: false },
    { label: "Tracklist", icon: ListMusic, iconClassName: "text-pink-500 dark:text-icon-indigo", to: `/demo/${demo.room.roomCode}/tracklist`, active: false },
  ] : [
    {
      label: "Dashboard",
      icon: ChartSpline,
      iconClassName: "text-violet-500 dark:text-icon-gold",
      to: "/dashboard",
      active: location.pathname === "/dashboard",
    },
    {
      label: "Past Rooms",
      icon: Layers,
      iconClassName: "text-[#4E58AB]",
      to: "/past-rooms",
      active: location.pathname === "/past-rooms",
    },
    {
      label: "Profile",
      icon: UserIcon,
      iconClassName: "text-[#C39D03]",
      to: profilePath,
      active: location.pathname === profilePath,
    },
    {
      label: "Insights & Exports",
      icon: FileDown,
      iconClassName: "text-pink-500 dark:text-icon-indigo",
      to: "/insights",
      active: location.pathname === "/insights",
    },
  ]

  async function handleDeleteRoom(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (!roomToDelete || !user?._id) return

    try {
      await deleteRoomMutation.mutateAsync({
        roomId: roomToDelete._id,
        userId: user._id,
      })
      toast.success("Room deleted", {
        description: `${roomToDelete.roomName} has been permanently deleted.`,
      })
      setRoomToDelete(null)
    } catch (error) {
      console.error("Error deleting room:", error)
      toast.error("Failed to delete room", {
        description: getApiErrorMessage(error, "Please try again."),
      })
    }
  }

  return (
    <Sidebar collapsible="offcanvas" className="!border-r-0" {...props}>
      <SidebarHeader className="flex flex-row items-center justify-between px-3 py-3">
        <Link to={demo ? "/demo" : "/dashboard"} className="flex h-8 items-center px-1">
          <SwayLogo className="h-6" />
        </Link>
        <AnimatedThemeToggler />
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild isActive={item.active} className="h-9">
                    <Link to={item.to}>
                      <item.icon className={`size-4 shrink-0 ${item.iconClassName}`} />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-2 p-0">
          <div className="flex items-center justify-between px-2 py-1">
            <SidebarGroupLabel className="h-auto px-0 text-[10px] font-medium uppercase tracking-[0.14em]">
              Rooms
            </SidebarGroupLabel>
            <div className="flex gap-1">
              {!demo && !hasActiveRoom ? (
                <Button variant="ghost" size="icon" className="size-5" asChild>
                  <Link to="/create-room" aria-label="Create room">
                    <Plus className="size-3 text-violet-500 dark:text-icon-gold" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {latestRoomsQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <SidebarMenuItem key={index}>
                    <div className="mx-2 my-1 h-6 animate-pulse rounded bg-sidebar-accent" />
                  </SidebarMenuItem>
                ))
              ) : latestRooms.length > 0 ? (
                latestRooms.map((room) => {
                  const roomPath = roomExperiencePath(room.active
                    ? `/room/admin/${room.roomCode}`
                    : `/${room.roomCode}/tracklist`)
                  const isInActiveRoom =
                    room.active &&
                    location.pathname.toLowerCase() === roomPath.toLowerCase()

                  return (
                    <React.Fragment key={room._id}>
                      {room.active && !isInActiveRoom ? (
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            className="h-8 bg-emerald-500/10 font-medium text-emerald-700 hover:bg-emerald-500/15 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                          >
                            <Link to={roomExperiencePath(`/room/admin/${room.roomCode}`)}>
                              <span>Join active room</span>
                              <ChevronRight className="ml-auto size-3.5" />
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ) : null}
                      <SidebarMenuItem>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                              isActive={location.pathname === roomPath}
                              className="h-8"
                            >
                              <Folder className={`size-3.5 text-muted-foreground ${room.active ? "dark:text-icon-gold" : "dark:text-icon-gray"}`} />
                              <span>{room.roomName}</span>
                              {room.active ? (
                              <span className="ml-auto flex shrink-0 items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                                  Live
                                </span>
                              ) : null}
                            </SidebarMenuButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start" className="w-44">
                            <DropdownMenuItem asChild>
                              <Link to={roomExperiencePath(`/room/admin/${room.roomCode}`)}>
                                <Eye className="size-4 dark:text-icon-gray" />
                                Room view
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={roomExperiencePath(`/${room.roomCode}/tracklist`)}>
                                <ListMusic className="size-4 dark:text-icon-indigo" />
                                Tracklist
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={Boolean(demo)}
                              onSelect={() => setRoomToDelete(room)}
                            >
                              <Trash2 className="size-4" />
                              Delete room
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    </React.Fragment>
                  )
                })
              ) : (
                <SidebarMenuItem>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    You have no rooms yet.
                  </div>
                </SidebarMenuItem>
              )}

              {!demo && showNewRoomAction && !hasActiveRoom ? (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="h-8 text-muted-foreground">
                    <Link to="/create-room">
                      <Plus className="size-3.5 text-violet-500 dark:text-icon-gold" />
                      <span>New room</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-9">
              <a href="mailto:hi@jsmalls.net?subject=Sway%20-%20I%27m%20having%20an%20issue">
                <CircleHelp className="size-4 text-sky-500 dark:text-icon-gray" />
                <span>Support</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {!demo && <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={location.pathname === "/settings"} className="h-9">
              <Link to="/settings">
                <Settings className="size-4 text-zinc-400 dark:text-icon-orange" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>}
        </SidebarMenu>
        {demo ? <div className="px-2 py-3 text-xs text-muted-foreground">Demo DJ · Temporary session<br />Account settings are unavailable.</div> : <NavUser
          user={user}
          showEmail={false}
          showInitials={false}
          circularAvatar
        />}
      </SidebarFooter>

      <AlertDialog
        open={roomToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteRoomMutation.isPending) setRoomToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {roomToDelete?.roomName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the room and all of its requests. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRoomMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRoom}
              disabled={deleteRoomMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRoomMutation.isPending ? "Deleting…" : "Delete room"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  )
}

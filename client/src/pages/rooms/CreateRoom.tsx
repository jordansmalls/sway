import { Plus } from "lucide-react"

import { CreateRoomForm } from '../../components/forms/rooms/create-room-form';
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function CreateRoom() {
  return (
    <>
      <header className="flex h-[61px] shrink-0 items-center gap-3 bg-card px-4 sm:px-6">
        <SidebarTrigger className="-ml-2" />
        <Plus className="size-4 text-violet-500 dark:text-icon-gold" />
        <span className="text-sm font-semibold">New room</span>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto bg-muted p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <CreateRoomForm />
        </div>
      </div>
    </>
  );
}

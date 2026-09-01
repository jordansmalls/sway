import { SidebarTrigger } from "../../components/ui/sidebar";
import InactiveRoomsTable from "../../components/rooms/inactive-rooms-table";
import { Layers } from "lucide-react";

const PastRooms = () => {
    return (
      <>
          <header className="sticky top-0 z-10 flex h-[60px] shrink-0 items-center gap-2 bg-card">
            <div className="flex items-center gap-3 px-4 sm:px-6">
              <SidebarTrigger className="-ml-2" />
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-[#4E58AB]" />
                <span className="text-sm font-semibold">Past Rooms</span>
              </div>
            </div>
          </header>

          <section className="flex-1 overflow-y-auto">
            <div className="px-6 pt-4">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Your room history
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Review completed rooms, export their tracklists and requests, or
                remove rooms you no longer need.
              </p>
            </div>
            <InactiveRoomsTable />
          </section>
      </>
    );
}

export default PastRooms;

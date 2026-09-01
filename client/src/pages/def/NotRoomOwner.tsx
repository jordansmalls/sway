import { CircleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "../../components/ui/button";
import { SidebarTrigger } from "../../components/ui/sidebar";

const NotRoomOwner = () => {
    const navigate = useNavigate();

    const handleNav = () => {
        navigate("/dashboard")
    };

    return (
        <>
          <header className="flex h-[61px] shrink-0 items-center gap-3 bg-card px-4 sm:px-6">
            <SidebarTrigger className="-ml-2" />
            <CircleAlert className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Room access</span>
          </header>
          <div className="flex flex-1 flex-col items-center justify-center gap-2 overflow-y-auto bg-muted p-6 md:p-8">
            <div className="flex w-full max-w-sm flex-col gap-6">
              <h1 className="text-center text-[7rem] font-bold tracking-tighter!">Oops!</h1>
              <p className="text-center">You are not the owner of that room, please either join the room normally or join a room you are the creator of.</p>
              <Button onClick={handleNav}>Dashboard</Button>
            </div>
          </div>
        </>
     );
}

export default NotRoomOwner;

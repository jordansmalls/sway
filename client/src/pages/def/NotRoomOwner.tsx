import { Button } from "../../components/ui/button";
import { useNavigate } from "react-router-dom";
import { GalleryVerticalEnd } from "lucide-react";

const NotRoomOwner = () => {
    const navigate = useNavigate();

    const handleNav = () => {
        navigate("/dashboard")
    };

    return (

        <>
             <div className="flex min-h-svh flex-col items-center justify-center gap-2 bg-muted p-6 md:p-8">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
          Sway
        </a>
        <h1 className="text-[7rem] text-center tracking-tighter! font-bold">Oops!</h1>
        <p className="text-center">You are not the owner of that room, please either join the room normally or join a room you are the creator of.</p>
        <Button onClick={handleNav}>Dashboard</Button>
      </div>
    </div>
        </>
     );
}

export default NotRoomOwner;
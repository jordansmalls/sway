import { Asterisk } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';

interface RoomEndedProps {
  roomCode?: string;
  roomName?: string;
}

const RoomEnded: React.FC<RoomEndedProps> = ({ roomCode, roomName }) => {
  const navigate = useNavigate();
  const { roomCode: routeRoomCode } = useParams<{ roomCode: string }>();
  const tracklistRoomCode = roomCode ?? routeRoomCode ?? '';

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a
          href="https://www.sway.onl"
          className="flex items-center gap-2 self-center font-medium"
          target="_blank"
        >
          <div className="flex size-6 items-center justify-center rounded-md bg-[dodgerblue] text-primary-foreground">
            <Asterisk className="size-4" />
          </div>
          Sway
        </a>

        <section className='text-center'>
          <h1 className='font-semibold text-4xl tracking-tight mb-4'>The Room is Over!</h1>
          <p className='mb-4 text-foreground/80'>We hope you enjoyed {roomName}, with Sway!</p>
          <Button
            onClick={() => navigate(`/${tracklistRoomCode}/tracklist`)}
            disabled={!tracklistRoomCode}
            className="hover:bg-[dodgerblue] transition duration-300 px-3 py-5 w-full text-lg tracking-tight font-normal"
          >
            View Tracklist
          </Button>
          <div className="mt-4 text-center">
             <button
               onClick={() => navigate('/join-room')}
               className="text-sm text-foreground/80 transition duration-300 hover:text-[dodgerblue] hover:cursor-pointer"
             >
               Join Another Room?
             </button>
           </div>

        </section>
      </div>
    </div>
  );
}
export default RoomEnded;

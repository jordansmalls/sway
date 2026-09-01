import { SwayLogo } from '@/components/sway-logo';
import { ArrowRight, Music2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { roomExperiencePath, isDemoExperience } from '@/lib/demo-session';

interface RoomEndedProps {
  roomCode?: string;
  roomName?: string;
}

const RoomEnded: React.FC<RoomEndedProps> = ({ roomCode, roomName }) => {
  const navigate = useNavigate();
  const { roomCode: routeRoomCode } = useParams<{ roomCode: string }>();
  const tracklistRoomCode = roomCode ?? routeRoomCode ?? '';

  return (
    <main className="min-h-svh bg-white text-zinc-950 dark:bg-background dark:text-foreground">
      <section className="flex min-h-svh flex-col px-6 py-7 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-md">
            <div className="mb-9 flex flex-col items-center text-center">
              <a href="https://www.sway.onl" className="mb-7 flex w-fit items-center gap-2.5 text-xl font-bold tracking-[-0.04em]">
                <SwayLogo className="h-8" />
              </a>
              <h1 className="max-w-sm text-3xl font-semibold leading-[1.1] tracking-[-0.04em] sm:text-4xl">The room is over.</h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-500 dark:text-muted-foreground">
                {roomName ? <><span className="font-medium text-zinc-950 dark:text-foreground">{roomName}</span> has ended. </> : 'This room has ended. '}
                You can still view the final tracklist or join another room.
              </p>
            </div>

            <div className="grid gap-3">
              <Button onClick={() => navigate(roomExperiencePath(`/${tracklistRoomCode}/tracklist`))} disabled={!tracklistRoomCode} className="h-12 w-full rounded-xl bg-black text-base font-semibold text-white shadow-none transition-colors duration-300 ease-out hover:bg-zinc-800 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
              <Music2 className="size-4" />
              View tracklist
            </Button>
              <Button variant="outline" onClick={() => navigate(isDemoExperience() ? '/demo' : '/join-room')} className="h-12 w-full rounded-xl border-zinc-200 bg-white text-base font-semibold shadow-none transition-colors duration-300 ease-out hover:bg-zinc-100 dark:border-input dark:bg-background dark:hover:bg-accent">
              Join another room
              <ArrowRight className="size-4" />
            </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default RoomEnded;

import { SwayLogo } from '@/components/sway-logo';
import { Link, useParams } from 'react-router-dom';

import { useRoomDetailsQuery } from '@/api/rooms';
import { AppLoading } from '@/components/app-loading';
import NotFound from '@/pages/def/NotFound';
import { useDemoSession } from '@/components/demo/demo-context';
import { cn } from '@/lib/utils';

export default function RoomDisplay() {
  const demo = useDemoSession();
  const { roomCode: rawRoomCode } = useParams<{ roomCode: string }>();
  const roomCode = rawRoomCode?.toUpperCase() ?? '';
  const { data, isLoading, isError } = useRoomDetailsQuery(roomCode);
  const room = data?.roomDetails;

  if (isLoading) {
    return <AppLoading label="Opening room display" className="min-h-svh" />;
  }

  if (isError || !room) {
    return <NotFound />;
  }

  return (
    <main className={cn('room-display bg-white text-zinc-950 dark:bg-background dark:text-foreground', demo ? 'min-h-full' : 'min-h-svh')}>
      <section className={cn('mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-6 text-center sm:px-10', demo ? 'min-h-full py-5' : 'min-h-svh py-10 sm:py-14')}>
        <div className="flex items-center gap-2.5 text-xl font-bold tracking-[-0.04em]">
          <SwayLogo className="h-8" />
        </div>

        <div className={cn('max-w-3xl', demo ? 'mt-4' : 'mt-8 sm:mt-10')}>
          <h1 className={cn('font-semibold leading-[1.05] tracking-[-0.05em]', demo ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl lg:text-6xl')}>
            {room.roomName}
          </h1>
          {room.roomDescription ? (
            <p className={cn('mx-auto max-w-2xl text-zinc-500 dark:text-muted-foreground', demo ? 'mt-2 text-sm leading-6 sm:text-base' : 'mt-4 text-base leading-7 sm:text-lg')}>
              {room.roomDescription}
            </p>
          ) : null}
        </div>

        {room.roomQr ? (
          <div className={cn('rounded-[2rem] bg-white ring-1 ring-zinc-200', demo ? 'mt-4 p-3' : 'mt-8 p-4 sm:mt-10 sm:p-5')}>
            <img
              src={room.roomQr}
              alt={demo ? 'QR code to start your own guest demo' : `QR code to join ${room.roomName}`}
              className={demo ? 'size-[min(40vw,32vh,18rem)] min-h-44 min-w-44' : 'size-[min(46vw,46vh,26rem)] min-h-56 min-w-56'}
            />
          </div>
        ) : null}

        <div className={demo ? 'mt-4' : 'mt-6 sm:mt-8'}>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-400 dark:text-muted-foreground">
            {demo ? 'Scan to try Sway as a guest' : 'Or enter room code'}
          </p>
          {demo ? (
            <>
              <Link to="/demo/guest" className="mt-2 inline-block text-2xl font-semibold tracking-tight underline decoration-blue-500 underline-offset-4">Try the guest demo</Link>
              <p className="mx-auto mt-3 max-w-sm text-sm text-zinc-500 dark:text-muted-foreground">This display previews your demo room. Scanning starts a separate private demo, not a shared room.</p>
            </>
          ) : <p className="mt-2 text-3xl font-semibold uppercase tracking-[0.12em] sm:text-4xl">{room.roomCode}</p>}
        </div>
      </section>
    </main>
  );
}

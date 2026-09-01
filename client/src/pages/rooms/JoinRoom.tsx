import { SwayLogo } from '@/components/sway-logo';
import { JoinRoomForm } from '../../components/forms/rooms/join-room-form';

export default function JoinRoom() {
  return (
    <div className="min-h-svh bg-white text-zinc-950 dark:bg-background dark:text-foreground">
      <section className="flex min-h-svh flex-col px-6 py-7 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-md">
            <div className="mb-9 flex flex-col items-center text-center">
              <a href="https://www.sway.onl" className="mb-7 flex w-fit items-center gap-2.5 text-xl font-bold tracking-[-0.04em]">
                <SwayLogo className="h-8" />
              </a>
              <h1 className="max-w-sm text-3xl font-semibold leading-[1.1] tracking-[-0.04em] sm:text-4xl">
                Join the room.
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-500 dark:text-muted-foreground">
                Enter the room code shared by your host to start requesting music.
              </p>
            </div>
            <JoinRoomForm />
          </div>
        </div>
      </section>
    </div>
  );
}

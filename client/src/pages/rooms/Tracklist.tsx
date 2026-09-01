import { SwayLogo } from '@/components/sway-logo';
import { ChevronLeft, ExternalLink, ListMusic, Music2, Vote } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { usePlayedSpotifyRequestsQuery, useRoomDetailsQuery } from '@/api/rooms';
import type { QueueRequest } from '@/api/types';
import { useCurrentUserQuery } from '@/api/users';
import { AppLoading } from '@/components/app-loading';
import { TracklistExportDropdown } from '@/components/dropdowns/tracklist-export-dropdown';
import Footer from '@/components/footer';
import { Button } from '@/components/ui/button';
import { useDemoSession } from '@/components/demo/demo-context';

function sortByTime(timeA: string, timeB: string) {
  const parseTime = (time: string) => {
    const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    if (period === 'AM') hours += 24;
    return hours * 60 + minutes;
  };

  return parseTime(timeA) - parseTime(timeB);
}

export default function Tracklist() {
  const demo = useDemoSession();
  const { roomCode: rawRoomCode } = useParams();
  const roomCode = rawRoomCode?.toUpperCase() ?? '';
  const tracklistQuery = usePlayedSpotifyRequestsQuery(roomCode);
  const roomDetailsQuery = useRoomDetailsQuery(roomCode);
  const currentUserQuery = useCurrentUserQuery();
  const room = roomDetailsQuery.data?.roomDetails;
  const currentUser = currentUserQuery.data?.user;
  const roomCreatorId = typeof room?.roomCreator === 'string'
    ? room.roomCreator
    : room?.roomCreator?._id;
  const isOwner = !demo && Boolean(currentUser && roomCreatorId === currentUser._id);
  const backHref = demo ? `/demo/room/admin/${roomCode}` : currentUser ? '/dashboard' : 'https://sway.onl';
  const tracks = [...(tracklistQuery.data?.data ?? [])].sort((a, b) =>
    sortByTime(a.playedAt ?? '', b.playedAt ?? ''),
  );

  if (tracklistQuery.isLoading || roomDetailsQuery.isLoading) {
    return <AppLoading label="Building the tracklist" />;
  }

  if (tracklistQuery.isError || roomDetailsQuery.isError || !roomCode || !room) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background px-6 text-center text-foreground">
        <div className="max-w-sm">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted">
            <Music2 className="size-5 text-muted-foreground" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Tracklist unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            We could not find the music from room {roomCode || '—'}.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <a href={backHref}>Go back</a>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-3 sm:px-6">
          <a
            href={backHref}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={demo ? 'Back to demo room' : currentUser ? 'Back to dashboard' : 'Back to Sway'}
          >
            <ChevronLeft className="size-5" />
          </a>
          <a href="https://sway.onl" className="absolute left-1/2 -translate-x-1/2 text-lg font-bold tracking-[-0.04em]">
            <SwayLogo className="h-6" />
          </a>
          <div className="flex min-w-9 justify-end">
            {isOwner ? (
              <div className="hidden sm:block">
                <TracklistExportDropdown roomId={room._id} roomName={room.roomName} variant="outline" />
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-12 pt-5 sm:px-6 sm:pt-10">
        <section className="grid items-center gap-7 sm:grid-cols-[minmax(0,1fr)_240px] sm:gap-12">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
              {room.roomName}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Every request that made it into the room, collected in the order it played.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
                {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
              </span>
              {tracks.reduce((sum, track) => sum + (track.votes ?? 0), 0) > 0 ? (
                <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {tracks.reduce((sum, track) => sum + (track.votes ?? 0), 0)} audience votes
                </span>
              ) : null}
            </div>
          </div>

          <SetStack tracks={tracks} />
        </section>

        <section className="mt-9 sm:mt-14">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ListMusic className="size-4 dark:text-icon-indigo" />
                Played in this room
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Tap a song to open it on Spotify.</p>
            </div>
          </div>

          {tracks.length === 0 ? (
            <div className="rounded-2xl border border-dashed px-6 py-16 text-center">
              <Music2 className="mx-auto size-8 text-muted-foreground/50" />
              <h2 className="mt-4 text-sm font-semibold">No played tracks yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">Tracks appear here after they are played in the room.</p>
            </div>
          ) : (
            <ol className="overflow-hidden rounded-2xl border bg-card">
              {tracks.map((track, index) => (
                <TrackRow key={track.id} track={track} index={index} />
              ))}
            </ol>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

function SetStack({ tracks }: { tracks: QueueRequest[] }) {
  const covers = tracks.filter((track) => track.albumArtUrl).slice(0, 3);

  return (
    <div className="relative mx-auto hidden h-48 w-56 sm:block" aria-hidden="true">
      <div className="absolute inset-7 animate-pulse rounded-full bg-gradient-to-br from-violet-500/30 via-fuchsia-500/25 to-orange-400/30 blur-3xl" />
      {[...Array(3)].map((_, index) => {
        const track = covers[index];
        return (
          <div
            key={track?.id ?? index}
            className="absolute size-32 overflow-hidden rounded-2xl border-4 border-background bg-muted shadow-xl"
            style={{ left: `${index * 34}px`, top: `${index * 18}px`, transform: `rotate(${(index - 1) * 7}deg)` }}
          >
            {track?.albumArtUrl ? (
              <img src={track.albumArtUrl} alt="" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center"><Music2 className="size-7 text-muted-foreground" /></div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TrackRow({ track, index }: { track: QueueRequest; index: number }) {
  const spotifyHref = track.spotifyLink || track.spotifyUri;

  return (
    <li className="group border-b last:border-b-0">
      <a
        href={spotifyHref || undefined}
        target={track.spotifyLink ? '_blank' : undefined}
        rel={track.spotifyLink ? 'noopener noreferrer' : undefined}
        className="grid min-h-20 grid-cols-[24px_52px_minmax(0,1fr)_32px] items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/50 sm:grid-cols-[32px_56px_minmax(0,1fr)_auto_36px] sm:px-5"
        aria-disabled={!spotifyHref}
      >
        <span className="text-right text-xs tabular-nums text-muted-foreground">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="size-[52px] overflow-hidden rounded-lg bg-muted sm:size-14">
          {track.albumArtUrl ? (
            <img src={track.albumArtUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center"><Music2 className="size-4 text-muted-foreground" /></div>
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{track.title}</div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{track.artist}</div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground sm:hidden">
            {track.playedAt ? <span>{track.playedAt}</span> : null}
            {track.votes ? <span className="flex items-center gap-1"><Vote className="size-3" />{track.votes}</span> : null}
          </div>
        </div>
        <div className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
          {track.requestedBy ? <span className="max-w-32 truncate">Requested by {track.requestedBy}</span> : null}
          {track.votes ? <span className="flex items-center gap-1"><Vote className="size-3.5" />{track.votes}</span> : null}
          {track.playedAt ? <span className="tabular-nums">{track.playedAt}</span> : null}
        </div>
        <ExternalLink className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
      </a>
    </li>
  );
}

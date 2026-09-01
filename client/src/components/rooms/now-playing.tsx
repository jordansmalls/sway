import React from 'react';
import { AudioLines } from 'lucide-react';
import { useRequestsByRoomQuery } from '@/api/requests';
import { GlareHover } from '@/registry/magicui/glare-hover';

interface NowPlayingProps { roomId: string; }

const NowPlaying: React.FC<NowPlayingProps> = ({ roomId }) => {
  const requestsQuery = useRequestsByRoomQuery(roomId);
  const nowPlayingRequest = requestsQuery.data?.requests?.find((request) => request.status === 'playing');

  if (requestsQuery.isLoading) {
    return <div className="h-24 animate-pulse rounded-2xl border bg-muted/50" aria-label="Loading now playing" />;
  }

  if (!nowPlayingRequest) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed bg-card/60 p-4 text-muted-foreground">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted"><AudioLines className="size-5" /></span>
        <div>
          <p className="text-sm font-medium text-foreground">Waiting for the music</p>
          <p className="text-xs">The current track will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <GlareHover className="w-full cursor-default rounded-2xl" background="transparent" duration={600}>
    <section className="relative w-full overflow-hidden rounded-2xl border bg-card p-3 shadow-sm sm:p-4" aria-label="Now playing">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent" />
      <div className="relative flex items-center gap-3 sm:gap-4">
        <img src={nowPlayingRequest.track.albumArtUrl} alt="" className="size-20 shrink-0 rounded-xl object-cover shadow-md ring-1 ring-white/10 sm:size-24" />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-normal text-primary">
            <AudioLines className="size-3.5" /> Now playing
          </div>
          <p className="truncate text-base font-semibold leading-tight tracking-tight sm:text-lg">{nowPlayingRequest.track.title}</p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{nowPlayingRequest.track.artist}</p>
          {nowPlayingRequest.requestedBy && <p className="mt-2 truncate text-xs text-muted-foreground">Requested by <span className="font-medium text-foreground">{nowPlayingRequest.requestedBy}</span></p>}
        </div>
      </div>
    </section>
    </GlareHover>
  );
};

export default NowPlaying;

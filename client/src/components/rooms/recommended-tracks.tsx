import { Music2, TrendingUp } from 'lucide-react';
import type { CSSProperties } from 'react';

import { useGlobalPlayedTracksQuery, useMostPlayedSongsQuery } from '@/api/analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Marquee } from '@/registry/magicui/marquee';
import { useDemoSession } from '@/components/demo/demo-context';

type RecommendedTrack = {
  id: string;
  title: string;
  artist: string;
  albumArtUrl?: string;
  spotifyLink?: string;
  playCount: number;
};

function TrackCard({ track }: { track: RecommendedTrack }) {
  const content = (
    <div className={cn('flex w-64 items-center gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3 transition-colors hover:bg-foreground/[0.06]', 'dark:border-border dark:bg-card dark:hover:bg-accent')}>
      {track.albumArtUrl ? (
        <img src={track.albumArtUrl} alt={`${track.title} album art`} decoding="async" draggable={false} className="size-12 shrink-0 rounded-lg bg-muted object-cover" />
      ) : (
        <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted"><Music2 className="size-5 text-muted-foreground" /></div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{track.title}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{track.artist}</div>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums text-pink-500" title={`${track.playCount} plays`}>
        <TrendingUp className="size-4" />{track.playCount.toLocaleString()}<span className="sr-only"> plays</span>
      </span>
    </div>
  );

  return track.spotifyLink ? <a href={track.spotifyLink} target="_blank" rel="noreferrer">{content}</a> : content;
}

function RecommendationRow({ tracks, reverse = false }: { tracks: RecommendedTrack[]; reverse?: boolean }) {
  return (
    <div className="min-w-0">
      {tracks.length > 0 ? (
        <div className="relative w-full min-w-0 overflow-hidden">
          <Marquee reverse={reverse} pauseOnHover className="w-full py-1" style={{ '--duration': `${Math.max(24, tracks.length * 4)}s` } as CSSProperties}>
            {tracks.map((track) => <TrackCard key={track.id} track={track} />)}
          </Marquee>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-card to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-card to-transparent" />
        </div>
      ) : <div className="px-4 py-5 text-xs text-muted-foreground">No played tracks yet.</div>}
    </div>
  );
}

export function RecommendedTracks({ userId }: { userId: string }) {
  const demo = useDemoSession();
  const trackLimit = demo ? undefined : 5;
  const personalQuery = useMostPlayedSongsQuery(userId);
  const globalQuery = useGlobalPlayedTracksQuery();
  const personalTracks: RecommendedTrack[] = (personalQuery.data?.songs ?? []).slice(0, trackLimit).map((song) => ({
    id: song.spotifyTrackId, title: song.title, artist: song.artist, albumArtUrl: song.albumArtUrl, spotifyLink: song.spotifyLink, playCount: song.playCount,
  }));
  const globalTracks: RecommendedTrack[] = (globalQuery.data?.data ?? []).slice(0, trackLimit).map((track, index) => ({
    id: track.spotifyTrackId ?? String(track._id ?? index), title: track.title ?? 'Unknown track', artist: track.artist ?? 'Unknown artist', albumArtUrl: track.albumArtUrl, spotifyLink: track.spotifyLink, playCount: track.playCount ?? 0,
  }));

  return (
    <section className="w-full min-w-0 shrink-0 overflow-hidden rounded-xl border bg-card py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 pb-2">
        <h2 className="text-sm font-medium">Recommended Tracks</h2>
        <p className="text-xs text-muted-foreground">This is what we think you should play next, based on your insights.</p>
      </div>
      {personalQuery.isLoading || globalQuery.isLoading ? (
        <div className="grid gap-3 px-4 sm:grid-cols-3"><Skeleton className="h-[74px] rounded-xl" /><Skeleton className="h-[74px] rounded-xl" /><Skeleton className="h-[74px] rounded-xl" /></div>
      ) : (
        <div className="relative flex w-full min-w-0 flex-col overflow-hidden">
          <RecommendationRow tracks={personalTracks} />
          <RecommendationRow tracks={globalTracks} reverse />
        </div>
      )}
    </section>
  );
}

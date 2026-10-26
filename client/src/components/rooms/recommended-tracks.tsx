import { Check, Loader2, Music2, Plus, TrendingUp } from 'lucide-react';
import type { CSSProperties } from 'react';

import { useRecommendedTracksQuery, type RecommendationSource, type RecommendedTrack } from '@/api/analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useRecommendedTrackQueue, type RecommendedTrackQueueState } from '@/hooks/use-recommended-track-queue';
import { cn } from '@/lib/utils';
import { Marquee } from '@/registry/magicui/marquee';
import { useMarqueeCopy } from '@/registry/magicui/marquee-copy';

const sourceDescriptions: Record<RecommendationSource, string> = {
  personal: 'This is what we think you should play next, based on your insights.',
  global: 'Play 20 different songs to unlock picks based on your insights. Until then, here are the most played songs on Sway.',
  popular: 'Play 20 different songs to unlock picks based on your insights. Until then, here are some popular songs.',
};

type TrackCardProps = {
  track: RecommendedTrack;
  queueState: RecommendedTrackQueueState;
  onAddToQueue: (track: RecommendedTrack) => void;
};

const queueButtonLabels: Record<RecommendedTrackQueueState, (track: RecommendedTrack) => string> = {
  idle: (track) => `Add ${track.title} by ${track.artist} to the queue`,
  adding: (track) => `Adding ${track.title} to the queue`,
  queued: (track) => `${track.title} is in the queue`,
  disabled: (track) => `Can't add ${track.title} right now`,
};

const queueIcons = [
  { state: 'idle', Icon: Plus },
  { state: 'adding', Icon: Loader2 },
  { state: 'queued', Icon: Check },
  { state: 'disabled', Icon: Plus },
] as const;

function QueueButton({ track, queueState, onAddToQueue, isCopy }: TrackCardProps & { isCopy: boolean }) {
  const unavailable = queueState !== 'idle';

  return (
    <Tooltip disableHoverableContent>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-state={queueState}
          aria-label={queueButtonLabels[queueState](track)}
          aria-disabled={unavailable || undefined}
          aria-busy={queueState === 'adding' || undefined}
          tabIndex={isCopy ? -1 : undefined}
          // Copies are hidden from assistive tech, so a pointer tap must not leave focus inside one.
          onMouseDown={isCopy ? (event) => event.preventDefault() : undefined}
          onClick={() => {
            if (!unavailable) onAddToQueue(track);
          }}
          className={cn(
            'relative grid size-6 shrink-0 cursor-pointer place-items-center rounded-md border outline-none select-none',
            'transition-[background-color,border-color,color,scale] duration-150 ease-out motion-reduce:transition-none',
            // Keep a 44px tap target around the smaller visible button.
            'after:absolute after:-inset-2.5 after:content-[""]',
            'focus-visible:ring-3 focus-visible:ring-ring/50',
            'data-[state=idle]:border-foreground/15 data-[state=idle]:bg-background data-[state=idle]:text-foreground',
            'data-[state=idle]:hover:border-pink-500/40 data-[state=idle]:hover:bg-pink-500/10 data-[state=idle]:hover:text-pink-600',
            'data-[state=idle]:active:scale-[0.94] motion-reduce:active:scale-100',
            'dark:data-[state=idle]:border-input dark:data-[state=idle]:bg-input/30 dark:data-[state=idle]:hover:border-pink-400/40 dark:data-[state=idle]:hover:bg-pink-400/10 dark:data-[state=idle]:hover:text-pink-400',
            'data-[state=adding]:cursor-progress data-[state=adding]:border-foreground/10 data-[state=adding]:bg-muted data-[state=adding]:text-muted-foreground',
            'data-[state=queued]:cursor-default data-[state=queued]:border-pink-500/30 data-[state=queued]:bg-pink-500/10 data-[state=queued]:text-pink-600',
            'dark:data-[state=queued]:border-pink-400/30 dark:data-[state=queued]:bg-pink-400/10 dark:data-[state=queued]:text-pink-400',
            'data-[state=disabled]:cursor-not-allowed data-[state=disabled]:border-foreground/10 data-[state=disabled]:bg-transparent data-[state=disabled]:text-muted-foreground/50',
          )}
        >
          {queueIcons.map(({ state, Icon }) => (
            <Icon
              key={state}
              aria-hidden
              className={cn(
                'col-start-1 row-start-1 size-3.5 transition-[opacity,scale,filter] duration-200 ease-out motion-reduce:transition-none',
                state === queueState ? 'scale-100 opacity-100 blur-none' : 'scale-50 opacity-0 blur-[2px]',
                state === 'adding' && queueState === 'adding' && 'animate-spin motion-reduce:animate-none',
              )}
            />
          ))}
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6} className="pointer-events-none motion-reduce:animate-none">
        Add to queue
      </TooltipContent>
    </Tooltip>
  );
}

function TrackCard({ track, queueState, onAddToQueue }: TrackCardProps) {
  const isCopy = useMarqueeCopy();

  const details = (
    <>
      {track.albumArtUrl ? (
        <img src={track.albumArtUrl} alt="" decoding="async" draggable={false} className="size-12 shrink-0 rounded-lg bg-muted object-cover" />
      ) : (
        <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted"><Music2 className="size-5 text-muted-foreground" /></div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{track.title}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{track.artist}</div>
      </div>
      {track.playCount > 0 && (
        <span className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums text-pink-500" title={`${track.playCount} plays`}>
          <TrendingUp className="size-4" />{track.playCount.toLocaleString()}<span className="sr-only"> plays</span>
        </span>
      )}
    </>
  );
  const detailsClassName = 'flex min-w-0 flex-1 items-center gap-3 rounded-lg';

  return (
    <div className={cn('flex w-72 items-center gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3 transition-colors hover:bg-foreground/[0.06]', 'dark:border-border dark:bg-card dark:hover:bg-accent')}>
      {track.spotifyLink ? (
        <a
          href={track.spotifyLink}
          target="_blank"
          rel="noreferrer"
          aria-label={`${track.title} by ${track.artist}, open in Spotify`}
          tabIndex={isCopy ? -1 : undefined}
          onMouseDown={isCopy ? (event) => event.preventDefault() : undefined}
          className={cn(detailsClassName, 'outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-4 focus-visible:ring-offset-card')}
        >
          {details}
        </a>
      ) : (
        <div className={detailsClassName}>{details}</div>
      )}
      <QueueButton track={track} queueState={queueState} onAddToQueue={onAddToQueue} isCopy={isCopy} />
    </div>
  );
}

type RecommendationRowProps = {
  tracks: RecommendedTrack[];
  reverse?: boolean;
  getTrackState: (trackId: string) => RecommendedTrackQueueState;
  onAddToQueue: (track: RecommendedTrack) => void;
};

function RecommendationRow({ tracks, reverse = false, getTrackState, onAddToQueue }: RecommendationRowProps) {
  if (tracks.length === 0) return null;

  return (
    <div className="min-w-0">
      <div className="relative w-full min-w-0 overflow-hidden">
        <Marquee reverse={reverse} pauseOnHover pauseOnInteraction interactiveCopies className="w-full py-1" style={{ '--duration': `${Math.max(24, tracks.length * 4)}s` } as CSSProperties}>
          {tracks.map((track) => <TrackCard key={track.spotifyTrackId} track={track} queueState={getTrackState(track.spotifyTrackId)} onAddToQueue={onAddToQueue} />)}
        </Marquee>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-card to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-card to-transparent" />
      </div>
    </div>
  );
}

type RecommendedTracksProps = {
  userId: string;
  roomId: string;
  requestedBy: string;
  active: boolean;
};

export function RecommendedTracks({ userId, roomId, requestedBy, active }: RecommendedTracksProps) {
  const { data, isLoading } = useRecommendedTracksQuery(userId);
  const { addToQueue, getTrackState } = useRecommendedTrackQueue({ roomId, requestedBy, active });
  const tracks = data?.tracks ?? [];
  const half = Math.ceil(tracks.length / 2);

  return (
    <section className="w-full min-w-0 shrink-0 overflow-hidden rounded-xl border bg-card py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 pb-2">
        <h2 className="text-sm font-medium">Recommended Tracks</h2>
        <p className="text-xs text-muted-foreground">{sourceDescriptions[data?.source ?? 'personal']}</p>
      </div>
      {isLoading ? (
        <div className="grid gap-3 px-4 sm:grid-cols-3"><Skeleton className="h-[74px] rounded-xl" /><Skeleton className="h-[74px] rounded-xl" /><Skeleton className="h-[74px] rounded-xl" /></div>
      ) : (
        <div className="relative flex w-full min-w-0 flex-col overflow-hidden">
          <RecommendationRow tracks={tracks.slice(0, half)} getTrackState={getTrackState} onAddToQueue={addToQueue} />
          <RecommendationRow tracks={tracks.slice(half)} reverse getTrackState={getTrackState} onAddToQueue={addToQueue} />
        </div>
      )}
    </section>
  );
}

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, ChevronLeft, Grid3X3, Headphones, Music2, Radio } from 'lucide-react';

import {
  useAnalyticsTotalsQuery,
  useMostPlayedSongsQuery,
  useMostRequestedSongsQuery,
  useMostUpvotedSongsQuery,
  type AnalyticsSong,
} from '@/api/analytics';
import { useCurrentUserQuery, useFetchUserIdQuery } from '@/api/users';
import { cn } from '@/lib/utils';
import { SwayLogo } from '@/components/sway-logo';
import { useAuthStore } from '@/stores/auth-store';
import NotFound from './def/NotFound';

type ProfileTab = 'requested' | 'played' | 'upvoted';

const tabs: { id: ProfileTab; label: string; icon: React.ElementType }[] = [
  { id: 'requested', label: 'Requested', icon: Grid3X3 },
  { id: 'played', label: 'Played', icon: Headphones },
  { id: 'upvoted', label: 'Upvoted', icon: Radio },
];

export default function Profile() {
  const { username = '' } = useParams();
  const [activeTab, setActiveTab] = useState<ProfileTab>('requested');
  const storedUser = useAuthStore((state) => state.user);
  const currentUserQuery = useCurrentUserQuery();
  const userIdQuery = useFetchUserIdQuery(username);
  const userId = userIdQuery.data?.userId ?? '';
  const totalsQuery = useAnalyticsTotalsQuery(userId);
  const requestedQuery = useMostRequestedSongsQuery(userId);
  const playedQuery = useMostPlayedSongsQuery(userId);
  const upvotedQuery = useMostUpvotedSongsQuery(userId);

  if (userIdQuery.isError) return <NotFound />;

  const content = {
    requested: {
      songs: requestedQuery.data?.songs,
      loading: requestedQuery.isLoading,
      metric: (song: AnalyticsSong) => `${song.requestCount} requests`,
    },
    played: {
      songs: playedQuery.data?.songs,
      loading: playedQuery.isLoading,
      metric: (song: AnalyticsSong) => `${song.playCount} plays`,
    },
    upvoted: {
      songs: upvotedQuery.data?.songs,
      loading: upvotedQuery.isLoading,
      metric: (song: AnalyticsSong) => `${song.totalVotes} votes`,
    },
  }[activeTab];

  const totals = totalsQuery.data;
  const isAuthenticated = Boolean(storedUser || currentUserQuery.data?.user);
  const isResolvingSession = currentUserQuery.isLoading && !storedUser;
  const backHref = isAuthenticated
    ? '/dashboard'
    : 'https://sway.onl';

  return (
    <main className="min-h-screen w-full bg-background text-foreground">
      <div className="mx-auto min-h-screen w-full max-w-5xl bg-background sm:w-[calc(100%-3rem)] lg:w-[calc(100%-6rem)]">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-center bg-background/95 px-4 backdrop-blur">
          <a
            href={backHref}
            aria-label={isAuthenticated ? 'Back to dashboard' : 'Back to Sway'}
            aria-disabled={isResolvingSession}
            onClick={(event) => {
              if (isResolvingSession) event.preventDefault();
            }}
            className={cn(
              'absolute left-3 flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:left-4',
              isResolvingSession && 'pointer-events-none opacity-50',
            )}
          >
            <ChevronLeft className="size-5" />
          </a>
          <Link to="/"><SwayLogo className="h-6" /></Link>
        </header>

        <section className="px-4 pb-5 pt-6 sm:px-8 sm:pt-8">
          <div className="grid grid-cols-[88px_1fr] items-center gap-5 sm:grid-cols-[112px_1fr] sm:gap-10">
            <div
              className="size-[88px] rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 shadow-sm sm:size-28"
              role="img"
              aria-label={`${username}'s profile picture`}
            />
            <div className="min-w-0">
              <div className="mb-3 flex min-w-0 items-center gap-1.5">
                <h1 className="truncate text-base font-semibold sm:text-lg">{username}</h1>
                <BadgeCheck
                  className="size-4 shrink-0 fill-blue-500 text-white sm:size-[18px]"
                  aria-label="Verified profile"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-left">
                <ProfileStat label="Rooms" value={totals?.roomsHosted} loading={totalsQuery.isLoading} />
                <ProfileStat label="Requests" value={totals?.requestsReceived} loading={totalsQuery.isLoading} />
                <ProfileStat label="Played" value={totals?.requestsPlayed} loading={totalsQuery.isLoading} />
              </div>
            </div>
          </div>

          <div className="mt-5 max-w-lg sm:ml-[152px]">
            <p className="text-sm leading-5 text-muted-foreground">
              Hosting rooms, reading the crowd, and turning requests into the next track.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="rounded-full bg-muted px-2.5 py-1">Sway host</span>
              {totals?.requestsPlayed ? <span>{Math.round((totals.requestsPlayed / Math.max(totals.requestsReceived, 1)) * 100)}% request conversion</span> : null}
            </div>
          </div>
        </section>

        <nav className="grid grid-cols-3 border-y" aria-label="Profile content">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={selected}
                className={cn('relative flex h-12 items-center justify-center gap-2 text-muted-foreground transition-colors hover:text-foreground', selected && 'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground')}
              >
                <Icon className={cn("size-[18px]", selected ? "dark:text-icon-orange" : "dark:text-icon-gray")} />
                <span className="hidden text-xs font-semibold uppercase tracking-wider sm:inline">{tab.label}</span>
                <span className="sr-only sm:hidden">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <SongGrid songs={content.songs} loading={content.loading} metric={content.metric} />
      </div>
    </main>
  );
}

function ProfileStat({ label, value, loading }: { label: string; value?: number; loading: boolean }) {
  return (
    <div className="min-w-0">
      {loading ? <div className="mb-1 h-5 w-9 animate-pulse rounded bg-muted" /> : <div className="truncate text-base font-semibold tabular-nums sm:text-xl">{value?.toLocaleString() ?? '—'}</div>}
      <div className="truncate text-[11px] text-muted-foreground sm:text-xs">{label}</div>
    </div>
  );
}

function SongGrid({ songs, loading, metric }: { songs?: AnalyticsSong[]; loading: boolean; metric: (song: AnalyticsSong) => string }) {
  if (loading) {
    return <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-4">{Array.from({ length: 12 }).map((_, index) => <div key={index} className="aspect-square animate-pulse bg-muted" />)}</div>;
  }

  if (!songs?.length) {
    return <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center"><div className="flex size-12 items-center justify-center rounded-full bg-muted"><Music2 className="size-5 text-muted-foreground" /></div><h2 className="mt-4 text-sm font-semibold">Nothing here yet</h2><p className="mt-1 max-w-xs text-sm text-muted-foreground">Songs will appear here as this host receives and plays requests.</p></div>;
  }

  return (
    <div className="grid grid-cols-3 gap-0.5 bg-border sm:grid-cols-4">
      {songs.map((song) => (
        <a key={`${song.spotifyTrackId}-${song.title}`} href={song.spotifyLink} target="_blank" rel="noreferrer" className="group relative aspect-square overflow-hidden bg-muted">
          {song.albumArtUrl ? <img src={song.albumArtUrl} alt={`${song.title} by ${song.artist}`} className="size-full object-cover transition duration-300 group-hover:scale-105" /> : <div className="flex size-full items-center justify-center"><Music2 className="size-6 text-muted-foreground" /></div>}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pb-2 pt-8 text-white sm:px-3 sm:pb-3">
            <div className="truncate text-[11px] font-semibold sm:text-sm">{song.title}</div>
            <div className="truncate text-[9px] text-white/70 sm:text-xs">{song.artist} · {metric(song)}</div>
          </div>
        </a>
      ))}
    </div>
  );
}

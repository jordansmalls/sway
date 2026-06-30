import { useParams } from 'react-router-dom';
import { Mic2, Music2, ListMusic, Radio } from 'lucide-react';
import {
  useAnalyticsTotalsQuery,
  useMostPlayedArtistsQuery,
  useMostRequestedSongsQuery,
  useMostPlayedSongsQuery,
  useMostUpvotedSongsQuery,
  type AnalyticsArtist,
  type AnalyticsSong,
} from '@/api/analytics';
import { useFetchUserIdQuery } from '@/api/users';
import NotFound from './def/NotFound';


// ─── Skeleton ────────────────────────────────────────────────────────────────
const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-muted ${className}`} />
);

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({
  label,
  value,
  loading,
}: {
  label: string;
  value?: number;
  loading: boolean;
}) => (
  <div className="flex flex-col bg-card border border-border rounded-xl p-4 gap-2">
    <span className="text-xs text-muted-foreground uppercase tracking-tight leading-tight">
      {label}
    </span>
    {loading ? (
      <Skeleton className="h-8 w-12" />
    ) : (
      <span className="text-3xl font-bold text-foreground tabular-nums leading-none">
        {value?.toLocaleString() ?? '—'}
      </span>
    )}
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) => (
  <div className="flex items-center gap-2 mb-3">
    <Icon className="w-4 h-4 shrink-0" style={{ color: 'dodgerblue' }} />
    <h2 className="text-sm tracking-tight text-muted-foreground">{title}</h2>
  </div>
);

// ─── Song Row ─────────────────────────────────────────────────────────────────
const SongRow = ({
  song,
  index,
  statLabel,
  statValue,
}: {
  song: AnalyticsSong;
  index: number;
  statLabel: string;
  statValue: number;
}) => (
  <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
    <span className="text-xs text-muted-foreground w-5 shrink-0 text-right tracking-tight">
      {String(index + 1).padStart(2, '0')}
    </span>
    <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0">
      {song.albumArtUrl ? (
        <img
          src={song.albumArtUrl}
          alt={`${song.title} album art`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Music2 className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-foreground truncate">
        {song.title}
      </p>
      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
    </div>
    <div className="shrink-0 text-right">
      <p
        className="text-sm font-bold tabular-nums"
        style={{ color: 'dodgerblue' }}
      >
        {statValue}
      </p>
      <p className="text-xs text-muted-foreground tracking-tight">
        {statLabel}
      </p>
    </div>
  </div>
);

// ─── Song Section ─────────────────────────────────────────────────────────────
const SongSection = ({
  icon,
  title,
  songs,
  loading,
  statLabel,
  getStat,
}: {
  icon: React.ElementType;
  title: string;
  songs?: AnalyticsSong[];
  loading: boolean;
  statLabel: string;
  getStat: (s: AnalyticsSong) => number;
}) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <SectionHeader icon={icon} title={title} />
    {loading ? (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-md shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    ) : !songs?.length ? (
      <p className="text-xs text-muted-foreground tracking-tight py-4 text-center">
        No data yet.
      </p>
    ) : (
      <div>
        {songs.map((song, i) => (
          <SongRow
            key={song.spotifyTrackId}
            song={song}
            index={i}
            statLabel={statLabel}
            statValue={getStat(song)}
          />
        ))}
      </div>
    )}
  </div>
);

// ─── Profile ──────────────────────────────────────────────────────────────────
const Profile = () => {
  const { username } = useParams();
  const userIdQuery = useFetchUserIdQuery(username ?? '');
  const userId = userIdQuery.data?.userId ?? '';


  const totalsQuery = useAnalyticsTotalsQuery(userId);
  const artistsQuery = useMostPlayedArtistsQuery(userId);
  const requestedQuery = useMostRequestedSongsQuery(userId);
  const playedQuery = useMostPlayedSongsQuery(userId);
  const upvotedQuery = useMostUpvotedSongsQuery(userId);

  const totals = totalsQuery.data;
  const artists = artistsQuery.data?.artists ?? [];



  if (userIdQuery.isError) {
    return (
      <div>
        <NotFound />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-muted">
      <div className="w-full max-w-sm mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Logo */}
        <a
          href="/dashboard"
          className="flex items-center gap-2 self-center font-medium"
        >
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <svg
              width="12"
              height="12"
              viewBox="0 0 42 42"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clip-path="url(#clip0_47_23)">
                <path
                  d="M20.7724 21.7681V21.2276H20.2319H6.17781V20.2095C13.0744 18.5019 18.5019 13.0744 20.2095 6.17781H21.2276V20.2319V20.7724H21.7681H35.8222V21.7905C28.9256 23.4981 23.4981 28.9256 21.7905 35.8222H20.7724V21.7681ZM1.54054 15.5946H1V16.1351V25.8649V26.4054H1.54054H15.5946V40.4595V41H16.1351H25.8649H26.4054V40.4595C26.4054 32.6977 32.6977 26.4054 40.4595 26.4054H41V25.8649V16.1351V15.5946H40.4595H26.4054V1.54054V1H25.8649H16.1351H15.5946V1.54054C15.5946 9.30232 9.30232 15.5946 1.54054 15.5946Z"
                  fill="white"
                  stroke="white"
                />
              </g>
              <defs>
                <clipPath id="clip0_47_23">
                  <rect width="42" height="42" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </div>
          <span className="font-bold tracking-tighter">Sway</span>
        </a>

        {/* Profile header */}
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {username}
          </h1>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="dodgerblue"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Rooms Hosted"
            value={totals?.roomsHosted}
            loading={totalsQuery.isLoading}
          />
          <StatCard
            label="Requests In"
            value={totals?.requestsReceived}
            loading={totalsQuery.isLoading}
          />
          <StatCard
            label="Tracks Played"
            value={totals?.requestsPlayed}
            loading={totalsQuery.isLoading}
          />
        </div>

        {/* Most played artists */}
        <div className="bg-card border border-border rounded-xl p-4">
          <SectionHeader icon={Mic2} title="Most Played Artists" />
          {artistsQuery.isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-5 h-3 shrink-0" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-3 w-8" />
                </div>
              ))}
            </div>
          ) : !artists.length ? (
            <p className="text-xs text-muted-foreground tracking-tight py-4 text-center">
              No data yet.
            </p>
          ) : (
            <div>
              {artists.map((artist: AnalyticsArtist, i) => (
                <div
                  key={artist.artist}
                  className="flex items-center gap-3 py-2.5 border-b border-border last:border-0"
                >
                  <span className="text-xs tracking-tight text-muted-foreground w-5 shrink-0 text-right">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 text-sm text-foreground truncate">
                    {artist.artist}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden hidden sm:block">
                      <div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: 'dodgerblue',
                          width: `${Math.round(
                            (artist.playCount / (artists[0]?.playCount || 1)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                    <span
                      className="text-xs tracking-tight tabular-nums"
                      style={{ color: 'dodgerblue' }}
                    >
                      {artist.playCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Song sections */}
        <SongSection
          icon={ListMusic}
          title="Most Requested Songs"
          songs={requestedQuery.data?.songs}
          loading={requestedQuery.isLoading}
          statLabel="requests"
          getStat={(s) => s.requestCount}
        />
        <SongSection
          icon={Music2}
          title="Most Played Songs"
          songs={playedQuery.data?.songs}
          loading={playedQuery.isLoading}
          statLabel="plays"
          getStat={(s) => s.requestCount}
        />
        <SongSection
          icon={Radio}
          title="Most Upvoted Songs"
          songs={upvotedQuery.data?.songs}
          loading={upvotedQuery.isLoading}
          statLabel="votes"
          getStat={(s) => s.totalVotes}
        />
      </div>
    </div>
  );
};

export default Profile;

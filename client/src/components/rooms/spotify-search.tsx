import { useState } from 'react';
import { Search } from 'lucide-react';
import { useDebouncedValue } from '../../hooks/use-debounced-value';
import { Input } from '../ui/input';
import { Spinner } from '../ui/spinner';
import { useSearchTracksQuery } from '@/api/spotify';
import { useDemoSession } from '@/components/demo/demo-context';
import { getApiErrorMessage } from '@/api/client';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ExplicitBadge } from './explicit-badge';

export interface SpotifySearchTrack {
  id: string;
  name: string;
  artist: string;
  albumImage?: string;
  duration_ms: number;
  uri?: string;
  explicit?: boolean;
}

interface SpotifySearchTestProps {
  onTrackSelect: (track: SpotifySearchTrack) => void;
  allowExplicit?: boolean;
}

const SpotifySearch = ({ onTrackSelect, allowExplicit = true }: SpotifySearchTestProps) => {
  const demo = useDemoSession();
  const [search, setSearch] = useState('');

  const debouncedSearchValue = useDebouncedValue(search, demo ? 500 : 300);
  const canSearch = debouncedSearchValue.trim().length >= 2;
  const searchQuery = useSearchTracksQuery(canSearch ? debouncedSearchValue : '');
  const results = searchQuery.data?.tracks ?? [];

  // Unknown (undefined) stays selectable; the server makes the final call.
  const isBlocked = (track: SpotifySearchTrack) => !allowExplicit && track.explicit === true;

  const handleSelect = (track: SpotifySearchTrack) => {
    if (isBlocked(track)) return;
    onTrackSelect(track);
    setSearch('');
  };

  return (
    <div className="w-full tracking-tight">
      <div className="relative">
        <div className="relative">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or artist"
            aria-label="Search by title or artist"
            maxLength={demo ? 100 : undefined}
            className="h-10 w-full rounded-lg bg-background pl-9 shadow-none"
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        {searchQuery.isFetching && (
          <div className="absolute z-50 mt-1 w-full rounded-lg bg-popover p-3 text-popover-foreground shadow-md ring-1 ring-foreground/10">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              <span>Searching Spotify...</span>
            </div>
          </div>
        )}

        {searchQuery.isError && (
          <div className="absolute z-50 mt-1 w-full rounded-lg bg-popover p-3 text-sm text-destructive shadow-md ring-1 ring-foreground/10">
            {getApiErrorMessage(searchQuery.error, 'Failed to fetch tracks. Please try again.')}
          </div>
        )}
        {demo && canSearch && searchQuery.isSuccess && !searchQuery.isFetching && results.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">No tracks found. Try another title or artist.</p>
        )}

        {!searchQuery.isFetching && results.length > 0 && (
          <div className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
            {results.map((track) => {
              const blocked = isBlocked(track);
              return (
                <button
                  type="button"
                  key={track.id}
                  onClick={() => handleSelect(track)}
                  aria-disabled={blocked || undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors focus-visible:bg-muted focus-visible:outline-none',
                    blocked ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted'
                  )}
                >
                  <img
                    src={track.albumImage}
                    alt={`Album art for ${track.name}`}
                    className="size-11 shrink-0 rounded-md bg-muted object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <div className="truncate text-sm font-medium">{track.name}</div>
                      <ExplicitBadge explicit={track.explicit} />
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{track.artist}</div>
                    {blocked && (
                      <div className="truncate text-xs text-muted-foreground">Not allowed in this room</div>
                    )}
                  </div>
                  <div className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatDuration(track.duration_ms)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotifySearch;

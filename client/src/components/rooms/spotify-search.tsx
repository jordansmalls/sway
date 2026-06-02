import { useState } from 'react';
import { Search } from 'lucide-react';
import { useDebouncedValue } from '../../hooks/use-debounced-value';
import { Input } from '../ui/input';
import { Spinner } from '../ui/spinner';
import { useSearchTracksQuery } from '@/api/spotify';

export interface SpotifySearchTrack {
  id: string;
  name: string;
  artist: string;
  albumImage?: string;
  duration_ms: number;
  uri?: string;
}

interface SpotifySearchTestProps {
  onTrackSelect: (track: SpotifySearchTrack) => void;
}

const SpotifySearch = ({ onTrackSelect }: SpotifySearchTestProps) => {
  const [search, setSearch] = useState('');

  const debouncedSearchValue = useDebouncedValue(search, 300);
  const canSearch = debouncedSearchValue.trim().length >= 2;
  const searchQuery = useSearchTracksQuery(canSearch ? debouncedSearchValue : '');
  const results = searchQuery.data?.tracks ?? [];

  const handleSelect = (track: SpotifySearchTrack) => {
    onTrackSelect(track);
    setSearch('');
  };

  return (
    <div className="w-full">
      <div className="relative">
        <div className="relative">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or artist"
            className="block w-full px-4 py-3 pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>

        {searchQuery.isFetching && (
          <div className="absolute w-full bg-white mt-1 rounded-lg shadow-lg border p-4 text-center z-50">
            <div className="flex flex-row items-center gap-4">
              <Spinner className="w-5 h-5" />
              <span>Loading</span>
            </div>
          </div>
        )}

        {searchQuery.isError && (
          <div className="absolute w-full bg-white mt-1 rounded-lg shadow-lg border p-4 text-center text-red-500 z-50">
            Failed to fetch tracks. Please try again.
          </div>
        )}

        {!searchQuery.isFetching && results.length > 0 && (
          <div className="absolute w-full bg-white mt-1 rounded-lg shadow-lg border max-h-96 overflow-y-auto z-50">
            {results.map((track) => (
              <button
                type="button"
                key={track.id}
                onClick={() => handleSelect(track)}
                className="w-full p-2 text-left hover:bg-gray-100 flex items-center"
              >
                {/* Album Art */}
                <img
                  src={track.albumImage}
                  alt={`Album art for ${track.name}`}
                  className="w-12 h-12 rounded-lg object-cover mr-3"
                />
                {/* Track Details */}
                <div className="flex-1">
                  <div className="font-medium">{track.name}</div>
                  <div className="text-sm text-gray-600">{track.artist}</div>
                </div>
                {/* Track Duration */}
                <div className="text-sm text-gray-500">
                  {Math.floor(track.duration_ms / 60000)}:
                  {((track.duration_ms % 60000) / 1000)
                    .toFixed(0)
                    .padStart(2, '0')}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotifySearch;

import React from 'react';
import { Heart } from 'lucide-react';
import { useRequestsByRoomQuery } from '@/api/requests';
import type { SongRequest } from '@/api/types';

interface NowPlayingProps {
  roomId: string;
}

const NowPlaying: React.FC<NowPlayingProps> = ({ roomId }) => {
  const requestsQuery = useRequestsByRoomQuery(roomId);

  // Find the currently playing request
  const nowPlayingRequest = requestsQuery.data?.requests?.find(
    (request) => request.status === 'playing'
  );

  if (requestsQuery.isLoading) {
    return (
      <div className="px-4 py-2 max-w-2xl mx-auto">
        <div className="animate-pulse text-muted-foreground text-sm">
          Loading now playing...
        </div>
      </div>
    );
  }

  if (!nowPlayingRequest) {
    return (
      <div className="px-4 py-2 max-w-2xl mx-auto">
        <p className="text-sm text-muted-foreground italic opacity-0">
          Nothing is currently playing
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 max-w-2xl mx-auto">
      <div className="bg-card border border-border rounded-xl p-3 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />

        {/* Album Art and Track Info Row */}
        <div className="flex gap-3 relative">
          {/* Album Art */}
          <div className="flex-shrink-0 self-center">
            <img
              src={nowPlayingRequest.track.albumArtUrl}
              alt={`${nowPlayingRequest.track.title} album art`}
              className="w-14 h-14 rounded-md object-cover shadow-sm ring-1 ring-border"
            />
          </div>

          {/* Track Information */}
          <div className="flex-1 min-w-0">
            <div className="text-[0.6rem] text-primary font-bold uppercase tracking-wider mb-0.5">
              Now playing
            </div>
            <div className="font-semibold text-sm sm:text-base leading-tight tracking-tight text-foreground truncate">
              {nowPlayingRequest.track.title}
            </div>
            <div className="text-xs sm:text-sm tracking-tight text-muted-foreground truncate">
              {nowPlayingRequest.track.artist}
            </div>

            {nowPlayingRequest.requestedBy && (
              <div className="mt-1.5">
                <span className="text-[0.6rem] sm:text-[0.65rem] font-medium text-secondary-foreground bg-secondary rounded-full px-2 py-0.5 inline-block whitespace-nowrap">
                  Requested by {nowPlayingRequest.requestedBy}
                </span>
              </div>
            )}
          </div>

          {/* Like/Heart Button */}
          {/* <button className="flex-shrink-0 p-1.5 hover:bg-accent hover:text-accent-foreground rounded-full transition-colors self-center">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground hover:text-destructive transition-colors fill-none hover:fill-destructive" />
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default NowPlaying;
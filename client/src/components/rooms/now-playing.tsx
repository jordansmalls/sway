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
        <div className="animate-pulse text-gray-500">
          Loading now playing...
        </div>
      </div>
    );
  }

  if (!nowPlayingRequest) {
    return (
      <div className="px-4 py-2 max-w-2xl mx-auto">
        <p className="opacity-0">Nothing is currently playing</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 max-w-2xl mx-auto">
      <div className="px-4 py-2 max-w-2xl mx-auto">
        <div className="bg-[#101011] rounded-xl p-3">
          {/* Album Art and Track Info Row */}
          <div className="flex gap-3">
            {/* Album Art */}
            <div className="flex-shrink-0 self-center">
              <img
                src={nowPlayingRequest.track.albumArtUrl}
                alt={`${nowPlayingRequest.track.title} album art`}
                className="w-14 h-14 rounded-md object-cover shadow-sm"
              />
            </div>

            {/* Track Information */}
            <div className="flex-1">
              <div className="text-[0.6rem] text-[dodgerblue] uppercase tracking-wide mb-0.5">
                Now playing
              </div>
              <div className="font-semibold text-sm sm:text-base leading-tight tracking-tight text-primary-foreground break-words">
                {nowPlayingRequest.track.title}
              </div>
              <div className="text-xs sm:text-sm tracking-tight text-primary-foreground/80 break-words">
                {nowPlayingRequest.track.artist}
              </div>

              {nowPlayingRequest.requestedBy && (
                <div className="mt-1.5">
                  <span className="text-[0.6rem] sm:text-[0.65rem] text-primary-foreground bg-[dodgerblue]/30 rounded-full px-2 py-0.5 inline-block whitespace-nowrap">
                    {nowPlayingRequest.requestedBy}
                  </span>
                </div>
              )}
            </div>

            {/* Like/Heart Button */}
            <button className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded-full transition-colors self-center">
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hover:text-red-500 transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NowPlaying;
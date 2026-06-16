import { useParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { usePlayedSpotifyRequestsQuery, useRoomDetailsQuery } from '@/api/rooms';
import type { QueueRequest } from '@/api/types';
import { Music, Loader2 } from 'lucide-react';
import Footer from '../../components/footer';

function sortByTime(timeA: string, timeB: string) {
  const parseTime = (timeStr: string) => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    else if (period === 'AM' && hours === 12) hours = 0;
    if (period === 'AM') hours += 24;
    return hours * 60 + minutes;
  };
  return parseTime(timeA) - parseTime(timeB);
}

const Tracklist = () => {
  const { roomCode: rawRoomCode } = useParams();
  const roomCode = rawRoomCode ? rawRoomCode.toUpperCase() : '';
  const tracklistQuery = usePlayedSpotifyRequestsQuery(roomCode);
  const roomDetailsQuery = useRoomDetailsQuery(roomCode);

  const tracklistData = [...(tracklistQuery.data?.data ?? [])].sort((a, b) =>
    sortByTime(a.playedAt ?? '', b.playedAt ?? '')
  );

  const roomName = roomDetailsQuery.data?.roomDetails?.roomName ?? '';
  const isLoading = tracklistQuery.isLoading || roomDetailsQuery.isLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-sm tracking-widest uppercase font-mono">
            Loading tracks...
          </p>
        </div>
      </div>
    );
  }

  if (tracklistQuery.isError || !roomCode) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground text-sm tracking-widest uppercase font-mono">
            Room {roomCode}
          </p>
          <p className="text-destructive font-mono text-sm">
            Failed to fetch tracklist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-muted/80 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tighter leading-none">
              Room Recap
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {roomName || `#${roomCode}`}
            </p>
          </div>
          {tracklistData.length > 0 && (
            <div className="shrink-0 bg-secondary rounded-full px-3 py-1.5">
              <span className="text-xs font-sans text-primary font-semibold">
                {tracklistData.length} Songs
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {tracklistData.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground font-mono text-sm">
            <Music className="h-12 w-12 mx-auto mb-4 opacity-20" />
            No tracks found for this room.
          </div>
        ) : (
          <ul className="space-y-0 divide-y divide-border/60">
            {tracklistData.map((track: QueueRequest, index) => (
              <li key={track.id} className="py-4 first:pt-0 last:pb-0 group">
                <div className="flex items-start gap-3">
                  {/* Track number */}
                  <span className="mt-0.5 text-xs font-mono text-muted-foreground w-6 shrink-0 text-right leading-5">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  {/* Album art */}
                  <div className="shrink-0 w-11 h-11 rounded-md overflow-hidden bg-muted">
                    {track.albumArtUrl ? (
                      <img
                        src={track.albumArtUrl}
                        alt={`${track.title} album art`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>

                  {/* Track info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-semibold text-sm leading-snug truncate tracking-tight">
                      {track.title}
                    </p>
                    <p className="text-sm text-muted-foreground truncate tracking-tight font-normal">
                      {track.artist}
                    </p>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                      {track.playedAt && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {track.playedAt}
                        </span>
                      )}
                      {track.requestedBy && (
                        <span className="text-xs text-muted-foreground">
                          <span className="text-muted-foreground/60">by </span>
                          {track.requestedBy}
                        </span>
                      )}
                      {track.votes != null && (
                        <span className="text-xs font-mono text-[green]">
                          ↑{track.votes}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {track.spotifyLink && (
                        <a
                          href={track.spotifyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-3 rounded-full"
                          >
                            Open Link
                          </Button>
                        </a>
                      )}
                      {track.spotifyUri && (
                        <a href={track.spotifyUri}>
                          <Button
                            size="sm"
                            className="h-7 text-xs px-3 rounded-full font-semibold hover:opacity-90"
                            style={{
                              backgroundColor: '#1DB954',
                              color: '#000000',
                            }}
                          >
                            Spotify App
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Tracklist;
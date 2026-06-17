import React from 'react';
import { Disc3, ArrowBigUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Spinner } from '../ui/spinner';
import {
  useRequestsByRoomQuery,
  useUpvoteRequestMutation,
} from '@/api/requests';
import type { SongRequest } from '@/api/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface Props {
  roomId: string;
}

const RequestList: React.FC<Props> = ({ roomId }) => {
  const requestsQuery = useRequestsByRoomQuery(roomId);
  const upvoteMutation = useUpvoteRequestMutation();
  const requests = [...(requestsQuery.data?.requests ?? [])]
    .filter((request) => request.status !== 'played')
    .sort((a, b) => b.votes - a.votes);

  const handleUpvote = async (requestId: string) => {
    try {
      await upvoteMutation.mutateAsync({ requestId });
    } catch {
      toast.error('Upvote failed', {
        description: 'Try again in a moment.',
      });
    }
  };

  // Render requests grouped by status
  const renderRequests = () => {
    const pending = requests.filter((r) => r.status === 'pending');
    // const playing = requests.find((r) => r.status === 'playing');
    return (
      <>

        {/* <h3 className="font-medium text-lg mb-2 tracking-tighter">Up Next</h3> */}
        {pending.length === 0 ? (
          <p className="text-primary/60 mb-4 text-center tracking-tight font-normal">The request queue is empty, be the first to make a request!</p>
        ) : (
          <ul className="lg:space-y-2 md:space-y-2 space-y-[.2rem] mb-2">
            {pending.map((r) => (
              <RequestItem key={r._id} request={r} onUpvote={handleUpvote} />
            ))}
          </ul>
        )}
      </>
    );
  };

  if (requestsQuery.isLoading)
    return (
      <div>
        <Spinner />
        <h1>Loading requests...</h1>
      </div>
    );
  if (requestsQuery.isError)
    return <div className="text-red-500">Failed to load requests</div>;

  return (
    <div className="p-4">
      <ScrollArea className="lg:h-140 h-120 w-full rounded-md">
        <div className="p-4">{renderRequests()}</div>
      </ScrollArea>
    </div>
  );
};

const RequestItem = ({
  request,
  onUpvote,
  isPlaying = false,
}: {
  request: SongRequest;
  onUpvote: (id: string) => void;
  isPlaying?: boolean;
}) => (
  <li
    className={`p-2 border rounded-lg flex items-center justify-between shadow-sm lg:shadow-xs ${
      isPlaying ? 'bg-blue-50 border-blue-200' : ''
    }`}
  >
    <div className="flex items-center flex-1">
      {isPlaying && (
        <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
      )}
      <a href={request.track.spotifyURI} target="_blank">
        <img
          src={request.track.albumArtUrl}
          alt={request.track.title}
          className="w-12 h-12 rounded-lg object-cover mr-3"
        />
      </a>
      <div className="flex-1">
        <div className="font-semibold text-xs leading-4 tracking-tight">
          {request.track.title}
        </div>
        <div className="text-xs text-foreground tracking-tight">
          {request.track.artist}
        </div>
        <div className="text-xs tracking-tight text-foreground/80 mr-1">
          {request.requestedBy}
        </div>
      </div>
    </div>

    <div className="flex items-center">
      {/* Upvote Button */}
          <button
            onClick={() => onUpvote(request._id)}
            className="flex items-center gap-1 lg:p-2 rounded-lg"
          >
            {/* <ThumbsUp className="w-5 h-5 text-gray-500" /> */}
            <ArrowBigUp className="lg:w-5 lg:h-5 w-4 h-4 text-gray-500 hover:text-green-500 transition-colors" />
            <span className="lg:text-sm md:text-sm text-xs text-gray-700">
              {request.votes}
            </span>
          </button>



      {/* Spotify Link - Opens web player */}
      {request.track.spotifyLink && (
        <a
          href={request.track.spotifyLink}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg"
          title="Open in Spotify Web"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Disc3 className="lg:w-5 lg:h-5 md:w-5 md:h-5 h-4 w-4 text-gray-700 hover:text-green-600 transition-colors" />
            </TooltipTrigger>
            <TooltipContent>
              View on Spotify
            </TooltipContent>
          </Tooltip>
        </a>
      )}
    </div>
  </li>
);

export default RequestList;

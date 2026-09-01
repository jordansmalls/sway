import React from 'react';
import { ThumbsUp, ListMusic } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '../ui/spinner';
import { useRequestsByRoomQuery, useUpvoteRequestMutation } from '@/api/requests';
import type { SongRequest } from '@/api/types';
import { getApiErrorMessage } from '@/api/client';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface Props { roomId: string; }

const RequestList: React.FC<Props> = ({ roomId }) => {
  const requestsQuery = useRequestsByRoomQuery(roomId);
  const upvoteMutation = useUpvoteRequestMutation();
  const pending = [...(requestsQuery.data?.requests ?? [])]
    .filter((request) => request.status === 'pending')
    .sort((a, b) => b.votes - a.votes);

  const handleUpvote = async (requestId: string) => {
    try {
      const { request } = await upvoteMutation.mutateAsync({ requestId });
      toast.success('Vote added', { description: `You voted for ${request.track.title} by ${request.track.artist}.` });
    } catch (error) {
      toast.error("Couldn't add your vote", { description: getApiErrorMessage(error, 'Your vote was not saved. Please try again.') });
    }
  };

  if (requestsQuery.isLoading) return <div className="flex min-h-32 items-center justify-center"><Spinner /></div>;
  if (requestsQuery.isError) return <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-center text-sm text-destructive">Failed to load requests.</div>;

  if (pending.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card/50 px-6 py-10 text-center">
        <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-muted"><ListMusic className="size-5 text-muted-foreground" /></span>
        <p className="font-medium">The queue is wide open</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">Be the first to request a song for this room.</p>
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      {pending.map((request, index) => (
        <RequestItem key={request._id} request={request} position={index + 1} onUpvote={handleUpvote} disabled={upvoteMutation.isPending} />
      ))}
    </ol>
  );
};

const RequestItem = ({ request, position, onUpvote, disabled }: { request: SongRequest; position: number; onUpvote: (id: string) => void; disabled: boolean; }) => (
  <li className="relative flex min-w-0 items-center gap-2 rounded-2xl border bg-card p-2.5 shadow-xs transition-transform duration-200 ease-out hover:z-10 motion-safe:hover:rotate-[0.5deg] motion-reduce:transition-none sm:gap-3 sm:p-3">
    <span className="hidden w-5 shrink-0 text-center text-xs font-medium text-muted-foreground sm:block">{position}</span>
    <img src={request.track.albumArtUrl} alt="" className="size-12 shrink-0 rounded-lg bg-muted object-cover sm:size-16 sm:rounded-xl" />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium leading-snug tracking-tight sm:text-base">{request.track.title}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">{request.track.artist}</p>
      {request.requestedBy && <p className="mt-1 truncate text-[0.7rem] text-muted-foreground">Requested by {request.requestedBy}</p>}
    </div>
    <div className="flex shrink-0 items-center">
      <Tooltip>
        <TooltipTrigger asChild>
      <button type="button" onClick={() => onUpvote(request._id)} disabled={disabled} aria-label={`Upvote ${request.track.title}. ${request.votes} votes`} className="group flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
        <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-2 py-1 transition-colors group-hover:border-border group-hover:bg-accent group-active:bg-accent">
          <ThumbsUp className="size-4" strokeWidth={2} aria-hidden="true" />
          <span className="text-xs font-medium tabular-nums">{request.votes}</span>
        </span>
      </button>
        </TooltipTrigger>
        <TooltipContent>Upvote song</TooltipContent>
      </Tooltip>
      {request.track.spotifyLink && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a href={request.track.spotifyLink} target="_blank" rel="noopener noreferrer" aria-label={`Open ${request.track.title} in Spotify`} className="flex size-11 items-center justify-center rounded-xl transition-colors hover:bg-accent">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg"
                alt=""
                className="size-5"
              />
            </a>
          </TooltipTrigger>
          <TooltipContent>Open in Spotify</TooltipContent>
        </Tooltip>
      )}
    </div>
  </li>
);

export default RequestList;

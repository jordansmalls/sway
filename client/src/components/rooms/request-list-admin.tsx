import React, { useEffect, useMemo } from 'react';
import { Play, Check, Trash2, Music, ThumbsUp, PackageOpen } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '@/lib/utils';
import { AnimatedList } from '@/registry/magicui/animated-list';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/api/client';
import { useDemoSession } from '@/components/demo/demo-context';
import { roomKeys, useRoomDetailsQuery } from '@/api/rooms';
import {
  removeRequestFromRoomCache,
  requestKeys,
  upsertRequestInRoomCache,
  useMarkRequestPlayedMutation,
  useMarkRequestPlayingMutation,
  useRemoveRequestMutation,
  useRequestsByRoomQuery,
} from '@/api/requests';
import type { RequestStatus, SongRequest } from '@/api/types';
import {
  joinRoom,
  onRequestCreated,
  onRequestDeleted,
  onRequestPlayed,
  onRequestPlaying,
  onRequestUpdated,
} from '@/lib/socket';

const statusOrder: Record<RequestStatus, number> = {
  playing: 0,
  pending: 1,
  rejected: 2,
  played: 3,
};

function sortRequestsForAdminDisplay(requests: SongRequest[]) {
  return [...requests].sort((a, b) => {
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    return b.votes - a.votes;
  });
}

function getQueueStatusLabel(
  request: SongRequest,
  requests: SongRequest[]
): string {
  if (request.status === 'playing') return 'Now Playing';
  if (request.status === 'rejected') return 'Rejected';

  const firstPending = requests.find((item) => item.status === 'pending');
  if (request.status === 'pending' && request._id === firstPending?._id) {
    return 'Up Next';
  }

  return 'Queued';
}

function getStatusBadgeClassName(label: string) {
  switch (label) {
    case 'Now Playing':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900';
    case 'Up Next':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900';
    case 'Rejected':
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

interface AdminRequestRowProps {
  request: SongRequest;
  index: number;
  statusLabel: string;
  onMarkAsPlaying: (requestId: string) => void;
  onMarkAsPlayed: (requestId: string) => void;
  onDeleteRequest: (requestId: string) => void;
  playbackPending: boolean;
}

const AdminRequestRow = ({
  request,
  index,
  statusLabel,
  onMarkAsPlaying,
  onMarkAsPlayed,
  onDeleteRequest,
  playbackPending,
}: AdminRequestRowProps) => (
  <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 border-b px-3 py-3 last:border-b-0 sm:flex sm:px-4">
    <span className="hidden w-4 shrink-0 text-sm text-muted-foreground sm:block">
      {index + 1}
    </span>

    {request.track.albumArtUrl ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <a href={request.track.spotifyLink || undefined} target={request.track.spotifyLink ? "_blank" : undefined} rel="noreferrer" aria-disabled={!request.track.spotifyLink}>
            <img
              src={request.track.albumArtUrl}
              alt={`Album art for ${request.track.title}`}
              className="size-11 shrink-0 rounded-md object-cover"
            />
          </a>
        </TooltipTrigger>
        <TooltipContent>
          <p>{request.track.spotifyLink ? 'Open in Spotify' : 'Demo album artwork'}</p>
        </TooltipContent>
      </Tooltip>
    ) : (
      <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-muted">
        <Music className="size-5 text-muted-foreground" />
      </div>
    )}

    <div className="min-w-0 flex-1">
      <div className="truncate text-sm font-semibold">
        {request.track.title}
      </div>
      <div className="truncate text-sm text-muted-foreground">
        {request.track.artist}
      </div>
      {request.requestedBy && (
        <div className="truncate text-xs text-muted-foreground/80">
          Requested by {request.requestedBy}
        </div>
      )}
    </div>

    <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-2 sm:contents">
      <Badge
        variant="outline"
        className={cn(
          'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
          getStatusBadgeClassName(statusLabel)
        )}
      >
        {statusLabel}
      </Badge>

      <div className="flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-sm font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
        <ThumbsUp className="size-4" strokeWidth={2} aria-hidden="true" />
        <span>{request.votes}</span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
      {request.status !== 'playing' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onMarkAsPlaying(request._id)}
              disabled={playbackPending}
              aria-label="Mark as Playing"
              className="rounded-lg text-green-600 hover:bg-green-50 hover:text-green-700"
            >
              <Play className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Mark as Playing</p>
          </TooltipContent>
        </Tooltip>
      )}
      {request.status !== 'played' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onMarkAsPlayed(request._id)}
              disabled={playbackPending}
              aria-label="Mark as Played"
              className="rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            >
              <Check className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Mark as Played</p>
          </TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onDeleteRequest(request._id)}
            aria-label="Remove Request"
            className="rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Remove Request</p>
        </TooltipContent>
      </Tooltip>
      </div>
    </div>
  </div>
);

const RequestListAdmin: React.FC = () => {
  const demo = useDemoSession();
  const { roomCode: rawRoomCode } = useParams<{ roomCode: string }>();
  const roomCode = rawRoomCode?.toUpperCase() || '';
  const queryClient = useQueryClient();

  const roomQuery = useRoomDetailsQuery(roomCode);
  const roomId = roomQuery.data?.roomDetails._id ?? '';
  const requestsQuery = useRequestsByRoomQuery(roomId);
  const markPlayingMutation = useMarkRequestPlayingMutation();
  const markPlayedMutation = useMarkRequestPlayedMutation();
  const removeRequestMutation = useRemoveRequestMutation();

  useEffect(() => {
    if (!roomId) return;

    const invalidateRequests = () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.byRoom(roomId) });
      queryClient.invalidateQueries({ queryKey: roomKeys.requests(roomCode) });
    };
    const syncRequest = (
      request: Parameters<typeof upsertRequestInRoomCache>[1]
    ) => {
      upsertRequestInRoomCache(queryClient, request);
      invalidateRequests();
    };

    const leaveRoom = joinRoom(roomId);

    const unsubscribeCreated = onRequestCreated(
      ({ roomId: eventRoomId, request }) => {
        if (eventRoomId !== roomId) return;

        syncRequest(request);
        toast.success('You Have a New Request!', {
          description: `${request.track.title} by ${request.track.artist}`,
        });
      }
    );
    const unsubscribeUpdated = onRequestUpdated(
      ({ roomId: eventRoomId, request }) => {
        if (eventRoomId === roomId) syncRequest(request);
      }
    );
    const unsubscribeDeleted = onRequestDeleted(({ requestId }) => {
      removeRequestFromRoomCache(queryClient, roomId, requestId);
      invalidateRequests();
    });
    const unsubscribePlaying = onRequestPlaying(
      ({ roomId: eventRoomId, request }) => {
        if (eventRoomId !== roomId) return;

        syncRequest(request);
        toast.success('Now Playing:', {
          description: `${request.track.title} by ${request.track.artist}`,
        });
      }
    );
    const unsubscribePlayed = onRequestPlayed(
      ({ roomId: eventRoomId, request }) => {
        if (eventRoomId === roomId) syncRequest(request);
      }
    );

    return () => {
      leaveRoom();
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
      unsubscribePlaying();
      unsubscribePlayed();
    };
  }, [queryClient, roomCode, roomId]);

  const handleMarkAsPlaying = async (requestId: string) => {
    try {
      const { request } = await markPlayingMutation.mutateAsync({ requestId });
      // Real rooms already announce this through their Socket.IO event.
      if (demo) toast.success('Now playing in your demo', { description: `${request.track.title} by ${request.track.artist} is now at the top of the room. No audio is played.` });
    } catch (error) {
      toast.error("Couldn't update now playing", {
        description: getApiErrorMessage(error, 'The track status was not changed. Please try again.'),
      });
    }
  };

  const handleMarkAsPlayed = async (requestId: string) => {
    try {
      const { request } = await markPlayedMutation.mutateAsync({ requestId });
      toast.success('Track marked as played', { description: `${request.track.title} by ${request.track.artist} is now in the room's tracklist.` });
    } catch (error) {
      toast.error("Couldn't mark the track as played", {
        description: getApiErrorMessage(error, 'The track status was not changed. Please try again.'),
      });
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    const track = requestsQuery.data?.requests.find((request) => request._id === requestId)?.track;
    try {
      await removeRequestMutation.mutateAsync({ requestId });
      toast.success('Request removed', { description: track ? `${track.title} by ${track.artist} has been removed from the queue.` : 'The song request has been removed from this room.' });
    } catch (error) {
      toast.error("Couldn't remove the request", {
        description: getApiErrorMessage(error, 'The request is still in the queue. Please try again.'),
      });
    }
  };

  const requests = useMemo(() => {
    const activeRequests =
      requestsQuery.data?.requests.filter(
        (request) => request.status !== 'played'
      ) ?? [];

    return sortRequestsForAdminDisplay(activeRequests);
  }, [requestsQuery.data?.requests]);

  if (roomQuery.isLoading || requestsQuery.isLoading) {
    return <div>Loading requests...</div>;
  }

  if (roomQuery.isError || requestsQuery.isError) {
    return <div className="text-red-500">Failed to load requests.</div>;
  }

  return (
    <div className="mt-2 w-full sm:mt-8">
      {requests.length === 0 ? (
        <div className="flex h-[360px] flex-col items-center justify-center rounded-xl border border-border/50 bg-card px-5 sm:h-[500px]">
          {/* Illustration */}

          <div className="relative mb-8">
            <div className="absolute inset-0 scale-125 rounded-full bg-primary/5 blur-xl" />

            <div className="relative flex size-28 items-center justify-center rounded-full border border-border bg-background">
              <PackageOpen className="size-12 text-muted-foreground" />
            </div>
          </div>

          {/* Content */}

          <div className="max-w-md text-center">
            <h4 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              The Queue is Empty!
            </h4>

            <p className="mb-8 text-foreground/70 tracking-tight font-normal">
              When guests add songs to the request list, they'll appear here for
              you to manage.
            </p>
          </div>
        </div>
      ) : (
        <>
          <ScrollArea className="h-[min(700px,calc(100dvh-10rem))] min-h-[420px] w-full rounded-xl border bg-background">
            <AnimatedList delay={60}>
              {requests.map((request, index) => (
                <AdminRequestRow
                  key={request._id}
                  request={request}
                  index={index}
                  statusLabel={getQueueStatusLabel(request, requests)}
                  onMarkAsPlaying={handleMarkAsPlaying}
                  onMarkAsPlayed={handleMarkAsPlayed}
                  onDeleteRequest={handleDeleteRequest}
                  playbackPending={
                    markPlayingMutation.isPending || markPlayedMutation.isPending
                  }
                />
              ))}
            </AnimatedList>
          </ScrollArea>
        </>
      )}
    </div>
  );
};

export default RequestListAdmin;

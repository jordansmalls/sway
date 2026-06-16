import React, { useEffect, useMemo } from 'react';
import { Play, Check, Trash2, Music, ArrowUp, PackageOpen } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
}

const AdminRequestRow = ({
  request,
  index,
  statusLabel,
  onMarkAsPlaying,
  onMarkAsPlayed,
  onDeleteRequest,
}: AdminRequestRowProps) => (
  <div className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
    <span className="w-4 shrink-0 text-sm text-muted-foreground">
      {index + 1}
    </span>

    {request.track.albumArtUrl ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <a href={request.track.spotifyLink} target="_blank">
            <img
              src={request.track.albumArtUrl}
              alt={`Album art for ${request.track.title}`}
              className="size-11 shrink-0 rounded-md object-cover"
            />
          </a>
        </TooltipTrigger>
        <TooltipContent>
          <p>Open in Spotify</p>
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
      <ArrowUp className="size-3.5" />
      <span>{request.votes}</span>
    </div>

    <div className="flex shrink-0 items-center gap-1">
      {request.status !== 'playing' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onMarkAsPlaying(request._id)}
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
);

const RequestListAdmin: React.FC = () => {
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
      await markPlayingMutation.mutateAsync({ requestId });
    } catch {
      toast.error('Something went wrong.', {
        description: 'Failed to mark track as playing, please try again.',
      });
    }
  };

  const handleMarkAsPlayed = async (requestId: string) => {
    try {
      await markPlayedMutation.mutateAsync({ requestId });
    } catch {
      toast.error('Something went wrong.', {
        description: 'Failed to mark track as played, please try again.',
      });
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      await removeRequestMutation.mutateAsync({ requestId });
    } catch {
      toast.error('Something went wrong.', {
        description: 'Failed to delete request, please try again.',
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
    <div className="w-full mt-8">
      {requests.length === 0 ? (
        <div className="flex h-[500px] flex-col items-center justify-center rounded-xl border border-border/50 bg-card">
          {/* Illustration */}

          <div className="relative mb-8">
            <div className="absolute inset-0 scale-125 rounded-full bg-primary/5 blur-xl" />

            <div className="relative flex size-28 items-center justify-center rounded-full border border-border bg-background">
              <PackageOpen className="size-12 text-muted-foreground" />
            </div>
          </div>

          {/* Content */}

          <div className="max-w-md text-center">
            <h4 className="mb-2 text-3xl font-semibold tracking-tight">
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
          <ScrollArea className="h-[700px] w-full rounded-xl border bg-background">
            <div>
              {requests.map((request, index) => (
                <AdminRequestRow
                  key={request._id}
                  request={request}
                  index={index}
                  statusLabel={getQueueStatusLabel(request, requests)}
                  onMarkAsPlaying={handleMarkAsPlaying}
                  onMarkAsPlayed={handleMarkAsPlayed}
                  onDeleteRequest={handleDeleteRequest}
                />
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
};

export default RequestListAdmin;

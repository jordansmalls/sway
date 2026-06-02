import React, { useEffect } from 'react';
import { Play, Check, Trash2, Music, ArrowUpFromLine } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

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
import {
  joinRoom,
  onRequestCreated,
  onRequestDeleted,
  onRequestPlayed,
  onRequestPlaying,
  onRequestUpdated,
} from '@/lib/socket';

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
    const syncRequest = (request: Parameters<typeof upsertRequestInRoomCache>[1]) => {
      upsertRequestInRoomCache(queryClient, request);
      invalidateRequests();
    };

    const leaveRoom = joinRoom(roomId);

    const unsubscribeCreated = onRequestCreated(({ roomId: eventRoomId, request }) => {
      if (eventRoomId !== roomId) return;

      syncRequest(request);
      toast.success('You Have a New Request!', {
        description: `${request.track.title} by ${request.track.artist}`,
      });
    });
    const unsubscribeUpdated = onRequestUpdated(({ roomId: eventRoomId, request }) => {
      if (eventRoomId === roomId) syncRequest(request);
    });
    const unsubscribeDeleted = onRequestDeleted(({ requestId }) => {
      removeRequestFromRoomCache(queryClient, roomId, requestId);
      invalidateRequests();
    });
    const unsubscribePlaying = onRequestPlaying(({ roomId: eventRoomId, request }) => {
      if (eventRoomId !== roomId) return;

      syncRequest(request);
      toast.success('Now Playing:', {
        description: `${request.track.title} by ${request.track.artist}`,
      });
    });
    const unsubscribePlayed = onRequestPlayed(({ roomId: eventRoomId, request }) => {
      if (eventRoomId === roomId) syncRequest(request);
    });

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
      toast.error("Something went wrong.", { description: "Failed to mark track as playing, please try again." })
    }
  };

  const handleMarkAsPlayed = async (requestId: string) => {
    try {
      await markPlayedMutation.mutateAsync({ requestId });
    } catch {
      toast.error("Something went wrong.", { description: 'Failed to mark track as played, please try again.' });
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      await removeRequestMutation.mutateAsync({ requestId });
    } catch {
      toast.error("Something went wrong.", { description: "Failed to delete request, please try again."})
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'playing':
        return <Badge className="bg-green-500">Playing</Badge>;
      case 'played':
        return <Badge className="bg-blue-500">Played</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-500">Pending</Badge>;
    }
  };

  if (roomQuery.isLoading || requestsQuery.isLoading) {
    return <div>Loading requests...</div>;
  }

  if (roomQuery.isError || requestsQuery.isError) {
    return <div className="text-red-500">Failed to load requests.</div>;
  }

  const requests =
    requestsQuery.data?.requests.filter((request) => request.status !== 'played') ??
    [];

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Admin Request Queue</h3>
      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-gray-500">
          <Music className="w-12 h-12 mb-2" />
          <p>No requests found in this room.</p>
        </div>
      ) : (
        <ScrollArea className="h-136 w-full rounded-md border">
          <div className="p-2">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="text-left p-2">Track</th>
                  <th className="text-center p-2">Status</th>
                  <th className="text-center p-2">Votes</th>
                  <th className="text-center p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request._id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div className="flex items-center">
                        <img
                          src={request.track.albumArtUrl}
                          alt={`Album art for ${request.track.title}`}
                          className="w-10 h-10 rounded object-cover mr-3"
                        />
                        <div>
                          <div className="font-medium text-sm leading-tight">
                            {request.track.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {request.track.artist}
                          </div>
                          {request.requestedBy && (
                            <div className="text-xs italic text-gray-400">
                              Requested by {request.requestedBy}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-center p-2">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="text-center p-2">
                      <div className="flex justify-center items-center">
                        <ArrowUpFromLine className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-sm">{request.votes}</span>
                      </div>
                    </td>
                    <td className="text-center p-2">
                      <div className="flex justify-center gap-2">
                        {request.status !== 'playing' && (
                          <button
                            onClick={() => handleMarkAsPlaying(request._id)}
                            className="p-1 rounded-full hover:bg-green-100 text-green-600"
                            title="Mark as playing"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {request.status !== 'played' && (
                          <button
                            onClick={() => handleMarkAsPlayed(request._id)}
                            className="p-1 rounded-full hover:bg-blue-100 text-blue-600"
                            title="Mark as played"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteRequest(request._id)}
                          className="p-1 rounded-full hover:bg-red-100 text-red-600"
                          title="Delete request"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default RequestListAdmin;

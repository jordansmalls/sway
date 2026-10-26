import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { RecommendedTrack } from '@/api/analytics';
import { getApiErrorMessage } from '@/api/client';
import { requestKeys, type RequestsResponse } from '@/api/request-cache';
import {
  createRequestTrackFromSpotifyTrack,
  useCreateRequestMutation,
  useRequestsByRoomQuery,
} from '@/api/requests';

export type RecommendedTrackQueueState = 'idle' | 'adding' | 'queued' | 'disabled';

type RecommendedTrackQueueOptions = {
  roomId: string;
  requestedBy: string;
  active: boolean;
};

export function useRecommendedTrackQueue({ roomId, requestedBy, active }: RecommendedTrackQueueOptions) {
  const queryClient = useQueryClient();
  const requestsQuery = useRequestsByRoomQuery(roomId);
  const createRequestMutation = useCreateRequestMutation();
  const inFlight = useRef(new Set<string>());
  const [pendingTrackIds, setPendingTrackIds] = useState<ReadonlySet<string>>(new Set());

  const canAddToQueue = active && Boolean(roomId) && requestsQuery.data !== undefined;
  const queuedTrackIds = new Set(
    requestsQuery.data?.requests
      .filter((request) => request.status === 'pending' || request.status === 'playing')
      .map((request) => request.track.spotifyTrackId),
  );

  const getTrackState = (trackId: string): RecommendedTrackQueueState => {
    if (pendingTrackIds.has(trackId)) return 'adding';
    if (queuedTrackIds.has(trackId)) return 'queued';
    return canAddToQueue ? 'idle' : 'disabled';
  };

  const addToQueue = async (track: RecommendedTrack) => {
    // Read the cache at tap time, including changes made by another card or the live queue.
    const requests = queryClient.getQueryData<RequestsResponse>(requestKeys.byRoom(roomId))?.requests;
    const alreadyQueued = requests?.some((request) =>
      request.track.spotifyTrackId === track.spotifyTrackId &&
      (request.status === 'pending' || request.status === 'playing'),
    );
    if (!canAddToQueue || inFlight.current.has(track.spotifyTrackId) || alreadyQueued) return;

    // The ref also blocks repeated taps before React has rendered the pending state.
    inFlight.current.add(track.spotifyTrackId);
    setPendingTrackIds(new Set(inFlight.current));

    try {
      const { alreadyQueued: queuedByAnotherGuest } = await createRequestMutation.mutateAsync({
        roomId,
        requestedBy,
        track: createRequestTrackFromSpotifyTrack({
          id: track.spotifyTrackId,
          name: track.title,
          artist: track.artist,
          albumImage: track.albumArtUrl,
        }),
      });
      toast.success(queuedByAnotherGuest ? 'Already in queue' : 'Added to queue', {
        description: `${track.title} by ${track.artist}`,
      });
    } catch (error) {
      toast.error("Couldn't add track", {
        description: getApiErrorMessage(error, 'Please try again in a moment.'),
      });
    } finally {
      inFlight.current.delete(track.spotifyTrackId);
      setPendingTrackIds(new Set(inFlight.current));
    }
  };

  return { addToQueue, getTrackState };
}

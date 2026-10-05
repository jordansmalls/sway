import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { analyticsKeys } from "@/api/analytics"
import { apiClient } from "@/api/client"
import { roomKeys } from "@/api/rooms"
import type {
  ApiMessageResponse,
  CreateRequestTrack,
  RequestStatus,
  SongRequest,
  SpotifyTrack,
} from "@/api/types"

import {
  requestKeys,
  optimisticallyUpdateRequest,
  upsertRequestInRoomCache,
  type RequestAction,
  type RequestsResponse,
} from "./request-cache"
export { requestKeys, getSongRequestRoomId, sortRequestsForQueue, upsertRequestInRoomCache, removeRequestFromRoomCache } from "./request-cache"

type RequestResponse = {
  success: true
  message?: string
  alreadyQueued?: boolean
  request: SongRequest
}

export type CreateRequestInput = {
  track: CreateRequestTrack
  roomId: string
  requestedBy?: string
}

export type RequestIdInput = {
  requestId: string
}

export type FilterRequestsInput = {
  roomId: string
  status?: RequestStatus
}

export async function createRequest(input: CreateRequestInput) {
  const { data } = await apiClient.post<RequestResponse>(
    "/api/requests",
    input
  )
  return data
}

export function createRequestTrackFromSpotifyTrack(
  track: Pick<SpotifyTrack, "id" | "name" | "artist" | "albumImage"> & {
    uri?: string
    duration_ms?: number
  }
): CreateRequestTrack {
  const spotifyURI = track.uri ?? `spotify:track:${track.id}`

  return {
    id: track.id,
    name: track.name,
    spotifyTrackId: track.id,
    title: track.name,
    artist: track.artist,
    albumImage: track.albumImage,
    albumArtUrl: track.albumImage,
    spotifyLink: `https://open.spotify.com/track/${track.id}`,
    spotifyURI,
    spotifyUri: spotifyURI,
    uri: spotifyURI,
    duration_ms: track.duration_ms,
  }
}

export async function upvoteRequest(input: RequestIdInput) {
  const { data } = await apiClient.put<RequestResponse>(
    "/api/requests/vote",
    input
  )
  return data
}

export async function markRequestPlaying({ requestId }: RequestIdInput) {
  const { data } = await apiClient.put<RequestResponse>(
    `/api/requests/${encodeURIComponent(requestId)}/mark-playing`,
    { requestId }
  )
  return data
}

export async function markRequestPlayed({ requestId }: RequestIdInput) {
  const { data } = await apiClient.put<RequestResponse>(
    `/api/requests/${encodeURIComponent(requestId)}/mark-played`,
    { requestId }
  )
  return data
}

export async function removeRequest({ requestId }: RequestIdInput) {
  const { data } = await apiClient.delete<ApiMessageResponse>(
    `/api/requests/${encodeURIComponent(requestId)}/delete`,
    { data: { requestId } }
  )
  return data
}

export async function getRequestsByRoom(roomId: string) {
  const { data } = await apiClient.get<RequestsResponse>(
    `/api/requests/${encodeURIComponent(roomId)}/requests`
  )
  return data
}

export async function getRequestDetails(requestId: string) {
  const { data } = await apiClient.get<RequestResponse>(
    `/api/requests/${encodeURIComponent(requestId)}`
  )
  return data
}

export async function filterRequests({ roomId, status }: FilterRequestsInput) {
  const { data } = await apiClient.get<RequestsResponse>(
    `/api/requests/${encodeURIComponent(roomId)}/filter`,
    { params: { status } }
  )
  return data
}

function useInvalidateRequests() {
  const queryClient = useQueryClient()
  return async () => {
    // The last mutation refreshes the queue. Earlier completions must not
    // replace another mutation's optimistic changes with an older response.
    if (queryClient.isMutating({ mutationKey: requestKeys.all }) > 1) return
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all }),
      queryClient.invalidateQueries({ queryKey: requestKeys.all }),
      queryClient.invalidateQueries({ queryKey: roomKeys.all }),
    ])
  }
}

export function useCreateRequestMutation() {
  const queryClient = useQueryClient()
  const invalidateRequests = useInvalidateRequests()
  return useMutation({
    mutationKey: requestKeys.all,
    mutationFn: createRequest,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: requestKeys.all })
      const existing = queryClient.getQueryData<RequestsResponse>(requestKeys.byRoom(input.roomId))?.requests.find(
        (item) => item.track.spotifyTrackId === input.track.id && ["pending", "playing"].includes(item.status)
      )
      return existing ? optimisticallyUpdateRequest(queryClient, existing._id, "vote") : undefined
    },
    onError: (_error, _input, rollback) => rollback?.(),
    onSuccess: ({ request }) => upsertRequestInRoomCache(queryClient, request),
    onSettled: invalidateRequests,
  })
}

function useRequestActionMutation<T extends RequestResponse | ApiMessageResponse>(
  mutationFn: (input: RequestIdInput) => Promise<T>,
  action: RequestAction
) {
  const queryClient = useQueryClient()
  const invalidateRequests = useInvalidateRequests()
  return useMutation({
    mutationKey: requestKeys.all,
    mutationFn,
    onMutate: async ({ requestId }) => {
      await queryClient.cancelQueries({ queryKey: requestKeys.all })
      return optimisticallyUpdateRequest(queryClient, requestId, action)
    },
    onError: (_error, _input, rollback) => rollback?.(),
    onSuccess: (data) => {
      if ("request" in data) upsertRequestInRoomCache(queryClient, data.request)
    },
    onSettled: invalidateRequests,
  })
}

export function useUpvoteRequestMutation() {
  return useRequestActionMutation(upvoteRequest, "vote")
}

export function useMarkRequestPlayingMutation() {
  return useRequestActionMutation(markRequestPlaying, "playing")
}

export function useMarkRequestPlayedMutation() {
  return useRequestActionMutation(markRequestPlayed, "played")
}

export function useRemoveRequestMutation() {
  return useRequestActionMutation(removeRequest, "delete")
}

export function useRequestsByRoomQuery(roomId: string) {
  const pendingMutations = useIsMutating({ mutationKey: requestKeys.all })
  return useQuery({
    queryKey: requestKeys.byRoom(roomId),
    queryFn: () => getRequestsByRoom(roomId),
    enabled: roomId.length > 0 && pendingMutations === 0,
  })
}

export function useRequestDetailsQuery(requestId: string) {
  return useQuery({
    queryKey: requestKeys.detail(requestId),
    queryFn: () => getRequestDetails(requestId),
    enabled: requestId.length > 0,
  })
}

export function useFilterRequestsQuery({ roomId, status }: FilterRequestsInput) {
  return useQuery({
    queryKey: requestKeys.filter(roomId, status),
    queryFn: () => filterRequests({ roomId, status }),
    enabled: roomId.length > 0,
  })
}

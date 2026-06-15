import {
  type QueryClient,
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

type RequestResponse = {
  success: true
  message?: string
  request: SongRequest
}

type RequestsResponse = {
  success: true
  requests: SongRequest[]
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

export const requestKeys = {
  all: ["requests"] as const,
  byRoom: (roomId: string) => [...requestKeys.all, "room", roomId] as const,
  detail: (requestId: string) =>
    [...requestKeys.all, "detail", requestId] as const,
  filter: (roomId: string, status?: RequestStatus) =>
    [...requestKeys.byRoom(roomId), "filter", status ?? "all"] as const,
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

export function getSongRequestRoomId(request: SongRequest) {
  return typeof request.roomId === "string" ? request.roomId : request.roomId._id
}

export function sortRequestsForQueue(requests: SongRequest[]) {
  return [...requests].sort((a, b) => b.votes - a.votes)
}

export function upsertRequestInRoomCache(
  queryClient: QueryClient,
  request: SongRequest
) {
  const roomId = getSongRequestRoomId(request)

  queryClient.setQueryData<RequestsResponse>(
    requestKeys.byRoom(roomId),
    (current) => {
      const requests = sortRequestsForQueue([
        ...(current?.requests ?? []).filter((item) => item._id !== request._id),
        request,
      ])

      return {
        success: true,
        requests,
      }
    }
  )
}

export function removeRequestFromRoomCache(
  queryClient: QueryClient,
  roomId: string,
  requestId: string
) {
  queryClient.setQueryData<RequestsResponse>(
    requestKeys.byRoom(roomId),
    (current) => {
      if (!current) return current

      return {
        ...current,
        requests: current.requests.filter((item) => item._id !== requestId),
      }
    }
  )
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

  return () => {
    queryClient.invalidateQueries({ queryKey: analyticsKeys.all })
    queryClient.invalidateQueries({ queryKey: requestKeys.all })
    queryClient.invalidateQueries({ queryKey: roomKeys.all })
  }
}

export function useCreateRequestMutation() {
  const invalidateRequests = useInvalidateRequests()

  return useMutation({
    mutationFn: createRequest,
    onSuccess: invalidateRequests,
  })
}

export function useUpvoteRequestMutation() {
  const invalidateRequests = useInvalidateRequests()

  return useMutation({
    mutationFn: upvoteRequest,
    onSuccess: invalidateRequests,
  })
}

export function useMarkRequestPlayingMutation() {
  const invalidateRequests = useInvalidateRequests()

  return useMutation({
    mutationFn: markRequestPlaying,
    onSuccess: invalidateRequests,
  })
}

export function useMarkRequestPlayedMutation() {
  const invalidateRequests = useInvalidateRequests()

  return useMutation({
    mutationFn: markRequestPlayed,
    onSuccess: invalidateRequests,
  })
}

export function useRemoveRequestMutation() {
  const invalidateRequests = useInvalidateRequests()

  return useMutation({
    mutationFn: removeRequest,
    onSuccess: invalidateRequests,
  })
}

export function useRequestsByRoomQuery(roomId: string) {
  return useQuery({
    queryKey: requestKeys.byRoom(roomId),
    queryFn: () => getRequestsByRoom(roomId),
    enabled: roomId.length > 0,
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

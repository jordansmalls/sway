import { useQuery } from "@tanstack/react-query"

import { apiClient } from "@/api/client"

type TotalRoomsHostedResponse = {
  success: true
  roomsHosted: number
}

type TotalRequestsReceivedResponse = {
  success: true
  requestsReceived: number
}

type TotalRequestsPlayedResponse = {
  success: true
  requestsPlayed: number
}

type MostPlayedArtistsResponse = {
  success: true
  artists: AnalyticsArtist[]
}

type AnalyticsSongsResponse = {
  success: true
  songs: AnalyticsSong[]
}

type GlobalTopItemsResponse<T> = {
  success: true
  cached: boolean
  data: T[]
}

type GlobalRequestsResponse = {
  success: true
  message: string
  totalRequests: number
}

type GlobalRoomsResponse = {
  success: true
  message: string
  totalRooms: number
}

export type AnalyticsArtist = {
  artist: string
  playCount: number
}

export type AnalyticsSong = {
  spotifyTrackId: string
  title: string
  artist: string
  albumArtUrl: string
  spotifyLink: string
  spotifyURI: string
  requestCount: number
  totalVotes: number
  latestRequestedAt: string
  latestPlayedAt: string | null
}

export type AnalyticsTotals = {
  roomsHosted: number
  requestsReceived: number
  requestsPlayed: number
}

export type GlobalTrack = {
  _id?: string | { title?: string; artist?: string; spotifyTrackId?: string }
  spotifyTrackId?: string
  title?: string
  name?: string
  artist?: string
  albumArtUrl?: string
  spotifyLink?: string
  requestCount?: number
  totalVotes?: number
  totalRequests?: number
  totalSongRequests?: number
  count?: number
}

export type GlobalArtist = {
  _id?: string
  artist?: string
  name?: string
  requestCount?: number
  totalVotes?: number
  totalRequests?: number
  totalSongRequests?: number
  count?: number
}

export type GlobalTotals = {
  totalRequests: number
  totalRooms: number
}

export const analyticsKeys = {
  all: ["analytics"] as const,
  global: () => [...analyticsKeys.all, "global"] as const,
  globalTracks: () => [...analyticsKeys.global(), "tracks"] as const,
  globalArtists: () => [...analyticsKeys.global(), "artists"] as const,
  globalRequests: () => [...analyticsKeys.global(), "requests"] as const,
  globalRooms: () => [...analyticsKeys.global(), "rooms"] as const,
  globalTotals: () => [...analyticsKeys.global(), "totals"] as const,
  byUser: (userId: string) => [...analyticsKeys.all, userId] as const,
  totalRoomsHosted: (userId: string) =>
    [...analyticsKeys.byUser(userId), "total-rooms-hosted"] as const,
  totalRequestsReceived: (userId: string) =>
    [...analyticsKeys.byUser(userId), "total-requests-received"] as const,
  totalRequestsPlayed: (userId: string) =>
    [...analyticsKeys.byUser(userId), "total-requests-played"] as const,
  totals: (userId: string) => [...analyticsKeys.byUser(userId), "totals"] as const,
  mostPlayedArtists: (userId: string) =>
    [...analyticsKeys.byUser(userId), "most-played-artists"] as const,
  mostRequestedSongs: (userId: string) =>
    [...analyticsKeys.byUser(userId), "most-requested-songs"] as const,
  mostPlayedSongs: (userId: string) =>
    [...analyticsKeys.byUser(userId), "most-played-songs"] as const,
  mostUpvotedSongs: (userId: string) =>
    [...analyticsKeys.byUser(userId), "most-upvoted-songs"] as const,
}

function analyticsPath(userId: string, endpoint: string) {
  return `/api/analytics/${encodeURIComponent(userId)}/${endpoint}`
}

export async function getGlobalTracks() {
  const { data } =
    await apiClient.get<GlobalTopItemsResponse<GlobalTrack>>(
      "/api/global/tracks"
    )
  return data
}

export async function getGlobalArtists() {
  const { data } =
    await apiClient.get<GlobalTopItemsResponse<GlobalArtist>>(
      "/api/global/artists"
    )
  return data
}

export async function getGlobalRequests() {
  const { data } =
    await apiClient.get<GlobalRequestsResponse>("/api/global/requests")
  return data
}

export async function getGlobalRooms() {
  const { data } =
    await apiClient.get<GlobalRoomsResponse>("/api/global/rooms")
  return data
}

export async function getGlobalTotals(): Promise<GlobalTotals> {
  const [requests, rooms] = await Promise.all([
    getGlobalRequests(),
    getGlobalRooms(),
  ])

  return {
    totalRequests: requests.totalRequests,
    totalRooms: rooms.totalRooms,
  }
}

export async function getTotalRoomsHosted(userId: string) {
  const { data } = await apiClient.get<TotalRoomsHostedResponse>(
    analyticsPath(userId, "total-rooms-hosted")
  )
  return data
}

export async function getTotalRequestsReceived(userId: string) {
  const { data } = await apiClient.get<TotalRequestsReceivedResponse>(
    analyticsPath(userId, "total-requests-received")
  )
  return data
}

export async function getTotalRequestsPlayed(userId: string) {
  const { data } = await apiClient.get<TotalRequestsPlayedResponse>(
    analyticsPath(userId, "total-requests-played")
  )
  return data
}

export async function getAnalyticsTotals(
  userId: string
): Promise<AnalyticsTotals> {
  const [roomsHosted, requestsReceived, requestsPlayed] = await Promise.all([
    getTotalRoomsHosted(userId),
    getTotalRequestsReceived(userId),
    getTotalRequestsPlayed(userId),
  ])

  return {
    roomsHosted: roomsHosted.roomsHosted,
    requestsReceived: requestsReceived.requestsReceived,
    requestsPlayed: requestsPlayed.requestsPlayed,
  }
}

export async function getMostPlayedArtists(userId: string) {
  const { data } = await apiClient.get<MostPlayedArtistsResponse>(
    analyticsPath(userId, "most-played-artists")
  )
  return data
}

export async function getMostRequestedSongs(userId: string) {
  const { data } = await apiClient.get<AnalyticsSongsResponse>(
    analyticsPath(userId, "most-requested-songs")
  )
  return data
}

export async function getMostPlayedSongs(userId: string) {
  const { data } = await apiClient.get<AnalyticsSongsResponse>(
    analyticsPath(userId, "most-played-songs")
  )
  return data
}

export async function getMostUpvotedSongs(userId: string) {
  const { data } = await apiClient.get<AnalyticsSongsResponse>(
    analyticsPath(userId, "most-upvoted-songs")
  )
  return data
}

export function useTotalRoomsHostedQuery(userId: string) {
  return useQuery({
    queryKey: analyticsKeys.totalRoomsHosted(userId),
    queryFn: () => getTotalRoomsHosted(userId),
    enabled: userId.length > 0,
  })
}

export function useGlobalTracksQuery() {
  return useQuery({
    queryKey: analyticsKeys.globalTracks(),
    queryFn: getGlobalTracks,
  })
}

export function useGlobalArtistsQuery() {
  return useQuery({
    queryKey: analyticsKeys.globalArtists(),
    queryFn: getGlobalArtists,
  })
}

export function useGlobalRequestsQuery() {
  return useQuery({
    queryKey: analyticsKeys.globalRequests(),
    queryFn: getGlobalRequests,
  })
}

export function useGlobalRoomsQuery() {
  return useQuery({
    queryKey: analyticsKeys.globalRooms(),
    queryFn: getGlobalRooms,
  })
}

export function useGlobalTotalsQuery() {
  return useQuery({
    queryKey: analyticsKeys.globalTotals(),
    queryFn: getGlobalTotals,
  })
}

export function useTotalRequestsReceivedQuery(userId: string) {
  return useQuery({
    queryKey: analyticsKeys.totalRequestsReceived(userId),
    queryFn: () => getTotalRequestsReceived(userId),
    enabled: userId.length > 0,
  })
}

export function useTotalRequestsPlayedQuery(userId: string) {
  return useQuery({
    queryKey: analyticsKeys.totalRequestsPlayed(userId),
    queryFn: () => getTotalRequestsPlayed(userId),
    enabled: userId.length > 0,
  })
}

export function useAnalyticsTotalsQuery(userId: string) {
  return useQuery({
    queryKey: analyticsKeys.totals(userId),
    queryFn: () => getAnalyticsTotals(userId),
    enabled: userId.length > 0,
  })
}

export function useMostPlayedArtistsQuery(userId: string) {
  return useQuery({
    queryKey: analyticsKeys.mostPlayedArtists(userId),
    queryFn: () => getMostPlayedArtists(userId),
    enabled: userId.length > 0,
  })
}

export function useMostRequestedSongsQuery(userId: string) {
  return useQuery({
    queryKey: analyticsKeys.mostRequestedSongs(userId),
    queryFn: () => getMostRequestedSongs(userId),
    enabled: userId.length > 0,
  })
}

export function useMostPlayedSongsQuery(userId: string) {
  return useQuery({
    queryKey: analyticsKeys.mostPlayedSongs(userId),
    queryFn: () => getMostPlayedSongs(userId),
    enabled: userId.length > 0,
  })
}

export function useMostUpvotedSongsQuery(userId: string) {
  return useQuery({
    queryKey: analyticsKeys.mostUpvotedSongs(userId),
    queryFn: () => getMostUpvotedSongs(userId),
    enabled: userId.length > 0,
  })
}

import { useQuery } from "@tanstack/react-query"

import { apiClient } from "@/api/client"
import type { SpotifyTrack, SpotifyTrackDetails } from "@/api/types"

type SearchTracksResponse = {
  success: true
  tracks: SpotifyTrack[]
}

type TrackDetailsResponse = {
  success: true
  track: SpotifyTrackDetails
}

type ArtistTopTracksResponse = {
  success: true
  tracks: SpotifyTrack[]
}

export const spotifyKeys = {
  all: ["spotify"] as const,
  search: (query: string) => [...spotifyKeys.all, "search", query] as const,
  track: (id: string) => [...spotifyKeys.all, "tracks", id] as const,
  artistTopTracks: (id: string) =>
    [...spotifyKeys.all, "artists", id, "top-tracks"] as const,
}

export async function searchTracks(query: string) {
  const { data } = await apiClient.get<SearchTracksResponse>(
    "/api/spotify/search",
    { params: { q: query } }
  )
  return data
}

export async function getTrackDetails(id: string) {
  const { data } = await apiClient.get<TrackDetailsResponse>(
    `/api/spotify/tracks/${encodeURIComponent(id)}`
  )
  return data
}

export async function getArtistTopTracks(id: string) {
  const { data } = await apiClient.get<ArtistTopTracksResponse>(
    `/api/spotify/artists/${encodeURIComponent(id)}/top-tracks`
  )
  return data
}

export function useSearchTracksQuery(query: string) {
  return useQuery({
    queryKey: spotifyKeys.search(query),
    queryFn: () => searchTracks(query),
    enabled: query.trim().length > 0,
  })
}

export function useTrackDetailsQuery(id: string) {
  return useQuery({
    queryKey: spotifyKeys.track(id),
    queryFn: () => getTrackDetails(id),
    enabled: id.length > 0,
  })
}

export function useArtistTopTracksQuery(id: string) {
  return useQuery({
    queryKey: spotifyKeys.artistTopTracks(id),
    queryFn: () => getArtistTopTracks(id),
    enabled: id.length > 0,
  })
}

import { useQuery } from "@tanstack/react-query"

import { apiClient } from "@/api/client"
import type {
  RequestsExportItem,
  TracklistExportItem,
} from "@/api/types"

type TracklistJsonResponse = {
  success: true
  message: string
  tracklist: TracklistExportItem[]
}

type RequestsJsonResponse = {
  success: true
  message: string
  data: RequestsExportItem[]
}

export type ExportFormat = "csv" | "txt" | "plaintext"

export const exportKeys = {
  all: ["exports"] as const,
  tracklistJson: (roomId: string) =>
    [...exportKeys.all, "tracklist", roomId, "json"] as const,
  tracklistFile: (roomId: string, format: Exclude<ExportFormat, "plaintext">) =>
    [...exportKeys.all, "tracklist", roomId, format] as const,
  requestsJson: (roomCode: string) =>
    [...exportKeys.all, "requests", roomCode, "json"] as const,
  requestsFile: (
    roomCode: string,
    format: Exclude<ExportFormat, "txt">
  ) => [...exportKeys.all, "requests", roomCode, format] as const,
}

export async function exportTracklistJson(roomId: string) {
  const { data } = await apiClient.get<TracklistJsonResponse>(
    `/api/exports/${encodeURIComponent(roomId)}/tracklist/json`
  )
  return data
}

export async function exportTracklistFile(
  roomId: string,
  format: Exclude<ExportFormat, "plaintext">
) {
  const { data } = await apiClient.get<Blob>(
    `/api/exports/${encodeURIComponent(roomId)}/tracklist/${format}`,
    { responseType: "blob" }
  )
  return data
}

export async function exportRequestsJson(roomCode: string) {
  const { data } = await apiClient.get<RequestsJsonResponse>(
    `/api/exports/${encodeURIComponent(roomCode)}/export/json`
  )
  return data
}

export async function exportRequestsFile(
  roomCode: string,
  format: Exclude<ExportFormat, "txt">
) {
  const { data } = await apiClient.get<Blob>(
    `/api/exports/${encodeURIComponent(roomCode)}/export/${format}`,
    { responseType: "blob" }
  )
  return data
}

export function useExportTracklistJsonQuery(roomId: string) {
  return useQuery({
    queryKey: exportKeys.tracklistJson(roomId),
    queryFn: () => exportTracklistJson(roomId),
    enabled: roomId.length > 0,
  })
}

export function useExportRequestsJsonQuery(roomCode: string) {
  return useQuery({
    queryKey: exportKeys.requestsJson(roomCode),
    queryFn: () => exportRequestsJson(roomCode),
    enabled: roomCode.length > 0,
  })
}

import type { QueryClient } from "@tanstack/react-query"
import type { RequestStatus, SongRequest } from "./types"

export type RequestsResponse = { success: true; requests: SongRequest[] }
export type RequestAction = "vote" | "playing" | "played" | "delete"

export const requestKeys = {
  all: ["requests"] as const,
  byRoom: (roomId: string) => ["requests", "room", roomId] as const,
  detail: (requestId: string) => ["requests", "detail", requestId] as const,
  filter: (roomId: string, status?: RequestStatus) =>
    ["requests", "room", roomId, "filter", status ?? "all"] as const,
}

export function getSongRequestRoomId(request: SongRequest) {
  return typeof request.roomId === "string" ? request.roomId : request.roomId._id
}

export function sortRequestsForQueue(requests: SongRequest[]) {
  return [...requests].sort((a, b) =>
    b.votes - a.votes || Date.parse(a.createdAt) - Date.parse(b.createdAt) || a._id.localeCompare(b._id)
  )
}

export function upsertRequestInRoomCache(queryClient: QueryClient, request: SongRequest) {
  queryClient.setQueryData<RequestsResponse>(requestKeys.byRoom(getSongRequestRoomId(request)), (current) => ({
    success: true,
    requests: sortRequestsForQueue([
      ...(current?.requests ?? []).filter((item) => item._id !== request._id),
      request,
    ]),
  }))
}

export function removeRequestFromRoomCache(queryClient: QueryClient, roomId: string, requestId: string) {
  queryClient.setQueryData<RequestsResponse>(requestKeys.byRoom(roomId), (current) => current && ({
    ...current, requests: current.requests.filter((item) => item._id !== requestId),
  }))
}

// Save only the rows touched by this action, so a failed action cannot undo
// a successful change to another song while both requests are in flight.
export function optimisticallyUpdateRequest(queryClient: QueryClient, requestId: string, action: RequestAction) {
  const now = new Date().toISOString()
  const rollbacks: (() => void)[] = []
  for (const [key, data] of queryClient.getQueriesData<RequestsResponse>({ queryKey: ["requests", "room"] })) {
    if (key.length !== 3 || !data?.requests.some((item) => item._id === requestId)) continue
    const before = data.requests
    const next = before.flatMap((item): SongRequest[] => {
      if (item._id === requestId) {
        if (action === "delete") return []
        if (action === "vote") return [{ ...item, votes: item.votes + 1 }]
        if (action === "playing") return [{ ...item, status: "playing", playedAt: now, completedAt: null }]
        return [{ ...item, status: "played", playedAt: item.playedAt ?? now, completedAt: now }]
      }
      if (action === "playing" && item.status === "playing") {
        return [{ ...item, status: "played", completedAt: now }]
      }
      return [item]
    })
    queryClient.setQueryData(key, { ...data, requests: sortRequestsForQueue(next) })
    const changed = before.filter((item) => next.find((row) => row._id === item._id) !== item)
    rollbacks.push(() => queryClient.setQueryData<RequestsResponse>(key, (current) => {
      if (!current) return current
      let restored = [...current.requests]
      for (const original of changed) {
        const optimistic = next.find((item) => item._id === original._id)
        const present = restored.find((item) => item._id === original._id)
        if (!optimistic && !present) restored.push(original)
        else if (optimistic && present) {
          const row = { ...present }
          // Preserve fields that have since changed through another action.
          if (present.votes === optimistic.votes) row.votes = original.votes
          if (present.status === optimistic.status && present.playedAt === optimistic.playedAt && present.completedAt === optimistic.completedAt) {
            row.status = original.status
            row.playedAt = original.playedAt
            row.completedAt = original.completedAt
          }
          restored = restored.map((item) => item._id === row._id ? row : item)
        }
      }
      return { ...current, requests: sortRequestsForQueue(restored) }
    }))
  }
  return () => rollbacks.forEach((rollback) => rollback())
}

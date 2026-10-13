import { useEffect, useEffectEvent } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { roomKeys } from "@/api/rooms"
import { removeRequestFromRoomCache, requestKeys, upsertRequestInRoomCache } from "@/api/requests"
import type { SongRequest } from "@/api/types"
import {
  joinRoom,
  onReconnect,
  onRequestCreated,
  onRequestDeleted,
  onRequestPlayed,
  onRequestPlaying,
  onRequestUpdated,
  onRoomEnded,
  onRoomUpdated,
} from "@/lib/socket"

type RoomRealtimeOptions = {
  onRequestCreated?: (request: SongRequest) => void
  onRequestPlaying?: (request: SongRequest) => void
  onRoomEnded?: () => void
}

/**
 * Joins a room's live channel and keeps its room and request caches in sync with
 * socket events. Call once per page; the callbacks are for page-specific side effects.
 */
export function useRoomRealtime(roomId: string, roomCode: string, options: RoomRealtimeOptions = {}) {
  const queryClient = useQueryClient()
  const handleRequestCreated = useEffectEvent((request: SongRequest) => options.onRequestCreated?.(request))
  const handleRequestPlaying = useEffectEvent((request: SongRequest) => options.onRequestPlaying?.(request))
  const handleRoomEnded = useEffectEvent(() => options.onRoomEnded?.())

  useEffect(() => {
    if (!roomId) return

    const invalidateRoom = () => queryClient.invalidateQueries({ queryKey: roomKeys.detail(roomCode) })
    const invalidateRequests = () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.byRoom(roomId) })
      queryClient.invalidateQueries({ queryKey: roomKeys.requests(roomCode) })
    }
    // Our own in-flight mutations settle the cache themselves; skip echoes until then.
    const isMutating = () => queryClient.isMutating({ mutationKey: requestKeys.all }) > 0
    const syncRequest = (request: SongRequest) => {
      if (isMutating()) return
      upsertRequestInRoomCache(queryClient, request)
      invalidateRequests()
    }
    const forThisRoom = (callback: (request: SongRequest) => void) =>
      ({ roomId: eventRoomId, request }: { roomId: string; request: SongRequest }) => {
        if (eventRoomId === roomId) callback(request)
      }

    const unsubscribes = [
      joinRoom(roomId),
      onReconnect(() => { invalidateRoom(); invalidateRequests() }),
      onRoomUpdated(({ roomId: eventRoomId }) => { if (eventRoomId === roomId) invalidateRoom() }),
      onRoomEnded(({ roomId: eventRoomId }) => {
        if (eventRoomId !== roomId) return
        invalidateRoom()
        handleRoomEnded()
      }),
      onRequestCreated(forThisRoom((request) => { syncRequest(request); handleRequestCreated(request) })),
      onRequestUpdated(forThisRoom(syncRequest)),
      onRequestPlaying(forThisRoom((request) => { syncRequest(request); handleRequestPlaying(request) })),
      onRequestPlayed(forThisRoom(syncRequest)),
      onRequestDeleted(({ requestId }) => {
        if (isMutating()) return
        removeRequestFromRoomCache(queryClient, roomId, requestId)
        invalidateRequests()
      }),
    ]

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe())
  }, [queryClient, roomCode, roomId])
}

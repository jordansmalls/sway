import { io, type Socket } from "socket.io-client"

import { getSongRequestRoomId } from "@/api/requests"
import type { Room, SongRequest } from "@/api/types"
import { isDemoExperience } from "@/lib/demo-session"

export const socketEvents = {
  roomUpdated: "room:updated",
  roomEnded: "room:ended",
  requestCreated: "request:created",
  requestUpdated: "request:updated",
  requestPlaying: "request:playing",
  requestPlayed: "request:played",
  requestDeleted: "request:deleted",
} as const

export type RoomUpdatedPayload = Partial<Room> & {
  roomId?: string
  _id?: string
  roomName?: string
  roomDescription?: string
}

export type RoomEndedPayload = {
  roomId: string
}

export type RequestDeletedPayload = {
  requestId: string
}

export type RequestEventPayload = {
  roomId: string
  request: SongRequest
}

export type RoomEventPayload = {
  roomId: string
  room: RoomUpdatedPayload
}

export type ServerToClientEvents = {
  [socketEvents.roomUpdated]: (payload: RoomUpdatedPayload) => void
  [socketEvents.roomEnded]: (payload: RoomEndedPayload) => void
  [socketEvents.requestCreated]: (request: SongRequest) => void
  [socketEvents.requestUpdated]: (request: SongRequest) => void
  [socketEvents.requestPlaying]: (request: SongRequest) => void
  [socketEvents.requestPlayed]: (request: SongRequest) => void
  [socketEvents.requestDeleted]: (payload: RequestDeletedPayload) => void
}

export type ClientToServerEvents = {
  "join-room": (roomId: string) => void
  "leave-room": (roomId: string) => void
}

export type SwaySocket = Socket<ServerToClientEvents, ClientToServerEvents>

/** Same origin in dev (Vite proxies /socket.io); override with VITE_SOCKET_URL if needed. */
const socketUrl =
  import.meta.env.VITE_SOCKET_URL ??
  import.meta.env.VITE_API_URL ??
  (typeof window !== "undefined" ? window.location.origin : "/")

export const socket: SwaySocket = io(socketUrl, {
  autoConnect: false,
  withCredentials: true,
})

export function connectSocket() {
  if (!socket.connected) {
    socket.connect()
  }

  return socket
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect()
  }
}

/** Reference counts for rooms this client wants to receive events for. */
const joinedRooms = new Map<string, number>()

// Socket.IO drops room membership whenever the connection drops, so re-join
// every active room on each (re)connect, not just the first one.
socket.on("connect", () => {
  for (const roomId of joinedRooms.keys()) {
    socket.emit("join-room", roomId)
  }
})

/**
 * Join a room's live channel; returns cleanup that releases this reference.
 * Several components can hold the same room — the socket only leaves once the
 * last one releases it.
 */
export function joinRoom(roomId: string) {
  // Demo data refreshes through its isolated API; never join live room channels.
  if (isDemoExperience() || roomId.startsWith("demo-room-")) return () => {}

  const count = joinedRooms.get(roomId) ?? 0
  joinedRooms.set(roomId, count + 1)

  if (count === 0 && socket.connected) {
    socket.emit("join-room", roomId)
  }
  connectSocket()

  let released = false
  return () => {
    if (released) return
    released = true

    const remaining = (joinedRooms.get(roomId) ?? 1) - 1
    if (remaining > 0) {
      joinedRooms.set(roomId, remaining)
      return
    }

    joinedRooms.delete(roomId)
    if (socket.connected) {
      socket.emit("leave-room", roomId)
    }
  }
}

/** Fires after an automatic reconnect, when events may have been missed. */
export function onReconnect(callback: () => void) {
  socket.io.on("reconnect", callback)
  return () => {
    socket.io.off("reconnect", callback)
  }
}

function normalizeId(value: unknown): string | undefined {
  if (value == null) return undefined
  if (typeof value === "string") return value
  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    if (typeof record._id === "string") return record._id
    if (record._id != null) return normalizeId(record._id)
    if (typeof record.roomId === "string") return record.roomId
    if (record.roomId != null) return normalizeId(record.roomId)
    if (typeof record.$oid === "string") return record.$oid
    if (typeof (value as { toString?: () => string }).toString === "function") {
      const asString = (value as { toString: () => string }).toString()
      if (asString && asString !== "[object Object]") return asString
    }
  }
  return undefined
}

function extractRoomIdFromPayload(payload: RoomUpdatedPayload | RoomEndedPayload) {
  return normalizeId(payload.roomId ?? ("_id" in payload ? payload._id : undefined))
}

function parseRequestPayload(request: SongRequest): RequestEventPayload | null {
  const roomId =
    normalizeId(getSongRequestRoomId(request)) ?? normalizeId(request.roomId)
  if (!roomId || !request?._id) return null
  return { roomId, request }
}

export function onRoomUpdated(callback: (payload: RoomEventPayload) => void) {
  const handler = (payload: RoomUpdatedPayload) => {
    const roomId = extractRoomIdFromPayload(payload)
    if (!roomId) return

    callback({ roomId, room: { ...payload, roomId } })
  }

  socket.on(socketEvents.roomUpdated, handler)
  return () => socket.off(socketEvents.roomUpdated, handler)
}

export function onRoomEnded(callback: (payload: RoomEndedPayload) => void) {
  const handler = (payload: RoomEndedPayload) => {
    const roomId = extractRoomIdFromPayload(payload)
    if (!roomId) return

    callback({ roomId })
  }

  socket.on(socketEvents.roomEnded, handler)
  return () => socket.off(socketEvents.roomEnded, handler)
}

export function onRequestCreated(
  callback: (payload: RequestEventPayload) => void
) {
  return onRequestEvent(socketEvents.requestCreated, callback)
}

export function onRequestUpdated(
  callback: (payload: RequestEventPayload) => void
) {
  return onRequestEvent(socketEvents.requestUpdated, callback)
}

export function onRequestPlaying(
  callback: (payload: RequestEventPayload) => void
) {
  return onRequestEvent(socketEvents.requestPlaying, callback)
}

export function onRequestPlayed(
  callback: (payload: RequestEventPayload) => void
) {
  return onRequestEvent(socketEvents.requestPlayed, callback)
}

export function onRequestDeleted(callback: (payload: RequestDeletedPayload) => void) {
  const handler = (payload: RequestDeletedPayload) => {
    const requestId = normalizeId(payload?.requestId)
    if (!requestId) return

    callback({ requestId })
  }

  socket.on(socketEvents.requestDeleted, handler)
  return () => socket.off(socketEvents.requestDeleted, handler)
}

type RequestEventName =
  | typeof socketEvents.requestCreated
  | typeof socketEvents.requestUpdated
  | typeof socketEvents.requestPlaying
  | typeof socketEvents.requestPlayed

function onRequestEvent(
  event: RequestEventName,
  callback: (payload: RequestEventPayload) => void
) {
  const handler = (request: SongRequest) => {
    const payload = parseRequestPayload(request)
    if (!payload) return

    callback(payload)
  }

  socket.on(event, handler)
  return () => socket.off(event, handler)
}

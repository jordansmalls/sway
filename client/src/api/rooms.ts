import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { apiClient } from "@/api/client"
import type { ApiMessageResponse, QueueRequest, Room } from "@/api/types"
import { userKeys } from "@/api/users"

type CreateRoomResponse = {
  success: true
  message: string
  newRoom: Room
}

type UpdateRoomResponse = {
  success: true
  message: string
  updatedRoom: Room
}

type JoinRoomResponse = {
  success: true
  roomDetails: Pick<
    Room,
    "_id" | "roomName" | "roomDescription" | "roomCode" | "createdAt"
  >
}

type DeleteRoomResponse = {
  success: true
  message: string
  room: Room
}

type RoomDetailsResponse = {
  success: true
  message: string
  roomDetails: Room
}

type RoomRequestsResponse = {
  success: true
  message?: string
  data: QueueRequest[]
}

export type CreateRoomInput = {
  roomName: string
  roomDescription: string
}

export type UpdateRoomInput = {
  roomId: string
  roomName?: string
  roomDescription?: string
}

export type JoinRoomInput = {
  roomCode: string
}

export type EndRoomInput = {
  roomId: string
}

export type DeleteRoomInput = {
  roomId: string
  userId: string
}

export const roomKeys = {
  all: ["rooms"] as const,
  detail: (roomCode: string) => [...roomKeys.all, "detail", roomCode] as const,
  requests: (roomCode: string) =>
    [...roomKeys.all, roomCode, "requests"] as const,
  playedSpotify: (roomCode: string) =>
    [...roomKeys.all, roomCode, "spotify", "played"] as const,
}

export async function createRoom(input: CreateRoomInput) {
  const { data } = await apiClient.post<CreateRoomResponse>("/api/rooms", input)
  return data
}

export async function updateRoom({
  roomId,
  ...input
}: UpdateRoomInput) {
  const { data } = await apiClient.put<UpdateRoomResponse>(
    `/api/rooms/${encodeURIComponent(roomId)}`,
    input
  )
  return data
}

export async function joinRoom(input: JoinRoomInput) {
  const { data } = await apiClient.post<JoinRoomResponse>(
    "/api/rooms/join",
    input
  )
  return data
}

export async function endRoom(input: EndRoomInput) {
  const { data } = await apiClient.put<ApiMessageResponse>(
    "/api/rooms/end",
    input
  )
  return data
}

export async function deleteRoom({ roomId, userId }: DeleteRoomInput) {
  const { data } = await apiClient.delete<DeleteRoomResponse>(
    `/api/rooms/${encodeURIComponent(roomId)}`,
    { data: { userId } }
  )
  return data
}

export async function getRoomDetails(roomCode: string) {
  const { data } = await apiClient.get<RoomDetailsResponse>(
    `/api/rooms/${encodeURIComponent(roomCode)}`
  )
  return data
}

export async function getRoomRequests(roomCode: string) {
  const { data } = await apiClient.get<RoomRequestsResponse>(
    `/api/rooms/${encodeURIComponent(roomCode)}/fetch/requests`
  )
  return data
}

export async function getPlayedSpotifyRequests(roomCode: string) {
  const { data } = await apiClient.get<RoomRequestsResponse>(
    `/api/rooms/${encodeURIComponent(roomCode)}/fetch/spotify/played`
  )
  return data
}

export function useCreateRoomMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useUpdateRoomMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateRoom,
    onSuccess: (data) => {
      queryClient.setQueryData(roomKeys.detail(data.updatedRoom.roomCode), {
        success: true,
        message: data.message,
        roomDetails: data.updatedRoom,
      })
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useJoinRoomMutation() {
  return useMutation({
    mutationFn: joinRoom,
  })
}

export function useEndRoomMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: endRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useDeleteRoomMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useRoomDetailsQuery(roomCode: string) {
  return useQuery({
    queryKey: roomKeys.detail(roomCode),
    queryFn: () => getRoomDetails(roomCode),
    enabled: roomCode.length > 0,
  })
}

export function useRoomRequestsQuery(roomCode: string) {
  return useQuery({
    queryKey: roomKeys.requests(roomCode),
    queryFn: () => getRoomRequests(roomCode),
    enabled: roomCode.length > 0,
  })
}

export function usePlayedSpotifyRequestsQuery(roomCode: string) {
  return useQuery({
    queryKey: roomKeys.playedSpotify(roomCode),
    queryFn: () => getPlayedSpotifyRequests(roomCode),
    enabled: roomCode.length > 0,
  })
}

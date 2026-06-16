import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { apiClient } from "@/api/client"
import type { ApiMessageResponse, Room, User } from "@/api/types"

type UserResponse = {
  success: true
  message?: string
  user: User
}

type CurrentUserResponse = {
  success: true
  user: User
}

type ActiveRoomResponse = {
  success: true
  activeRoom: Room | null
}

type ActiveRoomStatusResponse = {
  success: true
  hasActiveRoom: boolean
}

type InactiveRoomsResponse = {
  success: true
  inactiveRooms: Room[]
}

type fetchUserIdResponse = {
  success: true
  userId: string
}

export type UpdateProfileInput = {
  username?: string
  email?: string
}

export type UpdatePasswordInput = {
  currentPassword: string
  newPassword: string
}

export const userKeys = {
  all: ["users"] as const,
  me: () => [...userKeys.all, "me"] as const,
  activeRoom: (userId: string) =>
    [...userKeys.all, userId, "rooms", "active"] as const,
  userId: (username: string) => [...userKeys.all, username, "id"] as const,
  activeRoomStatus: (userId: string) =>
    [...userKeys.all, userId, "has-active-room"] as const,
  inactiveRooms: (userId: string) =>
    [...userKeys.all, userId, "inactive-rooms"] as const,
}

export async function getCurrentUser() {
  const { data } = await apiClient.get<CurrentUserResponse>("/api/users/me")
  return data
}

export async function updateProfile(input: UpdateProfileInput) {
  const { data } = await apiClient.put<UserResponse>(
    "/api/users/profile",
    input
  )
  return data
}

export async function updatePassword(input: UpdatePasswordInput) {
  const { data } = await apiClient.post<ApiMessageResponse>(
    "/api/users/password",
    input
  )
  return data
}

export async function deleteAccount() {
  const { data } = await apiClient.delete<ApiMessageResponse>(
    "/api/users/profile"
  )
  return data
}

export async function getActiveRoom(userId: string) {
  const { data } = await apiClient.get<ActiveRoomResponse>(
    `/api/users/${encodeURIComponent(userId)}/rooms/active`
  )
  return data
}

export async function getActiveRoomStatus(userId: string) {
  const { data } = await apiClient.get<ActiveRoomStatusResponse>(
    `/api/users/${encodeURIComponent(userId)}/has-active-room`
  )
  return data
}

export async function getInactiveRooms(userId: string) {
  const { data } = await apiClient.get<InactiveRoomsResponse>(
    `/api/users/${encodeURIComponent(userId)}/inactive`
  )
  return data
}

export async function fetchUserId(username: string) {
  const { data } = await apiClient.get<fetchUserIdResponse>(
    `/api/users/${encodeURIComponent(username)}/id`
  )
  return data
}

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useUpdatePasswordMutation() {
  return useMutation({
    mutationFn: updatePassword,
  })
}

export function useDeleteAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => queryClient.clear(),
  })
}

export function useActiveRoomQuery(
  userId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: userKeys.activeRoom(userId),
    queryFn: () => getActiveRoom(userId),
    enabled: (options?.enabled ?? true) && userId.length > 0,
  })
}

export function useActiveRoomStatusQuery(userId: string) {
  return useQuery({
    queryKey: userKeys.activeRoomStatus(userId),
    queryFn: () => getActiveRoomStatus(userId),
    enabled: userId.length > 0,
  })
}

export function useInactiveRoomsQuery(userId: string) {
  return useQuery({
    queryKey: userKeys.inactiveRooms(userId),
    queryFn: () => getInactiveRooms(userId),
    enabled: userId.length > 0,
  })
}

export function useFetchUserIdQuery(username: string) {
  return useQuery({
    queryKey: userKeys.userId(username),
    queryFn: () => fetchUserId(username),
    enabled: username.length > 0,
  })
}
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { apiClient } from "@/api/client"
import type { ApiMessageResponse, User } from "@/api/types"
import { userKeys } from "@/api/users"
import { useAuthStore } from "@/stores/auth-store"

export type AuthUser = User

type AuthResponse = {
  success: true
  message: string
  user: AuthUser
}

type AvailabilityResponse = {
  success: true
  taken: boolean
  message: string
}

export type SignupInput = {
  email: string
  password: string
}

export type LoginInput = {
  identifier: string
  password: string
}

export type CreateUsernameInput = {
  username: string
}

export const authKeys = {
  all: ["auth"] as const,
  emailAvailability: (email: string) =>
    [...authKeys.all, "email", email] as const,
  usernameAvailability: (username: string) =>
    [...authKeys.all, "username", username] as const,
}

export async function signup(input: SignupInput) {
  const { data } = await apiClient.post<AuthResponse>("/api/auth", input)
  return data
}

export async function login(input: LoginInput) {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/login", input)
  return data
}

export async function createUsername(input: CreateUsernameInput) {
  const { data } = await apiClient.post<AuthResponse>(
    "/api/auth/username",
    input
  )
  return data
}

export async function logout() {
  const { data } = await apiClient.post<ApiMessageResponse>("/api/auth/logout")
  return data
}

export async function checkEmailAvailability(email: string) {
  const { data } = await apiClient.get<AvailabilityResponse>(
    `/api/auth/email/${encodeURIComponent(email)}`
  )
  return data
}

export async function checkUsernameAvailability(username: string) {
  const { data } = await apiClient.get<AvailabilityResponse>(
    `/api/auth/username/${encodeURIComponent(username)}`
  )
  return data
}

export function useSignupMutation() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)

  return useMutation({
    mutationFn: signup,
    onSuccess: ({ user }) => {
      setUser(user)
      queryClient.setQueryData(userKeys.me(), { success: true, user })
    },
  })
}

export function useLoginMutation() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)

  return useMutation({
    mutationFn: login,
    onSuccess: ({ user }) => {
      setUser(user)
      queryClient.setQueryData(userKeys.me(), { success: true, user })
    },
  })
}

export function useCreateUsernameMutation() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)

  return useMutation({
    mutationFn: createUsername,
    onSuccess: ({ user }) => {
      setUser(user)
      queryClient.setQueryData(userKeys.me(), { success: true, user })
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useLogoutMutation() {
  const queryClient = useQueryClient()
  const clearUser = useAuthStore((state) => state.clearUser)

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearUser()
      queryClient.clear()
    },
  })
}

export function useEmailAvailabilityQuery(email: string) {
  return useQuery({
    queryKey: authKeys.emailAvailability(email),
    queryFn: () => checkEmailAvailability(email),
    enabled: email.length > 0,
  })
}

export function useUsernameAvailabilityQuery(username: string) {
  return useQuery({
    queryKey: authKeys.usernameAvailability(username),
    queryFn: () => checkUsernameAvailability(username),
    enabled: username.length > 0,
  })
}

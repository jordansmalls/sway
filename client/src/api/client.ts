import axios from "axios"
import { activeDemoToken, isDemoExperience } from "@/lib/demo-session"

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  withCredentials: true,
})

// Existing room components use the sandbox's matching API contracts in demo routes.
// Fail closed if the token is missing; never fall back to a real account cookie.
apiClient.interceptors.request.use((config) => {
  if (isDemoExperience()) {
    const token = activeDemoToken()
    if (!token) throw new Error("Start a demo before opening a demo room.")
    config.url = `/api/demo${config.url}`
    config.headers.set("X-Demo-Token", token)
    config.withCredentials = false
  }
  return config
}, (error) => { throw error }, { synchronous: true })

apiClient.interceptors.response.use((response) => response, (error) => {
  if (error.config?.url?.startsWith("/api/demo/") && [401, 410].includes(error.response?.status)) {
    window.dispatchEvent(new Event("sway:demo-expired"))
  }
  return Promise.reject(error)
})

type ApiErrorResponse = {
  message?: string
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
) {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

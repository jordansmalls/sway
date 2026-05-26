import { useAuthStore } from "@/stores/auth-store"
import LogoutButton from "@/components/buttons/logout-button"

export default function Dashboard() {
  const user = useAuthStore((state) => state.user)
  return (
    <>
      <h1>Dashboard</h1>
      <p>Hello, {user?.username}!</p>

      <LogoutButton />
    </>
  )
}
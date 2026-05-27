import { useAuthStore } from "@/stores/auth-store"
import LogoutButton from "@/components/buttons/logout-button"
import { useNavigate } from "react-router-dom"
import { Button } from "../components/ui/button"

export default function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()

  const hn = () => {
    navigate("/create-room")
  }
  return (
    <>
      <h1>Dashboard</h1>
      <p>Hello, {user?.username}!</p>
      <LogoutButton />
      <Button onClick={hn}>Create Room</Button>
    </>
  )
}
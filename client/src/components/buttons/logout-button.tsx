import { useNavigate } from "react-router-dom"

import { Button } from "../ui/button"
import { useLogoutMutation } from "@/api/auth"

export default function LogoutButton() {
  const navigate = useNavigate()

  const {
    mutateAsync: logout,
    isPending,
  } = useLogoutMutation()

  const handleLogout = async () => {
    try {
      await logout()

      navigate("/login", { replace: true })
    } catch (err) {
      console.error("There was an error attempting to log out:", err)

      alert("Oops! Something went wrong, please try again.")
    }
  }

  return (
    <Button
      onClick={handleLogout}
      disabled={isPending}
    >
      {isPending ? "Logging out..." : "Logout"}
    </Button>
  )
}
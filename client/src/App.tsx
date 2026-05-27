import { Outlet } from "react-router-dom"
import { Toaster } from "sonner"

export default function App(){
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Toaster />
      <Outlet />
    </main>
  )
}


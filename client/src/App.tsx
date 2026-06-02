import { Outlet } from "react-router-dom"
import { Toaster } from "sonner"
import { TooltipProvider } from "./components/ui/tooltip"

export default function App(){
  return (
    <main className="min-h-screen bg-background text-foreground">
      <TooltipProvider>
        <Toaster />
        <Outlet />
      </TooltipProvider>
    </main>
  );
}


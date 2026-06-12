import { Outlet } from "react-router-dom"
import { Toaster } from "sonner"
import { TooltipProvider } from "./components/ui/tooltip"
import { ThemeProvider } from "./components/theme/theme-provider";

export default function App(){
  return (
    <main className="min-h-screen bg-background text-foreground">
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Outlet />
        </TooltipProvider>
      </ThemeProvider>
    </main>
  );
}


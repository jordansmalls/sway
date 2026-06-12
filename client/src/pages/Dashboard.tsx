import { useAuthStore } from "@/stores/auth-store"
import { useNavigate } from "react-router-dom"
import { Button } from "../components/ui/button"
import { AppSidebar } from "../components/sidebar/app-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "../components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from '../components/ui/breadcrumb';
import { Separator } from '../components/ui/separator';



export default function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()

  const hn = () => {
    navigate("/create-room")
  }
  return (
    <>
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <section>
            <h1 className="text-center font-bold text-4xl mt-[4rem]">
              Welcome Back, {user?.username}.
            </h1>
            <p className="text-center mt-[1rem]">
              What are you getting into today?
            </p>
            <div className="flex justify-center mt-4">
              <Button onClick={hn}>Create Room</Button>
            </div>
          </section>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}

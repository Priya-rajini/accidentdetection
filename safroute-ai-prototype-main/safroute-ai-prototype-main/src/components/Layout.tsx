import { ReactNode } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import { AppSidebar } from "@/components/Sidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col w-full">
          <header className="sticky top-0 z-10">
            <DashboardHeader>
              <SidebarTrigger className="ml-2" />
            </DashboardHeader>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Layout;

import { Bell, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ReactNode } from "react";

interface DashboardHeaderProps {
  children?: ReactNode;
}

const DashboardHeader = ({ children }: DashboardHeaderProps = {}) => {
  return (
    <div className="w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {children}
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              SafeRoute AI
            </h1>
            <p className="text-xs text-muted-foreground">Accident Detection System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Bell className="h-5 w-5 text-foreground cursor-pointer hover:text-primary transition-colors" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] animate-pulse-alert"
            >
              3
            </Badge>
          </div>
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium hidden sm:inline">Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;

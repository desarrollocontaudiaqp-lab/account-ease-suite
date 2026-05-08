import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Bell, Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
export function AppLayout() {
  const {
    user,
    role
  } = useAuth();
  const [profile, setProfile] = useState<{
    full_name: string | null;
  } | null>(null);
  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const {
          data
        } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        setProfile(data);
      }
    };
    fetchProfile();
  }, [user?.id]);
  const currentDate = new Date().toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const roleDisplay = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Usuario';
  return <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Modern Header */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border/50 px-4 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-lg ml-12 lg:ml-0">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input type="search" placeholder="Buscar clientes, contratos, proformas..." className="pl-11 pr-4 h-11 bg-muted/50 border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:bg-background transition-all" />
                <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:inline-flex h-6 items-center gap-1 rounded-md border border-border bg-muted px-2 text-xs text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 lg:gap-4">
              {/* Date Display */}
              <div className="hidden xl:flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50">
                <div className="h-2 w-2 rounded-full bg-status-completed animate-pulse" />
                <span className="text-sm text-muted-foreground capitalize">
                  {currentDate}
                </span>
              </div>

              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative h-11 w-11 rounded-xl hover:bg-muted">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-destructive rounded-full ring-2 ring-card animate-pulse" />
              </Button>

              {/* User Dropdown */}
              <Button variant="ghost" className="hidden md:flex items-center gap-2 h-11 px-3 rounded-xl hover:bg-muted">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{roleDisplay}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto px-0 py-0">
          <Outlet />
        </main>
      </div>
    </div>;
}
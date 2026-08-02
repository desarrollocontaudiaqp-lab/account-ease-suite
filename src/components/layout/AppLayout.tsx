import { Outlet, useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Bell, Search, ChevronDown, Building2, Repeat, LogOut, User as UserIcon, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlobalSearch } from "./GlobalSearch";
import { useContractAlerts } from "@/hooks/useContractAlerts";
import { useSedeContext } from "@/hooks/useSedeContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { clearStoredActiveSedeId } from "@/lib/activeSede";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
export function AppLayout() {
  const {
    user,
    role,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const { availableSedes, activeSedeId } = useSedeContext();
  const { contracts: alertContracts } = useContractAlerts();
  const alertCount = alertContracts.length;
  const sedeNombre = activeSedeId
    ? availableSedes.find((s) => s.id === activeSedeId)?.nombre
    : availableSedes.length === 1
      ? availableSedes[0].nombre
      : null;
  const handleChangeSede = async () => {
    clearStoredActiveSedeId();
    await supabase.auth.signOut();
    navigate('/auth');
  };
  const handleSignOut = async () => {
    clearStoredActiveSedeId();
    await signOut();
    navigate('/auth');
  };
  const [profile, setProfile] = useState<{
    full_name: string | null;
  } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
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
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="relative group w-full text-left"
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <div className="pl-11 pr-4 h-11 bg-muted/50 border-0 rounded-xl flex items-center text-sm text-muted-foreground hover:bg-muted transition-all">
                  Buscar clientes, contratos, proformas...
                </div>
                <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:inline-flex h-6 items-center gap-1 rounded-md border border-border bg-muted px-2 text-xs text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </button>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-11 w-11 rounded-xl hover:bg-muted"
                    aria-label={`Notificaciones${alertCount ? `: ${alertCount} contratos por vencer` : ""}`}
                  >
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {alertCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold ring-2 ring-card">
                        {alertCount > 99 ? "99+" : alertCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Vencimientos de contrato</span>
                    <span className="text-xs font-normal text-muted-foreground">{alertCount}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {alertCount === 0 ? (
                    <DropdownMenuItem disabled className="cursor-default text-sm">
                      No hay contratos próximos a vencer
                    </DropdownMenuItem>
                  ) : (
                    alertContracts.slice(0, 5).map((c) => (
                      <DropdownMenuItem
                        key={c.id}
                        onClick={() => navigate("/alertas")}
                        className="cursor-pointer flex-col items-start gap-0.5"
                      >
                        <span className="text-sm font-medium flex items-center gap-1">
                          {c.diasRestantes <= 0 && (
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                          )}
                          {c.numero}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-full">
                          {c.cliente} ·{" "}
                          {c.diasRestantes < 0
                            ? `vencido hace ${Math.abs(c.diasRestantes)} días`
                            : c.diasRestantes === 0
                              ? "vence hoy"
                              : `vence en ${c.diasRestantes} días`}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/alertas")} className="cursor-pointer text-sm font-medium text-primary">
                    Ver todas las alertas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sede Badge + Cambiar Sede */}
              {sedeNombre && (
                <div className="hidden sm:flex items-center gap-1 pl-2 pr-1 py-1 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground max-w-[140px] truncate">
                    {sedeNombre}
                  </span>
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleChangeSede}
                          className="h-7 w-7 rounded-lg hover:bg-primary/15"
                          aria-label="Cambiar sede"
                        >
                          <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Cambiar sede</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
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
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{displayName}</span>
                      <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled className="cursor-default">
                    <UserIcon className="h-4 w-4 mr-2" />
                    {roleDisplay}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto px-0 py-0">
          <Outlet />
        </main>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>;
}
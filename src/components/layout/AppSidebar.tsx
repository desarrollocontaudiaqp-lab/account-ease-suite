import { useState, useEffect, createContext, useContext } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  FileCheck,
  UserCheck,
  Briefcase,
  Calendar,
  Workflow,
  BarChart3,
  Settings,
  Shield,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  LogOut,
  HelpCircle,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import logo from "@/assets/logo-ca.png";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Create context for sidebar collapsed state
interface AppSidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

const AppSidebarContext = createContext<AppSidebarContextType>({
  isCollapsed: false,
  setIsCollapsed: () => {},
});

export const useAppSidebar = () => useContext(AppSidebarContext);

interface SidebarItem {
  title: string;
  icon: React.ElementType;
  path: string;
  children?: { title: string; path: string }[];
}

const menuItems: SidebarItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Clientes", icon: Users, path: "/clientes" },
  { title: "Proformas", icon: FileText, path: "/proformas" },
  { title: "Contratos", icon: FileCheck, path: "/contratos" },
  { title: "Asignaciones", icon: UserCheck, path: "/asignaciones" },
  { title: "Carteras", icon: Briefcase, path: "/carteras" },
  { title: "Calendario Pagos", icon: Calendar, path: "/calendario-pagos" },
  { title: "WorkFlow", icon: Workflow, path: "/calendario-trabajo" },
  {
    title: "Reportes",
    icon: BarChart3,
    path: "/reportes",
    children: [
      { title: "Todos los Clientes", path: "/reportes/clientes" },
      { title: "Avance por Contrato", path: "/reportes/avance-contrato" },
      { title: "Avance por Asesor", path: "/reportes/avance-asesor" },
      { title: "Avance por Cartera", path: "/reportes/avance-cartera" },
    ],
  },
  { title: "Usuarios", icon: Shield, path: "/usuarios" },
  { title: "Configuración", icon: Settings, path: "/configuracion" },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Reportes"]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
    };
    fetchProfile();
  }, [user?.id]);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const roleDisplay = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Usuario';

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (item: SidebarItem) =>
    item.children?.some((child) => location.pathname === child.path);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar relative">
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute z-50 h-6 w-6 rounded-md bg-sidebar-accent flex items-center justify-center text-sidebar-foreground hover:bg-sidebar-accent/80 transition-colors",
          isCollapsed ? "top-3 right-2" : "-right-3 top-6 rounded-full border border-sidebar-foreground/20 shadow-sm"
        )}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Logo Section */}
      <div className={cn(
        "transition-all duration-300 flex items-center p-4",
        isCollapsed ? "justify-center" : "px-6"
      )}>
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <img
              src={logo}
              alt="C&A Contadores y Auditores"
              className="h-10 w-auto object-contain drop-shadow-lg"
            />
          </div>
          <div className={cn(
            "flex flex-col overflow-hidden transition-all duration-300",
            isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}>
            <span className="text-base font-bold text-sidebar-foreground tracking-tight whitespace-nowrap">
              Contadores
            </span>
            <span className="text-sm text-sidebar-foreground/70 font-medium whitespace-nowrap">
              & Auditores
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className={cn(
        "h-px bg-sidebar-foreground/20 transition-all duration-300",
        isCollapsed ? "mx-2" : "mx-4"
      )} />

      {/* Navigation */}
      <nav className={cn(
        "flex-1 overflow-y-auto scrollbar-modern transition-all duration-300",
        isCollapsed ? "px-2 py-3 space-y-1" : "p-4 space-y-1"
      )}>
        <p className={cn(
          "px-4 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider transition-all duration-300 overflow-hidden whitespace-nowrap",
          isCollapsed ? "hidden" : "block"
        )}>
          Menú Principal
        </p>
        {menuItems.slice(0, 8).map((item, index) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedItems.includes(item.title);
          const active = isActive(item.path) || isParentActive(item);

          return (
            <div key={item.title} className={`animate-slide-up stagger-${index + 1}`}>
              {hasChildren && !isCollapsed ? (
                <>
                  <button
                    onClick={() => toggleExpand(item.title)}
                    className={cn(
                      "sidebar-item w-full justify-between",
                      active && "sidebar-item-active"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="text-sm font-medium">{item.title}</span>
                    </div>
                    <ChevronDown 
                      className={cn(
                        "h-4 w-4 transition-transform duration-300",
                        isExpanded && "rotate-180"
                      )} 
                    />
                  </button>
                  <div className={cn(
                    "ml-4 pl-4 border-l border-sidebar-foreground/10 space-y-1 overflow-hidden transition-all duration-300",
                    isExpanded ? "max-h-48 opacity-100 mt-1" : "max-h-0 opacity-0"
                  )}>
                    {item.children?.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={() => setIsMobileOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "block px-4 py-2 rounded-lg text-sm transition-all duration-200",
                            isActive
                              ? "bg-sidebar-accent/60 text-sidebar-foreground font-medium"
                              : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                          )
                        }
                      >
                        {child.title}
                      </NavLink>
                    ))}
                  </div>
                </>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.path}
                      onClick={() => setIsMobileOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "sidebar-item",
                          isActive && "sidebar-item-active"
                        )
                      }
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className={cn(
                        "text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300",
                        isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                      )}>
                        {item.title}
                      </span>
                    </NavLink>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right" className="font-medium">
                      {item.title}
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
            </div>
          );
        })}

        {/* Admin Section */}
        <div className="pt-3">
          <p className={cn(
            "px-4 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider whitespace-nowrap overflow-hidden transition-all duration-300",
            isCollapsed ? "opacity-0 h-0 py-0" : "opacity-100"
          )}>
            Administración
          </p>
          {menuItems.slice(8).map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={({ isActive }) =>
                      cn("sidebar-item", isActive && "sidebar-item-active")
                    }
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className={cn(
                      "text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300",
                      isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                    )}>
                      {item.title}
                    </span>
                  </NavLink>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" className="font-medium">
                    {item.title}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 space-y-3">
        {/* Help Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="sidebar-item w-full text-sidebar-foreground/60 hover:text-sidebar-foreground">
              <HelpCircle className="h-5 w-5 flex-shrink-0" />
              <span className={cn(
                "text-sm whitespace-nowrap overflow-hidden transition-all duration-300",
                isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}>
                Centro de Ayuda
              </span>
            </button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" className="font-medium">
              Centro de Ayuda
            </TooltipContent>
          )}
        </Tooltip>

        {/* Divider */}
        <div className={cn(
          "h-px bg-sidebar-foreground/20 transition-all duration-300",
          isCollapsed ? "opacity-0" : "opacity-100"
        )} />

        {/* User Profile */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-3 rounded-xl transition-all duration-300",
              isCollapsed ? "justify-center p-2" : "p-3 bg-sidebar-accent/30 border border-sidebar-foreground/10"
            )}>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sidebar-primary to-secondary flex items-center justify-center text-sidebar-primary-foreground text-sm font-bold shadow-lg flex-shrink-0">
                {initials}
              </div>
              <div className={cn(
                "flex-1 min-w-0 overflow-hidden transition-all duration-300",
                isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}>
                <p className="text-sm font-semibold text-sidebar-foreground truncate">
                  {displayName}
                </p>
                <p className="text-xs text-sidebar-foreground/60">{roleDisplay}</p>
              </div>
              <button 
                onClick={handleSignOut}
                className={cn(
                  "p-2 rounded-lg hover:bg-sidebar-accent/50 transition-all duration-300",
                  isCollapsed ? "hidden" : "block"
                )}
              >
                <LogOut className="h-4 w-4 text-sidebar-foreground/60" />
              </button>
            </div>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" className="font-medium">
              {displayName}
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl transition-all"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <AppSidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
        <aside
          className={cn(
            "fixed lg:static inset-y-0 left-0 z-40 transform transition-all duration-300 ease-out lg:translate-x-0 shadow-2xl lg:shadow-none",
            isCollapsed ? "w-16" : "w-72",
            isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <SidebarContent />
        </aside>
      </AppSidebarContext.Provider>
    </>
  );
}

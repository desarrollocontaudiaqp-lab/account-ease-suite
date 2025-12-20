import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  FileCheck,
  UserCheck,
  Briefcase,
  Calendar,
  CalendarDays,
  BarChart3,
  Settings,
  Shield,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LogOut,
  HelpCircle,
} from "lucide-react";
import logo from "@/assets/logo-ca.png";
import { cn } from "@/lib/utils";

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
  { title: "Calendario Trabajo", icon: CalendarDays, path: "/calendario-trabajo" },
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
  const [expandedItems, setExpandedItems] = useState<string[]>(["Reportes"]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (item: SidebarItem) =>
    item.children?.some((child) => location.pathname === child.path);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95">
      {/* Logo Section */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={logo}
              alt="C&A Contadores y Auditores"
              className="h-14 w-auto object-contain drop-shadow-lg"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-sidebar-foreground tracking-tight">
              Contadores
            </span>
            <span className="text-sm text-sidebar-foreground/70 font-medium">
              & Auditores
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-sidebar-foreground/20 to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-modern">
        <p className="px-4 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
          Menú Principal
        </p>
        {menuItems.slice(0, 8).map((item, index) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedItems.includes(item.title);
          const active = isActive(item.path) || isParentActive(item);

          return (
            <div key={item.title} className={`animate-slide-up stagger-${index + 1}`}>
              {hasChildren ? (
                <>
                  <button
                    onClick={() => toggleExpand(item.title)}
                    className={cn(
                      "sidebar-item w-full justify-between",
                      active && "sidebar-item-active"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
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
                <NavLink
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    cn("sidebar-item", isActive && "sidebar-item-active")
                  }
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.title}</span>
                </NavLink>
              )}
            </div>
          );
        })}

        {/* Admin Section */}
        <div className="pt-4">
          <p className="px-4 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            Administración
          </p>
          {menuItems.slice(8).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  cn("sidebar-item", isActive && "sidebar-item-active")
                }
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.title}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 space-y-3">
        {/* Help Button */}
        <button className="sidebar-item w-full text-sidebar-foreground/60 hover:text-sidebar-foreground">
          <HelpCircle className="h-5 w-5" />
          <span className="text-sm">Centro de Ayuda</span>
        </button>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-sidebar-foreground/20 to-transparent" />

        {/* User Profile */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-sidebar-accent/40 to-sidebar-accent/20 border border-sidebar-foreground/10">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sidebar-primary to-secondary flex items-center justify-center text-sidebar-primary-foreground text-sm font-bold shadow-lg">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">
              Juan Díaz
            </p>
            <p className="text-xs text-sidebar-foreground/60">Administrador</p>
          </div>
          <button className="p-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors">
            <LogOut className="h-4 w-4 text-sidebar-foreground/60" />
          </button>
        </div>
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
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-72 transform transition-transform duration-300 ease-out lg:translate-x-0 shadow-2xl lg:shadow-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}

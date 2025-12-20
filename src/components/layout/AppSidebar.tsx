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
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
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
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="Contadores y Auditores"
            className="h-12 w-auto object-contain brightness-0 invert opacity-90"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">
              Contadores
            </span>
            <span className="text-xs text-sidebar-foreground/70">
              & Auditores
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedItems.includes(item.title);
          const active = isActive(item.path) || isParentActive(item);

          return (
            <div key={item.title}>
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
                      <span className="text-sm">{item.title}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="ml-8 mt-1 space-y-1 animate-fade-in">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          onClick={() => setIsMobileOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              "block px-3 py-2 rounded-lg text-sm transition-colors duration-200",
                              isActive
                                ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                            )
                          }
                        >
                          {child.title}
                        </NavLink>
                      ))}
                    </div>
                  )}
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
                  <span className="text-sm">{item.title}</span>
                </NavLink>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/30">
          <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-sm font-medium">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              Juan Díaz
            </p>
            <p className="text-xs text-sidebar-foreground/60">Administrador</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-primary text-primary-foreground shadow-lg"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}

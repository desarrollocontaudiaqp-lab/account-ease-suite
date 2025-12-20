import { Button } from "@/components/ui/button";
import {
  UserPlus,
  FileText,
  FileCheck,
  UserCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface QuickAction {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  gradient: string;
  iconBg: string;
}

const actions: QuickAction[] = [
  {
    title: "Nuevo Cliente",
    description: "Registrar prospecto",
    icon: UserPlus,
    path: "/clientes/nuevo",
    gradient: "from-primary to-primary/80",
    iconBg: "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white",
  },
  {
    title: "Nueva Proforma",
    description: "Crear cotización",
    icon: FileText,
    path: "/proformas/nueva",
    gradient: "from-secondary to-secondary/80",
    iconBg: "bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white",
  },
  {
    title: "Nuevo Contrato",
    description: "Registrar contrato",
    icon: FileCheck,
    path: "/contratos/nuevo",
    gradient: "from-emerald-500 to-emerald-600",
    iconBg: "bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white",
  },
  {
    title: "Asignar Trabajo",
    description: "Asignar a asesor",
    icon: UserCheck,
    path: "/asignaciones/nueva",
    gradient: "from-violet-500 to-purple-600",
    iconBg: "bg-violet-500/10 text-violet-600 group-hover:bg-violet-500 group-hover:text-white",
  },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-6 animate-slide-up shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          Acciones Rápidas
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={action.title}
              onClick={() => navigate(action.path)}
              className={cn(
                "group flex items-center gap-4 p-4 rounded-xl border border-border/50",
                "bg-gradient-to-r from-transparent to-transparent",
                "hover:from-muted/50 hover:to-muted/30 hover:border-border",
                "transition-all duration-300 text-left"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={cn(
                "p-3 rounded-xl transition-all duration-300",
                action.iconBg
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

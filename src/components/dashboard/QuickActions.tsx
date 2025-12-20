import { Button } from "@/components/ui/button";
import {
  UserPlus,
  FileText,
  FileCheck,
  UserCheck,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickAction {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  variant: "default" | "secondary" | "outline";
}

const actions: QuickAction[] = [
  {
    title: "Nuevo Cliente",
    description: "Registrar prospecto o cliente",
    icon: UserPlus,
    path: "/clientes/nuevo",
    variant: "default",
  },
  {
    title: "Nueva Proforma",
    description: "Crear cotización de servicios",
    icon: FileText,
    path: "/proformas/nueva",
    variant: "secondary",
  },
  {
    title: "Nuevo Contrato",
    description: "Registrar contrato aceptado",
    icon: FileCheck,
    path: "/contratos/nuevo",
    variant: "outline",
  },
  {
    title: "Asignar Trabajo",
    description: "Asignar contrato a asesor",
    icon: UserCheck,
    path: "/asignaciones/nueva",
    variant: "outline",
  },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-slide-up">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Acciones Rápidas
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.title}
              variant={action.variant}
              className="h-auto p-4 justify-start gap-3 group"
              onClick={() => navigate(action.path)}
            >
              <div className="p-2 rounded-lg bg-background/50 group-hover:bg-background/80 transition-colors">
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-left flex-1">
                <p className="font-medium">{action.title}</p>
                <p className="text-xs opacity-70">{action.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          );
        })}
      </div>
    </div>
  );
}

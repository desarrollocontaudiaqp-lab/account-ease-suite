import { 
  Activity, 
  Database, 
  ListTodo, 
  Package, 
  ShieldCheck,
  FileText,
  Calendar,
  Briefcase,
  ExternalLink,
  CheckCircle2,
  Circle,
  Clock,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { TreeNode, NodeType } from "./WorkFlowTreeSidebar";

interface WorkFlowContentPanelProps {
  selectedNode: TreeNode | null;
}

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

const typeLabels: Record<NodeType, string> = {
  espacio: "Cartera",
  mes: "Período",
  contrato: "Contrato",
  actividad: "Actividad",
  input: "Input",
  procesos: "Procesos",
  tarea: "Tarea",
  outputs: "Outputs",
  output: "Output",
  supervision: "Supervisión",
  supervision_item: "Verificación",
};

export function WorkFlowContentPanel({ selectedNode }: WorkFlowContentPanelProps) {
  if (!selectedNode) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Briefcase className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-lg font-medium">Selecciona un elemento</p>
        <p className="text-sm">Navega por el árbol para ver los detalles</p>
      </div>
    );
  }

  const renderNodeContent = () => {
    const data = selectedNode.data || {};
    
    switch (selectedNode.type) {
      case "espacio":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedNode.label}</h2>
                <p className="text-sm text-muted-foreground">{data.especialidad || "Cartera de trabajo"}</p>
              </div>
            </div>

            {data.stats && (
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{data.stats.total || 0}</p>
                    <p className="text-xs text-muted-foreground">Contratos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{data.stats.en_gestion || 0}</p>
                    <p className="text-xs text-muted-foreground">En Gestión</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{data.stats.finalizados || 0}</p>
                    <p className="text-xs text-muted-foreground">Finalizados</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {data.miembros && data.miembros.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Equipo ({data.miembros.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.miembros.map((m: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(m.profile?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {m.profile?.full_name || m.profile?.email}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {m.rol_en_cartera}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "mes":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedNode.label}</h2>
                <p className="text-sm text-muted-foreground">
                  {data.contractCount || 0} contratos
                </p>
              </div>
            </div>
          </div>
        );

      case "contrato":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <FileText className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{data.cliente || selectedNode.label}</h2>
                <p className="text-sm text-muted-foreground">{data.numero}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Servicio</p>
                  <p className="font-medium">{data.tipo_servicio || "-"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Estado</p>
                  <Badge>{data.status || "Activo"}</Badge>
                </CardContent>
              </Card>
            </div>

            {data.descripcion && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Descripción</p>
                  <p className="text-sm">{data.descripcion}</p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "actividad":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedNode.label}</h2>
                <p className="text-sm text-muted-foreground">Actividad del workflow</p>
              </div>
              {selectedNode.isCompleted && (
                <Badge className="bg-green-100 text-green-800 ml-auto">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completada
                </Badge>
              )}
            </div>

            {data.descripcion && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm">{data.descripcion}</p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "input":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Database className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedNode.label}</h2>
                <p className="text-sm text-muted-foreground">Input de datos</p>
              </div>
            </div>

            {data.enlaceSharepoint && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-2">Enlace SharePoint</p>
                  <Button variant="outline" className="gap-2" asChild>
                    <a href={data.enlaceSharepoint} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Abrir documento
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "tarea":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className={cn(
                "h-12 w-12 rounded-lg flex items-center justify-center",
                selectedNode.isCompleted 
                  ? "bg-green-100 dark:bg-green-900/30" 
                  : "bg-orange-100 dark:bg-orange-900/30"
              )}>
                {selectedNode.isCompleted ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : (
                  <ListTodo className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedNode.label}</h2>
                <p className="text-sm text-muted-foreground">Tarea asignada</p>
              </div>
            </div>

            {data.asignado_a && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-2">Asignado a</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(data.asignado_nombre)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{data.asignado_nombre || "Sin asignar"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{data.rol}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "output":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedNode.label}</h2>
                <p className="text-sm text-muted-foreground">Entregable</p>
              </div>
            </div>
          </div>
        );

      case "supervision":
      case "supervision_item":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedNode.label}</h2>
                <p className="text-sm text-muted-foreground">Verificación de supervisión</p>
              </div>
            </div>

            {data.asignado_a && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-2">Supervisor</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(data.asignado_nombre)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-medium">{data.asignado_nombre || "Sin asignar"}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{selectedNode.label}</h2>
            <Badge variant="outline">{typeLabels[selectedNode.type]}</Badge>
          </div>
        );
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
          <span className="capitalize">{typeLabels[selectedNode.type]}</span>
        </div>

        {renderNodeContent()}
      </div>
    </ScrollArea>
  );
}

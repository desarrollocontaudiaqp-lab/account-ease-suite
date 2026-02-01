import { useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
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
  Eye,
  FolderOpen,
  Building2,
  Hash,
  CalendarDays,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { TreeNode, NodeType } from "./WorkFlowTreeSidebar";
import { ContractDetailModal } from "@/components/contratos/ContractDetailModal";
import { PortfolioDashboard } from "./PortfolioDashboard";

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
  contratos_folder: "Contratos",
  actividad: "Actividad",
  input: "Input",
  procesos: "Procesos",
  tarea: "Tarea",
  outputs: "Outputs",
  output: "Output",
  supervision: "Supervisión",
  supervision_item: "Verificación",
};

const statusStyles: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  aprobado: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  en_gestion: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  activo: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  finalizado: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
};

const statusLabels: Record<string, string> = {
  borrador: "Borrador",
  aprobado: "Aprobado",
  en_gestion: "En Gestión",
  activo: "Activo",
  finalizado: "Finalizado",
};

export function WorkFlowContentPanel({ selectedNode }: WorkFlowContentPanelProps) {
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  const handleViewDetail = (contractId: string) => {
    setSelectedContractId(contractId);
    setDetailModalOpen(true);
  };

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
          <PortfolioDashboard
            carteraId={selectedNode.id}
            carteraNombre={selectedNode.label}
            especialidad={data.especialidad}
            miembros={data.miembros}
            stats={data.stats}
            onViewContract={handleViewDetail}
          />
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

      case "contratos_folder":
        const contratos = data.contratos || [];
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Contratos del Período</h2>
                <p className="text-sm text-muted-foreground">
                  {contratos.length} contrato{contratos.length !== 1 ? "s" : ""} en este mes
                </p>
              </div>
            </div>

            {/* Stats Summary */}
            {contratos.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-bold">{contratos.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-bold text-amber-600">
                      {contratos.filter((c: any) => c.status === "en_gestion").length}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">En Gestión</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-bold text-green-600">
                      {contratos.filter((c: any) => c.status === "activo" || c.status === "aprobado").length}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Activos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-bold text-purple-600">
                      {contratos.filter((c: any) => c.status === "finalizado").length}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Finalizados</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Contracts List */}
            <div className="space-y-3">
              {contratos.map((contrato: any) => (
                <Card key={contrato.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex items-stretch">
                      {/* Left color indicator */}
                      <div className={cn(
                        "w-1.5 flex-shrink-0",
                        contrato.status === "en_gestion" && "bg-amber-500",
                        contrato.status === "activo" && "bg-green-500",
                        contrato.status === "aprobado" && "bg-blue-500",
                        contrato.status === "finalizado" && "bg-purple-500",
                        contrato.status === "borrador" && "bg-gray-400",
                      )} />
                      
                      {/* Main content */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Client & Contract number */}
                            <div className="flex items-center gap-2 mb-1">
                              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <h3 className="font-semibold truncate">{contrato.cliente}</h3>
                            </div>
                            
                            {/* Contract number */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Hash className="h-3.5 w-3.5" />
                              <span>{contrato.numero}</span>
                              {contrato.cliente_codigo && (
                                <>
                                  <span className="text-muted-foreground/50">•</span>
                                  <span>{contrato.cliente_codigo}</span>
                                </>
                              )}
                            </div>

                            {/* Description */}
                            {contrato.descripcion && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {contrato.descripcion}
                              </p>
                            )}

                            {/* Tags row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={cn("text-xs", statusStyles[contrato.status])}>
                                {statusLabels[contrato.status] || contrato.status}
                              </Badge>
                              {contrato.tipo_servicio && (
                                <Badge variant="outline" className="text-xs">
                                  {contrato.tipo_servicio}
                                </Badge>
                              )}
                              {contrato.fecha_inicio && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <CalendarDays className="h-3 w-3" />
                                  {format(parseISO(contrato.fecha_inicio), "dd MMM yyyy", { locale: es })}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action button */}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1.5 flex-shrink-0"
                            onClick={() => handleViewDetail(contrato.id)}
                          >
                            <Eye className="h-4 w-4" />
                            Ver Detalle
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {contratos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No hay contratos en este período</p>
              </div>
            )}
          </div>
        );

      case "contrato":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{data.cliente || selectedNode.label}</h2>
                  <p className="text-sm text-muted-foreground">{data.numero}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5"
                onClick={() => handleViewDetail(data.contrato_id || selectedNode.id)}
              >
                <Eye className="h-4 w-4" />
                Ver Detalle Completo
              </Button>
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
                  <Badge className={statusStyles[data.status]}>
                    {statusLabels[data.status] || data.status || "Activo"}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {data.fecha_inicio && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Fecha de Inicio</p>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">
                      {format(parseISO(data.fecha_inicio), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

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
    <>
      <ScrollArea className="h-full">
        <div className="p-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
            <span className="capitalize">{typeLabels[selectedNode.type]}</span>
          </div>

          {renderNodeContent()}
        </div>
      </ScrollArea>

      {/* Contract Detail Modal */}
      <ContractDetailModal
        contractId={selectedContractId}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </>
  );
}

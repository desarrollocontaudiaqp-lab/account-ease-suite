import { useMemo, useState, useEffect } from "react";
import { format, parseISO, isPast } from "date-fns";
import { es } from "date-fns/locale";
import {
  Activity,
  Database,
  ListTodo,
  Package,
  ShieldCheck,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ExternalLink,
  Clock,
  User,
  Calendar as CalendarIcon,
  LayoutGrid,
  GanttChart as GanttChartIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { TreeNode } from "./WorkFlowTreeSidebar";
import { GanttChart, GanttTask } from "./gantt";

interface ActividadDetailDashboardProps {
  node: TreeNode;
  onRefresh?: () => void;
}

interface WorkflowStep {
  id: string;
  type: string;
  label: string;
  isCompleted: boolean;
  asignado_a?: string;
  asignado_nombre?: string;
  fecha_inicio?: string;
  fecha_termino?: string;
  fecha_vencimiento?: string;
  dependencias?: string[];
  progreso?: number;
  enlaceSharepoint?: string;
}

const typeIcons: Record<string, React.ElementType> = {
  input: Database,
  tarea: ListTodo,
  output: Package,
  supervision_item: ShieldCheck,
};

const typeColors: Record<string, string> = {
  input: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  tarea: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  output: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  supervision_item: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const typeLabels: Record<string, string> = {
  input: "Data",
  tarea: "Proceso",
  output: "Output",
  supervision_item: "Supervisión",
};

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export function ActividadDetailDashboard({ node, onRefresh }: ActividadDetailDashboardProps) {
  const [activeView, setActiveView] = useState<"table" | "gantt">("gantt");
  const [profiles, setProfiles] = useState<{ id: string; full_name: string | null }[]>([]);

  // Fetch profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name");
      setProfiles(data || []);
    };
    fetchProfiles();
  }, []);

  // Collect all workflow steps from this activity
  const steps = useMemo(() => {
    const result: WorkflowStep[] = [];

    const collectSteps = (n: TreeNode) => {
      const data = n.data || {};
      
      if (["input", "tarea", "output", "supervision_item"].includes(n.type)) {
        result.push({
          id: n.id,
          type: n.type,
          label: n.label,
          isCompleted: n.isCompleted || false,
          asignado_a: data.asignado_a,
          asignado_nombre: data.asignado_nombre,
          fecha_inicio: data.fecha_inicio,
          fecha_termino: data.fecha_termino,
          fecha_vencimiento: data.fecha_vencimiento,
          dependencias: data.dependencias || [],
          progreso: data.progreso || 0,
          enlaceSharepoint: data.enlaceSharepoint,
        });
      }

      if (n.children) {
        n.children.forEach(collectSteps);
      }
    };

    if (node.children) {
      node.children.forEach(collectSteps);
    }

    return result;
  }, [node]);

  // Convert steps to GanttTask format
  const ganttTasks: GanttTask[] = useMemo(() => {
    const contratoId = node.data?.contratoId;
    return steps.map(step => ({
      id: step.id,
      label: step.label,
      tipo: step.type === "supervision_item" ? "supervision" : step.type,
      fecha_inicio: step.fecha_inicio,
      fecha_termino: step.fecha_termino,
      progreso: step.progreso || 0,
      asignado_a: step.asignado_a,
      asignado_nombre: step.asignado_nombre,
      dependencias: step.dependencias,
      isCompleted: step.isCompleted,
      contratoId,
    }));
  }, [steps, node.data?.contratoId]);

  const stats = useMemo(() => {
    const total = steps.length;
    const completed = steps.filter(s => s.isCompleted).length;
    const pending = total - completed;
    const overdue = steps.filter(s => {
      if (s.isCompleted || !s.fecha_vencimiento) return false;
      const [year, month, day] = s.fecha_vencimiento.split("T")[0].split("-").map(Number);
      return isPast(new Date(year, month - 1, day));
    }).length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, pending, overdue, progress };
  }, [steps]);

  const data = node.data || {};

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{node.label}</h2>
            <p className="text-sm text-muted-foreground">
              {stats.completed}/{stats.total} pasos completados
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-32">
            <Progress value={stats.progress} className="h-2" />
          </div>
          <span className="text-lg font-bold text-primary">{Math.round(stats.progress)}%</span>
          {node.isCompleted && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completada
            </Badge>
          )}
        </div>
      </div>

      {/* Dates */}
      {(data.fecha_inicio || data.fecha_termino) && (
        <div className="flex items-center gap-4">
          {data.fecha_inicio && (
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Inicio:</span>
              <span className="font-medium">
                {format(parseISO(data.fecha_inicio), "dd MMM yyyy", { locale: es })}
              </span>
            </div>
          )}
          {data.fecha_termino && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Término:</span>
              <span className="font-medium">
                {format(parseISO(data.fecha_termino), "dd MMM yyyy", { locale: es })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200/50 dark:border-blue-800/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Total</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30 border-green-200/50 dark:border-green-800/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Completados</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300">{stats.completed}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200/50 dark:border-amber-800/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Pendientes</p>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{stats.pending}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/50 dark:to-red-900/30 border-red-200/50 dark:border-red-800/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">Vencidos</p>
                <p className="text-xl font-bold text-red-700 dark:text-red-300">{stats.overdue}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle and Content */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "table" | "gantt")} className="space-y-3">
        <div className="flex items-center justify-between">
          <TabsList className="h-9">
            <TabsTrigger value="gantt" className="gap-1.5 text-xs px-3">
              <GanttChartIcon className="h-4 w-4" />
              Diagrama Gantt
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-1.5 text-xs px-3">
              <LayoutGrid className="h-4 w-4" />
              Tabla
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Gantt View */}
        <TabsContent value="gantt" className="mt-0">
          <GanttChart tasks={ganttTasks} profiles={profiles} onRefresh={onRefresh} />
        </TabsContent>

        {/* Table View */}
        <TabsContent value="table" className="mt-0">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-r from-green-50 to-emerald-50/50 dark:from-green-950/30 dark:to-emerald-950/20">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-base">{node.label}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {stats.completed}/{stats.total} pasos completados
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[50px]">Estado</TableHead>
                    <TableHead className="w-[100px]">Tipo</TableHead>
                    <TableHead>Paso</TableHead>
                    <TableHead>Asignado</TableHead>
                    <TableHead className="w-[120px]">Vencimiento</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {steps.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No hay pasos en esta actividad
                      </TableCell>
                    </TableRow>
                  ) : (
                    steps.map((step) => {
                      let isOverdue = false;
                      if (step.fecha_vencimiento && !step.isCompleted) {
                        const [year, month, day] = step.fecha_vencimiento.split("T")[0].split("-").map(Number);
                        isOverdue = isPast(new Date(year, month - 1, day));
                      }
                      const Icon = typeIcons[step.type] || Activity;

                      return (
                        <TableRow 
                          key={step.id}
                          className={cn(
                            isOverdue && "bg-red-50/50 dark:bg-red-950/10",
                            step.isCompleted && "opacity-60"
                          )}
                        >
                          <TableCell>
                            {step.isCompleted ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : isOverdue ? (
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("gap-1", typeColors[step.type])}>
                              <Icon className="h-3 w-3" />
                              {typeLabels[step.type]}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{step.label}</TableCell>
                          <TableCell>
                            {step.asignado_nombre ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-[10px]">
                                    {getInitials(step.asignado_nombre)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{step.asignado_nombre}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Sin asignar</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {step.fecha_vencimiento ? (
                              <span className={cn(
                                "text-sm",
                                isOverdue && "text-red-600 font-medium"
                              )}>
                                {(() => {
                                  const [year, month, day] = step.fecha_vencimiento!.split("T")[0].split("-").map(Number);
                                  return format(new Date(year, month - 1, day), "dd MMM yyyy", { locale: es });
                                })()}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {step.enlaceSharepoint && (
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                    <a href={step.enlaceSharepoint} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Abrir en SharePoint</TooltipContent>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState, useMemo } from "react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday, isPast } from "date-fns";
import { es } from "date-fns/locale";
import {
  Activity,
  Calendar as CalendarIcon,
  Table2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  User,
  AlertTriangle,
  Database,
  ListTodo,
  Package,
  ShieldCheck,
  ExternalLink,
  LayoutGrid,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { TreeNode } from "./WorkFlowTreeSidebar";

interface ActividadesBacklogProps {
  node: TreeNode;
  allNodes?: TreeNode[];
}

interface WorkflowStep {
  id: string;
  type: string;
  label: string;
  isCompleted: boolean;
  asignado_nombre?: string;
  fecha_vencimiento?: string;
  parentActivity: string;
  parentActivityId: string;
  enlaceSharepoint?: string;
}

const typeIcons: Record<string, React.ElementType> = {
  input: Database,
  tarea: ListTodo,
  output: Package,
  supervision_item: ShieldCheck,
  actividad: Activity,
};

const typeColors: Record<string, string> = {
  input: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  tarea: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  output: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  supervision_item: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  actividad: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const typeLabels: Record<string, string> = {
  input: "Data",
  tarea: "Proceso",
  output: "Output",
  supervision_item: "Supervisión",
  actividad: "Actividad",
};

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export function ActividadesBacklog({ node, allNodes = [] }: ActividadesBacklogProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedView, setSelectedView] = useState<"calendario" | "tabla">("calendario");

  // Collect all workflow steps from all activities
  const { activities, allSteps } = useMemo(() => {
    const acts: TreeNode[] = [];
    const steps: WorkflowStep[] = [];

    const collectSteps = (n: TreeNode, activityName: string, activityId: string) => {
      const data = n.data || {};
      
      if (["input", "tarea", "output", "supervision_item"].includes(n.type)) {
        steps.push({
          id: n.id,
          type: n.type,
          label: n.label,
          isCompleted: n.isCompleted || false,
          asignado_nombre: data.asignado_nombre,
          fecha_vencimiento: data.fecha_vencimiento,
          parentActivity: activityName,
          parentActivityId: activityId,
          enlaceSharepoint: data.enlaceSharepoint,
        });
      }

      if (n.children) {
        n.children.forEach(child => collectSteps(child, activityName, activityId));
      }
    };

    // Find activities in the node's children
    const findActivities = (n: TreeNode) => {
      if (n.type === "actividad") {
        acts.push(n);
        collectSteps(n, n.label, n.id);
      }
      if (n.children) {
        n.children.forEach(findActivities);
      }
    };

    // If this is an "actividades" folder, look at children
    if (node.children) {
      node.children.forEach(findActivities);
    }

    return { activities: acts, allSteps: steps };
  }, [node]);

  // Group steps by date for calendar view
  const stepsByDate = useMemo(() => {
    const groups: Record<string, WorkflowStep[]> = {};
    allSteps.forEach(step => {
      if (step.fecha_vencimiento) {
        const dateKey = step.fecha_vencimiento.split("T")[0];
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(step);
      }
    });
    return groups;
  }, [allSteps]);

  // Steps without date
  const stepsWithoutDate = useMemo(() => {
    return allSteps.filter(s => !s.fecha_vencimiento);
  }, [allSteps]);

  // Calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Stats
  const stats = useMemo(() => {
    const total = allSteps.length;
    const completed = allSteps.filter(s => s.isCompleted).length;
    const pending = total - completed;
    const overdue = allSteps.filter(s => {
      if (s.isCompleted || !s.fecha_vencimiento) return false;
      return isPast(parseISO(s.fecha_vencimiento));
    }).length;
    return { total, completed, pending, overdue };
  }, [allSteps]);

  const renderStepBadge = (step: WorkflowStep) => {
    const Icon = typeIcons[step.type] || Activity;
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
          typeColors[step.type]
        )}
      >
        <Icon className="h-3 w-3" />
        <span className="truncate max-w-[100px]">{step.label}</span>
        {step.isCompleted && <CheckCircle2 className="h-3 w-3 ml-auto" />}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Backlog de Actividades</h2>
            <p className="text-sm text-muted-foreground">
              {activities.length} actividad{activities.length !== 1 ? "es" : ""} • {allSteps.length} pasos del workflow
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200/50 dark:border-blue-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <LayoutGrid className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30 border-green-200/50 dark:border-green-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Completados</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.completed}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200/50 dark:border-amber-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Pendientes</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.pending}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/50 dark:to-red-900/30 border-red-200/50 dark:border-red-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">Vencidos</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.overdue}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as any)} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="calendario" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            Backlog Calendario
          </TabsTrigger>
          <TabsTrigger value="tabla" className="gap-2">
            <Table2 className="h-4 w-4" />
            Backlog Tabla
          </TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendario" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {format(currentDate, "MMMM yyyy", { locale: es })}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setCurrentDate(new Date())}
                  >
                    Hoy
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: (calendarDays[0]?.getDay() || 7) - 1 }).map((_, i) => (
                  <div key={`empty-start-${i}`} className="min-h-[100px]" />
                ))}

                {calendarDays.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const daySteps = stepsByDate[dateKey] || [];
                  const hasOverdue = daySteps.some(s => !s.isCompleted && isPast(day));

                  return (
                    <div
                      key={dateKey}
                      className={cn(
                        "min-h-[100px] p-1 rounded-lg border transition-colors",
                        isToday(day) && "border-primary bg-primary/5",
                        !isToday(day) && "border-border hover:bg-muted/30",
                        hasOverdue && !isToday(day) && "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                      )}
                    >
                      <div className={cn(
                        "text-xs font-medium mb-1 px-1",
                        isToday(day) && "text-primary",
                        isPast(day) && !isToday(day) && "text-muted-foreground"
                      )}>
                        {format(day, "d")}
                      </div>
                      <ScrollArea className="h-[80px]">
                        <div className="space-y-1">
                          {daySteps.slice(0, 3).map((step) => (
                            <Tooltip key={step.id} delayDuration={0}>
                              <TooltipTrigger asChild>
                                <div className="cursor-pointer">
                                  {renderStepBadge(step)}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-[250px]">
                                <div className="space-y-1">
                                  <p className="font-medium">{step.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {typeLabels[step.type]} • {step.parentActivity}
                                  </p>
                                  {step.asignado_nombre && (
                                    <p className="text-xs flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {step.asignado_nombre}
                                    </p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                          {daySteps.length > 3 && (
                            <Badge variant="secondary" className="text-[10px] w-full justify-center">
                              +{daySteps.length - 3} más
                            </Badge>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })}
              </div>

              {/* Steps without date */}
              {stepsWithoutDate.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Sin fecha asignada ({stepsWithoutDate.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {stepsWithoutDate.map((step) => (
                      <Tooltip key={step.id} delayDuration={0}>
                        <TooltipTrigger asChild>
                          <div className="cursor-pointer">{renderStepBadge(step)}</div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{step.label}</p>
                          <p className="text-xs text-muted-foreground">{step.parentActivity}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Table View */}
        <TabsContent value="tabla" className="space-y-4">
          {activities.map((activity) => {
            const activitySteps = allSteps.filter(s => s.parentActivityId === activity.id);
            const completedSteps = activitySteps.filter(s => s.isCompleted).length;
            const progress = activitySteps.length > 0 ? (completedSteps / activitySteps.length) * 100 : 0;

            return (
              <Card key={activity.id} className="overflow-hidden">
                <CardHeader className="pb-2 bg-gradient-to-r from-green-50 to-emerald-50/50 dark:from-green-950/30 dark:to-emerald-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{activity.label}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {completedSteps}/{activitySteps.length} pasos completados
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        {Math.round(progress)}%
                      </span>
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
                      {activitySteps.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No hay pasos en esta actividad
                          </TableCell>
                        </TableRow>
                      ) : (
                        activitySteps.map((step) => {
                          const isOverdue = step.fecha_vencimiento && !step.isCompleted && isPast(parseISO(step.fecha_vencimiento));
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
                                    {format(parseISO(step.fecha_vencimiento), "dd MMM yyyy", { locale: es })}
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
            );
          })}

          {activities.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No hay actividades</p>
                <p className="text-sm">Esta carpeta no contiene actividades</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

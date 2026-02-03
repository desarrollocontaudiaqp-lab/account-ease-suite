import { useMemo, useCallback, useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import "./gantt-styles.css";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Calendar, 
  Loader2, 
  CheckCircle2, 
  Circle,
  User,
  CalendarPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface GanttTaskData {
  id: string;
  label: string;
  tipo: string;
  fecha_inicio?: string;
  fecha_termino?: string;
  progreso: number;
  asignado_a?: string;
  asignado_nombre?: string;
  dependencias?: string[];
  isCompleted: boolean;
  contratoId?: string;
}

interface GanttChartProProps {
  tasks: GanttTaskData[];
  profiles: { id: string; full_name: string | null }[];
  onRefresh?: () => void;
}

// Colores por tipo
const typeConfig: Record<string, { 
  bar: string; 
  progress: string; 
  label: string;
  bgClass: string;
  iconColor: string;
}> = {
  input: { 
    bar: "#10b981", 
    progress: "#059669", 
    label: "Data",
    bgClass: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-700",
    iconColor: "text-emerald-600"
  },
  tarea: { 
    bar: "#f97316", 
    progress: "#ea580c", 
    label: "Proceso",
    bgClass: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-700",
    iconColor: "text-orange-600"
  },
  output: { 
    bar: "#a855f7", 
    progress: "#9333ea", 
    label: "Output",
    bgClass: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-400 dark:border-purple-700",
    iconColor: "text-purple-600"
  },
  supervision: { 
    bar: "#ef4444", 
    progress: "#dc2626", 
    label: "Supervisión",
    bgClass: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-400 dark:border-red-700",
    iconColor: "text-red-600"
  },
};

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

// Tooltip personalizado
const TaskTooltip: React.FC<{ task: Task; fontSize: string; fontFamily: string }> = ({ task }) => {
  const extendedTask = task as Task & { tipo?: string; asignado_nombre?: string };
  const config = typeConfig[extendedTask.tipo || "tarea"] || typeConfig.tarea;
  
  return (
    <div className="bg-popover text-popover-foreground border rounded-xl shadow-xl p-4 max-w-[320px] space-y-3">
      <div className="flex items-center gap-2">
        <Badge className={cn("text-xs border", config.bgClass)}>
          {config.label}
        </Badge>
        <span className="font-semibold text-sm flex-1 truncate">{task.name}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div className="text-muted-foreground">Inicio:</div>
        <div className="font-medium">{format(task.start, "dd MMM yyyy", { locale: es })}</div>
        <div className="text-muted-foreground">Fin:</div>
        <div className="font-medium">{format(task.end, "dd MMM yyyy", { locale: es })}</div>
        <div className="text-muted-foreground">Progreso:</div>
        <div className="font-medium">{Math.round(task.progress)}%</div>
        {extendedTask.asignado_nombre && (
          <>
            <div className="text-muted-foreground">Asignado:</div>
            <div className="font-medium">{extendedTask.asignado_nombre}</div>
          </>
        )}
      </div>
      <Progress value={task.progress} className="h-1.5" />
    </div>
  );
};

export function GanttChartPro({ tasks, profiles, onRefresh }: GanttChartProProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [savingTask, setSavingTask] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState<string | null>(null);

  // Parser de fechas
  const parseDate = useCallback((dateStr?: string): Date => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
    return new Date(year, month - 1, day);
  }, []);

  // Tareas con fechas para el Gantt visual
  const ganttTasks: Task[] = useMemo(() => {
    return tasks
      .filter(t => t.fecha_inicio)
      .map((task) => {
        const startDate = parseDate(task.fecha_inicio);
        const endDate = task.fecha_termino 
          ? parseDate(task.fecha_termino) 
          : addDays(startDate, 1);
        
        const config = typeConfig[task.tipo] || typeConfig.tarea;
        const taskType: "task" | "milestone" = task.tipo === "tarea" ? "task" : "milestone";
        
        const dependencies = task.dependencias
          ?.filter(depId => tasks.some(t => t.id === depId && t.fecha_inicio))
          || [];

        return {
          id: task.id,
          name: task.label,
          start: startDate,
          end: endDate,
          progress: task.isCompleted ? 100 : task.progreso,
          type: taskType,
          isDisabled: false,
          dependencies,
          styles: {
            backgroundColor: config.bar,
            backgroundSelectedColor: config.progress,
            progressColor: config.progress,
            progressSelectedColor: config.bar,
          },
          tipo: task.tipo,
          contratoId: task.contratoId,
          asignado_nombre: task.asignado_nombre,
        } as Task & { tipo: string; contratoId?: string; asignado_nombre?: string };
      });
  }, [tasks, parseDate]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.isCompleted).length;
    const withDates = tasks.filter(t => t.fecha_inicio).length;
    const avgProgress = total > 0 
      ? tasks.reduce((acc, t) => acc + (t.isCompleted ? 100 : t.progreso), 0) / total 
      : 0;
    return { total, completed, withDates, avgProgress };
  }, [tasks]);

  // Actualizar workflow item
  const updateWorkflowItem = useCallback(async (
    taskId: string,
    contratoId: string,
    updates: Record<string, any>
  ) => {
    setSavingTask(taskId);

    try {
      const { data: workflow, error: wfError } = await supabase
        .from("workflows")
        .select("id, items")
        .eq("contrato_id", contratoId)
        .maybeSingle();

      if (wfError) throw wfError;
      if (!workflow) {
        toast.error("No se encontró el workflow");
        return false;
      }

      const items = (workflow.items as any[]) || [];
      
      const updatedItems = items.map((item: any) => {
        if (item.id === taskId) {
          return { ...item, ...updates };
        }
        return item;
      });

      const { error: updateError } = await supabase
        .from("workflows")
        .update({ items: updatedItems, updated_at: new Date().toISOString() })
        .eq("id", workflow.id);

      if (updateError) throw updateError;

      toast.success("Fechas asignadas");
      onRefresh?.();
      return true;
    } catch (error) {
      console.error("Error updating:", error);
      toast.error("Error al guardar");
      return false;
    } finally {
      setSavingTask(null);
    }
  }, [onRefresh]);

  // Asignar fecha de inicio a una tarea
  const handleAssignDate = useCallback(async (taskData: GanttTaskData, date: Date) => {
    if (!taskData.contratoId) return;
    
    const endDate = addDays(date, 1);
    
    await updateWorkflowItem(taskData.id, taskData.contratoId, {
      fecha_inicio: date.toISOString(),
      fecha_termino: endDate.toISOString(),
    });
    
    setDatePickerOpen(null);
  }, [updateWorkflowItem]);

  // Manejar cambio de fechas en Gantt
  const handleDateChange = useCallback(async (task: Task) => {
    const extendedTask = task as Task & { contratoId?: string };
    if (!extendedTask.contratoId) return;
    
    await updateWorkflowItem(task.id, extendedTask.contratoId, {
      fecha_inicio: task.start.toISOString(),
      fecha_termino: task.end.toISOString(),
    });
  }, [updateWorkflowItem]);

  // Manejar cambio de progreso
  const handleProgressChange = useCallback(async (task: Task) => {
    const extendedTask = task as Task & { contratoId?: string };
    if (!extendedTask.contratoId) return;
    
    await updateWorkflowItem(task.id, extendedTask.contratoId, {
      progreso: Math.round(task.progress),
    });
  }, [updateWorkflowItem]);

  if (tasks.length === 0) {
    return (
      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Calendar className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">Sin tareas para mostrar</p>
          <p className="text-sm">Esta actividad no tiene pasos definidos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-xl bg-card overflow-hidden shadow-sm relative">
      {/* Barra de herramientas */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-muted/40 to-transparent">
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 text-xs">
            <Badge variant="outline" className="gap-1.5 font-normal">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold">{stats.total}</span>
            </Badge>
            <Badge variant="outline" className="gap-1.5 font-normal bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
              <Calendar className="h-3 w-3 text-blue-500" />
              <span className="font-semibold text-blue-700 dark:text-blue-300">{stats.withDates}</span>
              <span className="text-muted-foreground">con fechas</span>
            </Badge>
            <Badge variant="outline" className="gap-1.5 font-normal bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">{stats.completed}</span>
            </Badge>
          </div>
        </div>

        {/* Controles de vista */}
        <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-0.5">
          <Button
            variant={viewMode === ViewMode.Day ? "default" : "ghost"}
            size="sm"
            className="h-7 px-3 text-xs font-medium"
            onClick={() => setViewMode(ViewMode.Day)}
          >
            Día
          </Button>
          <Button
            variant={viewMode === ViewMode.Week ? "default" : "ghost"}
            size="sm"
            className="h-7 px-3 text-xs font-medium"
            onClick={() => setViewMode(ViewMode.Week)}
          >
            Semana
          </Button>
          <Button
            variant={viewMode === ViewMode.Month ? "default" : "ghost"}
            size="sm"
            className="h-7 px-3 text-xs font-medium"
            onClick={() => setViewMode(ViewMode.Month)}
          >
            Mes
          </Button>
        </div>
      </div>

      {/* Lista de TODAS las tareas + Gantt */}
      <div className="flex">
        {/* Lista completa de tareas */}
        <div className="w-[420px] border-r flex-shrink-0">
          {/* Header */}
          <div className="flex items-center h-[52px] px-4 bg-muted/50 border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="w-10">Estado</div>
            <div className="w-24">Tipo</div>
            <div className="flex-1">Paso</div>
            <div className="w-36">Asignado</div>
          </div>
          
          {/* Lista de tareas */}
          <div className="max-h-[calc(100vh-22rem)] overflow-auto">
            {tasks.map((task, idx) => {
              const config = typeConfig[task.tipo] || typeConfig.tarea;
              const hasDates = !!task.fecha_inicio;
              
              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center h-[44px] px-4 border-b text-sm transition-colors",
                    idx % 2 === 0 ? "bg-background" : "bg-muted/10",
                    "hover:bg-accent/20"
                  )}
                >
                  {/* Estado */}
                  <div className="w-10">
                    {task.isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>
                  
                  {/* Tipo */}
                  <div className="w-24">
                    <Badge className={cn("text-[10px] px-2 py-0 h-5 border", config.bgClass)}>
                      {config.label}
                    </Badge>
                  </div>
                  
                  {/* Nombre del paso */}
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className={cn(
                      "font-medium truncate",
                      task.isCompleted && "line-through text-muted-foreground"
                    )}>
                      {task.label}
                    </span>
                    
                    {/* Indicador de fechas o botón para asignar */}
                    {!hasDates && (
                      <Popover 
                        open={datePickerOpen === task.id} 
                        onOpenChange={(open) => setDatePickerOpen(open ? task.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                          >
                            <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                            Asignar fecha
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarPicker
                            mode="single"
                            selected={undefined}
                            onSelect={(date) => date && handleAssignDate(task, date)}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                  
                  {/* Asignado */}
                  <div className="w-36">
                    {task.asignado_nombre ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {getInitials(task.asignado_nombre)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs truncate">{task.asignado_nombre}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Sin asignar
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Diagrama Gantt (solo tareas con fechas) */}
        <div className="flex-1 overflow-auto gantt-wrapper max-h-[calc(100vh-22rem)]">
          {ganttTasks.length > 0 ? (
            <Gantt
              tasks={ganttTasks}
              viewMode={viewMode}
              onDateChange={handleDateChange}
              onProgressChange={handleProgressChange}
              locale="es"
              listCellWidth="0"
              columnWidth={viewMode === ViewMode.Month ? 180 : viewMode === ViewMode.Week ? 80 : 45}
              rowHeight={44}
              headerHeight={52}
              barCornerRadius={6}
              barFill={75}
              handleWidth={12}
              todayColor="rgba(var(--primary), 0.08)"
              TooltipContent={TaskTooltip}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground">
              <Calendar className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">Sin fechas asignadas</p>
              <p className="text-xs">Usa "Asignar fecha" para planificar</p>
            </div>
          )}
        </div>
      </div>

      {/* Indicador de guardado */}
      {savingTask && (
        <div className="absolute top-3 right-3 flex items-center gap-2 bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg border text-xs font-medium">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          Guardando...
        </div>
      )}

      {/* Leyenda */}
      <div className="flex items-center justify-center gap-6 py-2.5 border-t bg-muted/20 text-[10px]">
        {Object.entries(typeConfig).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div 
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: config.bar }}
            />
            <span className="text-muted-foreground font-medium">{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

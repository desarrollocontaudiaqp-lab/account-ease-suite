import { useMemo, useCallback, useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import "./gantt-styles.css";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Loader2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface GanttTaskData {
  id: string;
  label: string;
  tipo: string; // input | tarea | output | supervision
  fecha_inicio?: string;
  fecha_termino?: string;
  progreso: number;
  asignado_a?: string;
  asignado_nombre?: string;
  dependencias?: string[]; // conexiones
  isCompleted: boolean;
  contratoId?: string;
}

interface GanttChartProProps {
  tasks: GanttTaskData[];
  profiles: { id: string; full_name: string | null }[];
  onRefresh?: () => void;
}

// Colores diferenciados por tipo
const typeConfig: Record<string, { 
  bar: string; 
  progress: string; 
  label: string;
  bgClass: string;
}> = {
  input: { 
    bar: "#10b981", 
    progress: "#059669", 
    label: "Data",
    bgClass: "bg-emerald-100 text-emerald-700 border-emerald-300"
  },
  tarea: { 
    bar: "#f97316", 
    progress: "#ea580c", 
    label: "Proceso",
    bgClass: "bg-orange-100 text-orange-700 border-orange-300"
  },
  output: { 
    bar: "#a855f7", 
    progress: "#9333ea", 
    label: "Output",
    bgClass: "bg-purple-100 text-purple-700 border-purple-300"
  },
  supervision: { 
    bar: "#ef4444", 
    progress: "#dc2626", 
    label: "Supervisión",
    bgClass: "bg-red-100 text-red-700 border-red-300"
  },
};

// Tooltip personalizado
const TaskTooltip: React.FC<{ task: Task; fontSize: string; fontFamily: string }> = ({ task }) => {
  const extendedTask = task as Task & { tipo?: string; asignado_nombre?: string };
  const config = typeConfig[extendedTask.tipo || "tarea"] || typeConfig.tarea;
  
  return (
    <div className="bg-popover text-popover-foreground border rounded-xl shadow-xl p-4 max-w-[320px] space-y-3">
      <div className="flex items-center gap-2">
        <Badge className={cn("text-xs", config.bgClass)}>
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

// Header de lista personalizado
const TaskListHeader: React.FC<{ 
  headerHeight: number; 
  rowWidth: string; 
  fontFamily: string; 
  fontSize: string 
}> = ({ headerHeight }) => {
  return (
    <div
      className="flex items-center px-4 font-semibold text-xs bg-muted/50 border-b uppercase tracking-wide text-muted-foreground"
      style={{ height: headerHeight }}
    >
      <div className="flex items-center gap-2">
        <Calendar className="h-3.5 w-3.5" />
        Pasos del Flujo
      </div>
    </div>
  );
};

// Tabla de lista personalizada
const TaskListTable: React.FC<{
  rowHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
  locale: string;
  tasks: Task[];
  selectedTaskId: string;
  setSelectedTask: (taskId: string) => void;
  onExpanderClick: (task: Task) => void;
}> = ({ tasks, rowHeight, rowWidth }) => {
  return (
    <div className="bg-card">
      {tasks.map((task, idx) => {
        const extendedTask = task as Task & { tipo?: string };
        const tipo = extendedTask.tipo || "tarea";
        const config = typeConfig[tipo] || typeConfig.tarea;
        
        return (
          <div
            key={task.id}
            className={cn(
              "flex items-center gap-3 px-4 border-b text-sm transition-colors group cursor-grab",
              idx % 2 === 0 ? "bg-background" : "bg-muted/20",
              "hover:bg-accent/30"
            )}
            style={{ height: rowHeight, width: rowWidth }}
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            <Badge 
              className={cn("text-[10px] px-2 py-0 h-5 flex-shrink-0 border", config.bgClass)}
            >
              {config.label}
            </Badge>
            <span className="font-medium truncate flex-1 text-foreground">{task.name}</span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div 
                className="w-8 h-1.5 rounded-full bg-muted overflow-hidden"
                title={`${Math.round(task.progress)}%`}
              >
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${task.progress}%`,
                    backgroundColor: config.bar 
                  }}
                />
              </div>
              <span className="w-8 text-right tabular-nums">{Math.round(task.progress)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export function GanttChartPro({ tasks, profiles, onRefresh }: GanttChartProProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [savingTask, setSavingTask] = useState<string | null>(null);

  // Parser de fechas (evitar problemas de timezone)
  const parseDate = useCallback((dateStr?: string): Date => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
    return new Date(year, month - 1, day);
  }, []);

  // Transformar datos al formato de gantt-task-react
  const ganttTasks: Task[] = useMemo(() => {
    return tasks
      .filter(t => t.fecha_inicio)
      .map((task) => {
        const startDate = parseDate(task.fecha_inicio);
        const endDate = task.fecha_termino 
          ? parseDate(task.fecha_termino) 
          : addDays(startDate, 1);
        
        const config = typeConfig[task.tipo] || typeConfig.tarea;
        
        // Determinar tipo según especificaciones
        const taskType: "task" | "milestone" = task.tipo === "tarea" ? "task" : "milestone";
        
        // Filtrar dependencias válidas
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
          // Datos extendidos
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

  // Actualizar workflow item en la base de datos
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

      toast.success("Cambios guardados");
      onRefresh?.();
      return true;
    } catch (error) {
      console.error("Error updating:", error);
      toast.error("Error al guardar cambios");
      return false;
    } finally {
      setSavingTask(null);
    }
  }, [onRefresh]);

  // Manejar cambio de fechas (arrastrar/redimensionar)
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

  // Manejar doble clic
  const handleDoubleClick = useCallback((task: Task) => {
    console.log("Double click:", task.name);
  }, []);

  // Manejar clic
  const handleClick = useCallback((task: Task) => {
    console.log("Click:", task.name);
  }, []);

  // Estado vacío
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

  // Estado sin fechas
  if (ganttTasks.length === 0) {
    return (
      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Calendar className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">Sin fechas asignadas</p>
          <p className="text-sm">Asigna fechas de inicio a las tareas para visualizarlas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-xl bg-card overflow-hidden shadow-sm relative">
      {/* Barra de herramientas */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-muted/40 to-transparent">
        <div className="flex items-center gap-4">
          {/* Estadísticas */}
          <div className="hidden md:flex items-center gap-3 text-xs">
            <Badge variant="outline" className="gap-1.5 font-normal">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold">{stats.total}</span>
            </Badge>
            <Badge variant="outline" className="gap-1.5 font-normal bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800">
              <span className="text-emerald-600 dark:text-emerald-400">✓</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">{stats.completed}</span>
            </Badge>
            <div className="flex items-center gap-2 px-2">
              <Progress value={stats.avgProgress} className="w-20 h-1.5" />
              <span className="font-semibold text-primary tabular-nums">{Math.round(stats.avgProgress)}%</span>
            </div>
          </div>
        </div>

        {/* Controles de vista */}
        <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-0.5">
          <Button
            variant={viewMode === ViewMode.Day ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-7 px-3 text-xs font-medium transition-all",
              viewMode === ViewMode.Day && "shadow-sm"
            )}
            onClick={() => setViewMode(ViewMode.Day)}
          >
            Día
          </Button>
          <Button
            variant={viewMode === ViewMode.Week ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-7 px-3 text-xs font-medium transition-all",
              viewMode === ViewMode.Week && "shadow-sm"
            )}
            onClick={() => setViewMode(ViewMode.Week)}
          >
            Semana
          </Button>
          <Button
            variant={viewMode === ViewMode.Month ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-7 px-3 text-xs font-medium transition-all",
              viewMode === ViewMode.Month && "shadow-sm"
            )}
            onClick={() => setViewMode(ViewMode.Month)}
          >
            Mes
          </Button>
        </div>
      </div>

      {/* Diagrama Gantt */}
      <div className="gantt-wrapper overflow-auto max-h-[calc(100vh-22rem)]">
        <Gantt
          tasks={ganttTasks}
          viewMode={viewMode}
          onDateChange={handleDateChange}
          onProgressChange={handleProgressChange}
          onDoubleClick={handleDoubleClick}
          onClick={handleClick}
          locale="es"
          listCellWidth="300px"
          columnWidth={viewMode === ViewMode.Month ? 180 : viewMode === ViewMode.Week ? 80 : 45}
          rowHeight={44}
          headerHeight={52}
          barCornerRadius={6}
          barFill={75}
          handleWidth={12}
          todayColor="rgba(var(--primary), 0.08)"
          TooltipContent={TaskTooltip}
          TaskListHeader={TaskListHeader}
          TaskListTable={TaskListTable}
        />
      </div>

      {/* Indicador de guardado */}
      {savingTask && (
        <div className="absolute top-3 right-3 flex items-center gap-2 bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg border text-xs font-medium">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          Guardando...
        </div>
      )}

      {/* Leyenda */}
      <div className="flex items-center justify-center gap-4 py-2.5 border-t bg-muted/20 text-[10px]">
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

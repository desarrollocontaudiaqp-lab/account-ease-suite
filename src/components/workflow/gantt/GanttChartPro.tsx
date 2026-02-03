import { useMemo, useCallback, useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import "./gantt-styles.css";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

const typeColors: Record<string, { bar: string; progress: string }> = {
  input: { bar: "#10b981", progress: "#059669" },
  tarea: { bar: "#f97316", progress: "#ea580c" },
  output: { bar: "#a855f7", progress: "#9333ea" },
  supervision: { bar: "#ef4444", progress: "#dc2626" },
};

// Custom tooltip component
const TaskTooltip: React.FC<{ task: Task; fontSize: string; fontFamily: string }> = ({
  task,
}) => {
  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 max-w-[280px]">
      <p className="font-semibold text-sm mb-2">{task.name}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="text-muted-foreground">Inicio:</div>
        <div>{format(task.start, "dd MMM yyyy", { locale: es })}</div>
        <div className="text-muted-foreground">Fin:</div>
        <div>{format(task.end, "dd MMM yyyy", { locale: es })}</div>
        <div className="text-muted-foreground">Progreso:</div>
        <div>{Math.round(task.progress)}%</div>
      </div>
    </div>
  );
};

// Custom task list header
const TaskListHeader: React.FC<{ headerHeight: number; rowWidth: string; fontFamily: string; fontSize: string }> = ({
  headerHeight,
}) => {
  return (
    <div
      className="flex items-center px-3 font-medium text-sm bg-muted/30 border-b"
      style={{ height: headerHeight }}
    >
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        Pasos de la Actividad
      </div>
    </div>
  );
};

// Custom task list table
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
  const typeLabels: Record<string, string> = {
    input: "Data",
    tarea: "Proceso",
    output: "Output",
    supervision: "Supervisión",
  };

  return (
    <div className="bg-card">
      {tasks.map((task, idx) => {
        const tipo = (task as any).tipo || "tarea";
        const colors = typeColors[tipo] || typeColors.tarea;
        
        return (
          <div
            key={task.id}
            className={cn(
              "flex items-center gap-2 px-3 border-b text-sm transition-colors",
              idx % 2 === 0 ? "bg-background" : "bg-muted/10"
            )}
            style={{ height: rowHeight, width: rowWidth }}
          >
            <Badge 
              className="gap-1 text-xs flex-shrink-0"
              style={{ 
                backgroundColor: `${colors.bar}20`, 
                color: colors.bar,
                borderColor: colors.bar 
              }}
            >
              {typeLabels[tipo] || tipo}
            </Badge>
            <span className="font-medium truncate flex-1">{task.name}</span>
            <span className="text-xs text-muted-foreground">
              {Math.round(task.progress)}%
            </span>
          </div>
        );
      })}
    </div>
  );
};

export function GanttChartPro({ tasks, profiles, onRefresh }: GanttChartProProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [savingTask, setSavingTask] = useState<string | null>(null);

  // Parse date helper
  const parseDate = useCallback((dateStr?: string): Date => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
    return new Date(year, month - 1, day);
  }, []);

  // Convert tasks to gantt-task-react format
  const ganttTasks: Task[] = useMemo(() => {
    return tasks
      .filter(t => t.fecha_inicio) // Only tasks with start date
      .map((task, index) => {
        const startDate = parseDate(task.fecha_inicio);
        const endDate = task.fecha_termino 
          ? parseDate(task.fecha_termino) 
          : addDays(startDate, 1);
        
        const colors = typeColors[task.tipo] || typeColors.tarea;
        
        // Build dependencies array
        const dependencies = task.dependencias
          ?.filter(depId => tasks.some(t => t.id === depId && t.fecha_inicio))
          .map(depId => depId) || [];

        return {
          id: task.id,
          name: task.label,
          start: startDate,
          end: endDate,
          progress: task.progreso,
          type: "task" as const,
          isDisabled: task.isCompleted,
          dependencies,
          styles: {
            backgroundColor: colors.bar,
            backgroundSelectedColor: colors.progress,
            progressColor: colors.progress,
            progressSelectedColor: colors.bar,
          },
          // Custom data
          tipo: task.tipo,
          contratoId: task.contratoId,
          asignado_nombre: task.asignado_nombre,
        } as Task & { tipo: string; contratoId?: string; asignado_nombre?: string };
      });
  }, [tasks, parseDate]);

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.isCompleted).length;
    const withDates = tasks.filter(t => t.fecha_inicio).length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, withDates, progress };
  }, [tasks]);

  // Update workflow item in database
  const updateWorkflowItem = useCallback(async (
    task: Task,
    updates: Partial<{
      fecha_inicio: string;
      fecha_termino: string;
    }>
  ) => {
    const originalTask = tasks.find(t => t.id === task.id);
    if (!originalTask?.contratoId) return;
    
    setSavingTask(task.id);

    try {
      const { data: workflow, error: wfError } = await supabase
        .from("workflows")
        .select("id, items")
        .eq("contrato_id", originalTask.contratoId)
        .maybeSingle();

      if (wfError) throw wfError;
      if (!workflow) {
        toast.error("No se encontró el workflow");
        return;
      }

      const items = (workflow.items as any[]) || [];
      
      const updatedItems = items.map((item: any) => {
        if (item.id === task.id) {
          return { ...item, ...updates };
        }
        return item;
      });

      const { error: updateError } = await supabase
        .from("workflows")
        .update({ items: updatedItems, updated_at: new Date().toISOString() })
        .eq("id", workflow.id);

      if (updateError) throw updateError;

      toast.success("Fechas actualizadas");
      onRefresh?.();
    } catch (error) {
      console.error("Error updating:", error);
      toast.error("Error al actualizar");
    }

    setSavingTask(null);
  }, [tasks, onRefresh]);

  // Handle date change (drag/resize)
  const handleDateChange = useCallback((task: Task) => {
    updateWorkflowItem(task, {
      fecha_inicio: task.start.toISOString(),
      fecha_termino: task.end.toISOString(),
    });
    return true;
  }, [updateWorkflowItem]);

  // Handle progress change
  const handleProgressChange = useCallback(async (task: Task) => {
    const originalTask = tasks.find(t => t.id === task.id);
    if (!originalTask?.contratoId) return;
    
    setSavingTask(task.id);

    try {
      const { data: workflow, error: wfError } = await supabase
        .from("workflows")
        .select("id, items")
        .eq("contrato_id", originalTask.contratoId)
        .maybeSingle();

      if (wfError) throw wfError;
      if (!workflow) return;

      const items = (workflow.items as any[]) || [];
      
      const updatedItems = items.map((item: any) => {
        if (item.id === task.id) {
          return { ...item, progreso: Math.round(task.progress) };
        }
        return item;
      });

      const { error: updateError } = await supabase
        .from("workflows")
        .update({ items: updatedItems, updated_at: new Date().toISOString() })
        .eq("id", workflow.id);

      if (updateError) throw updateError;

      toast.success("Progreso actualizado");
      onRefresh?.();
    } catch (error) {
      console.error("Error updating progress:", error);
      toast.error("Error al actualizar progreso");
    }

    setSavingTask(null);
  }, [tasks, onRefresh]);

  // Handle double click
  const handleDoubleClick = useCallback((task: Task) => {
    console.log("Double click on task:", task.name);
  }, []);

  // Handle click
  const handleClick = useCallback((task: Task) => {
    console.log("Click on task:", task.name);
  }, []);

  if (tasks.length === 0) {
    return (
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Calendar className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">Sin tareas para mostrar</p>
          <p className="text-sm">Esta actividad no tiene pasos definidos</p>
        </div>
      </div>
    );
  }

  if (ganttTasks.length === 0) {
    return (
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Calendar className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">Sin fechas asignadas</p>
          <p className="text-sm">Asigna fechas de inicio a las tareas para visualizarlas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-muted/30 to-transparent">
        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="hidden md:flex items-center gap-3 text-xs">
            <Badge variant="outline" className="gap-1">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold">{stats.total}</span>
            </Badge>
            <Badge variant="outline" className="gap-1 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800">
              <span className="text-emerald-600 dark:text-emerald-400">✓</span>
              <span className="font-semibold">{stats.completed}</span>
            </Badge>
            <div className="flex items-center gap-2">
              <Progress value={stats.progress} className="w-16 h-1.5" />
              <span className="font-medium text-primary">{Math.round(stats.progress)}%</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* View mode controls */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            <Button
              variant={viewMode === ViewMode.Day ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setViewMode(ViewMode.Day)}
            >
              Día
            </Button>
            <Button
              variant={viewMode === ViewMode.Week ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setViewMode(ViewMode.Week)}
            >
              Semana
            </Button>
            <Button
              variant={viewMode === ViewMode.Month ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setViewMode(ViewMode.Month)}
            >
              Mes
            </Button>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="gantt-wrapper overflow-auto max-h-[calc(100vh-20rem)]">
        <Gantt
          tasks={ganttTasks}
          viewMode={viewMode}
          onDateChange={handleDateChange}
          onProgressChange={handleProgressChange}
          onDoubleClick={handleDoubleClick}
          onClick={handleClick}
          locale="es"
          listCellWidth="280px"
          columnWidth={viewMode === ViewMode.Month ? 200 : viewMode === ViewMode.Week ? 100 : 50}
          rowHeight={48}
          headerHeight={56}
          barCornerRadius={6}
          barFill={70}
          handleWidth={10}
          todayColor="rgba(var(--primary), 0.1)"
          TooltipContent={TaskTooltip}
          TaskListHeader={TaskListHeader}
          TaskListTable={TaskListTable}
        />
      </div>

      {/* Global loading indicator */}
      {savingTask && (
        <div className="absolute top-2 right-2 flex items-center gap-2 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
          Guardando...
        </div>
      )}
    </div>
  );
}

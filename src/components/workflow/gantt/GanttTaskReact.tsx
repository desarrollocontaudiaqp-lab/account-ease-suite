import { useMemo, useCallback, useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { addDays } from "date-fns";
import { Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface GanttTaskReactProps {
  tasks: GanttTaskData[];
  profiles: { id: string; full_name: string | null }[];
  onRefresh?: () => void;
}

// Color palette by type
const typeColors: Record<string, { bar: string; barProgress: string }> = {
  input: { bar: "#10b981", barProgress: "#059669" }, // emerald
  tarea: { bar: "#f97316", barProgress: "#ea580c" }, // orange
  output: { bar: "#a855f7", barProgress: "#9333ea" }, // purple
  supervision: { bar: "#ef4444", barProgress: "#dc2626" }, // red
};

const parseLocalDate = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDateForDB = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T00:00:00.000Z`;
};

export function GanttTaskReact({
  tasks,
  profiles,
  onRefresh,
}: GanttTaskReactProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [savingTask, setSavingTask] = useState<string | null>(null);

  // Convert our data format to gantt-task-react format
  const ganttTasks: Task[] = useMemo(() => {
    const today = new Date();
    
    return tasks.map((task, index) => {
      const startDate = parseLocalDate(task.fecha_inicio) || today;
      const endDate = parseLocalDate(task.fecha_termino) || addDays(startDate, 1);
      
      // Ensure end date is after or equal to start date
      const validEndDate = endDate >= startDate ? endDate : addDays(startDate, 1);
      
      const colors = typeColors[task.tipo] || typeColors.tarea;
      
      // Build dependencies array (referencing other task IDs)
      const dependencies = task.dependencias
        ?.filter((depId) => tasks.some((t) => t.id === depId))
        || [];

      return {
        id: task.id,
        name: task.label,
        start: startDate,
        end: validEndDate,
        progress: task.progreso || 0,
        type: "task" as const,
        isDisabled: task.isCompleted,
        styles: {
          backgroundColor: colors.bar,
          backgroundSelectedColor: colors.bar,
          progressColor: colors.barProgress,
          progressSelectedColor: colors.barProgress,
        },
        dependencies,
        // Custom properties for our logic
        project: task.contratoId,
      };
    });
  }, [tasks]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.isCompleted).length;
    const withDates = tasks.filter((t) => t.fecha_inicio).length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, withDates, progress };
  }, [tasks]);

  // Update workflow item in database
  const updateWorkflowItem = useCallback(
    async (taskId: string, updates: { fecha_inicio: string; fecha_termino: string }) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task?.contratoId) {
        console.error("No contratoId found for task:", taskId);
        toast.error("No se puede actualizar: falta el ID del contrato");
        return;
      }

      setSavingTask(taskId);

      try {
        // Fetch the current workflow
        const { data: workflow, error: wfError } = await supabase
          .from("workflows")
          .select("id, items")
          .eq("contrato_id", task.contratoId)
          .maybeSingle();

        if (wfError) {
          console.error("Error fetching workflow:", wfError);
          throw wfError;
        }

        if (!workflow) {
          console.error("No workflow found for contrato_id:", task.contratoId);
          toast.error("No se encontró el workflow");
          setSavingTask(null);
          return;
        }

        const items = (workflow.items as any[]) || [];

        // Update the specific item
        const updatedItems = items.map((item: any) => {
          if (item.id === taskId) {
            return { ...item, ...updates };
          }
          return item;
        });

        // Save to database
        const { error: updateError } = await supabase
          .from("workflows")
          .update({ items: updatedItems, updated_at: new Date().toISOString() })
          .eq("id", workflow.id);

        if (updateError) {
          console.error("Error updating workflow:", updateError);
          throw updateError;
        }

        toast.success("Fechas actualizadas");

        // Trigger refresh to update UI
        if (onRefresh) {
          onRefresh();
        }
      } catch (error) {
        console.error("Error updating workflow item:", error);
        toast.error("Error al guardar los cambios");
      } finally {
        setSavingTask(null);
      }
    },
    [tasks, onRefresh]
  );

  // Handle date change from Gantt (drag or resize)
  const handleDateChange = useCallback(
    (task: Task, children: Task[]) => {
      updateWorkflowItem(task.id, {
        fecha_inicio: formatDateForDB(task.start),
        fecha_termino: formatDateForDB(task.end),
      });
      return true;
    },
    [updateWorkflowItem]
  );

  // Handle progress change
  const handleProgressChange = useCallback(
    (task: Task, children: Task[]) => {
      // Progress updates could be implemented here
      console.log("Progress changed:", task.id, task.progress);
      return true;
    },
    []
  );

  // Handle task click
  const handleTaskClick = useCallback((task: Task) => {
    console.log("Task clicked:", task.id);
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

  return (
    <div className="border rounded-lg bg-card overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-muted/30 to-transparent">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Diagrama Gantt</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="hidden md:flex items-center gap-3 text-xs">
            <Badge variant="outline" className="gap-1">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold">{stats.total}</span>
            </Badge>
            <Badge
              variant="outline"
              className="gap-1 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
            >
              <span className="text-emerald-600 dark:text-emerald-400">✓</span>
              <span className="font-semibold">{stats.completed}</span>
            </Badge>
            <div className="flex items-center gap-2">
              <Progress value={stats.progress} className="w-16 h-1.5" />
              <span className="font-medium text-primary">
                {Math.round(stats.progress)}%
              </span>
            </div>
          </div>

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
      <div className="gantt-wrapper overflow-x-auto">
        <Gantt
          tasks={ganttTasks}
          viewMode={viewMode}
          onDateChange={handleDateChange}
          onProgressChange={handleProgressChange}
          onClick={handleTaskClick}
          locale="es"
          listCellWidth=""
          columnWidth={viewMode === ViewMode.Day ? 44 : viewMode === ViewMode.Week ? 120 : 180}
          rowHeight={48}
          barCornerRadius={4}
          barFill={65}
          handleWidth={8}
          todayColor="rgba(var(--primary), 0.1)"
          projectBackgroundColor="#f3f4f6"
          projectProgressColor="#e5e7eb"
          projectBackgroundSelectedColor="#e5e7eb"
          projectProgressSelectedColor="#d1d5db"
          arrowColor="hsl(var(--primary))"
          arrowIndent={20}
          fontFamily="inherit"
          fontSize="12px"
          TooltipContent={({ task }) => {
            const originalTask = tasks.find((t) => t.id === task.id);
            return (
              <div className="bg-popover border rounded-lg p-3 shadow-lg min-w-[200px]">
                <p className="font-semibold text-sm mb-2">{task.name}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inicio:</span>
                    <span>{task.start.toLocaleDateString("es")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fin:</span>
                    <span>{task.end.toLocaleDateString("es")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Progreso:</span>
                    <span>{task.progress}%</span>
                  </div>
                  {originalTask?.asignado_nombre && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Responsable:</span>
                      <span>{originalTask.asignado_nombre}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          }}
        />
      </div>

      {/* Loading indicator */}
      {savingTask && (
        <div className="absolute top-2 right-2 flex items-center gap-2 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
          Guardando...
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 p-3 border-t bg-muted/20 text-xs">
        <span className="text-muted-foreground">Tipos:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span>Data</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span>Proceso</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-500" />
          <span>Output</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Supervisión</span>
        </div>
        <div className="ml-auto text-muted-foreground">
          Arrastra las barras para cambiar fechas
        </div>
      </div>
    </div>
  );
}

import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { addDays, differenceInDays } from "date-fns";
import { Calendar, Loader2, RefreshCw } from "lucide-react";
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
  input: { bar: "#10b981", barProgress: "#059669" },
  tarea: { bar: "#f97316", barProgress: "#ea580c" },
  output: { bar: "#a855f7", barProgress: "#9333ea" },
  supervision: { bar: "#ef4444", barProgress: "#dc2626" },
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use local state to manage task data independently
  const [localTasks, setLocalTasks] = useState<GanttTaskData[]>(tasks);
  
  // Key to force Gantt re-render
  const [ganttKey, setGanttKey] = useState(0);
  
  // Track the last tasks reference to detect real updates
  const lastTasksRef = useRef<GanttTaskData[]>(tasks);

  // Sync with parent tasks when they actually change
  useEffect(() => {
    // Only update if the tasks have actually changed (new reference)
    if (tasks !== lastTasksRef.current) {
      console.log("Tasks updated from parent, syncing local state");
      lastTasksRef.current = tasks;
      setLocalTasks(tasks);
      setGanttKey(k => k + 1); // Force Gantt re-render
    }
  }, [tasks]);

  // Convert our data format to gantt-task-react format
  const ganttTasks: Task[] = useMemo(() => {
    const today = new Date();
    
    return localTasks.map((task) => {
      const startDate = parseLocalDate(task.fecha_inicio) || today;
      const endDate = parseLocalDate(task.fecha_termino) || addDays(startDate, 1);
      
      const validEndDate = endDate >= startDate ? endDate : addDays(startDate, 1);
      const colors = typeColors[task.tipo] || typeColors.tarea;
      
      const dependencies = task.dependencias
        ?.filter((depId) => localTasks.some((t) => t.id === depId))
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
        project: task.contratoId,
      };
    });
  }, [localTasks]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = localTasks.length;
    const completed = localTasks.filter((t) => t.isCompleted).length;
    const withDates = localTasks.filter((t) => t.fecha_inicio).length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, withDates, progress };
  }, [localTasks]);

  // Update workflow item in database
  const updateWorkflowItem = useCallback(
    async (taskId: string, updates: { fecha_inicio?: string; fecha_termino?: string; progreso?: number }): Promise<boolean> => {
      const task = localTasks.find((t) => t.id === taskId);
      
      if (!task?.contratoId) {
        console.error("No contratoId found for task:", taskId);
        toast.error("No se puede actualizar: falta el ID del contrato");
        return false;
      }

      // Set saving state
      setSavingTask(taskId);

      // Immediately update local state for optimistic UI
      setLocalTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            ...(updates.fecha_inicio !== undefined && { fecha_inicio: updates.fecha_inicio }),
            ...(updates.fecha_termino !== undefined && { fecha_termino: updates.fecha_termino }),
            ...(updates.progreso !== undefined && { progreso: updates.progreso }),
          };
        }
        return t;
      }));

      // Force Gantt to re-render with new data
      setGanttKey(k => k + 1);

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
          return false;
        }

        const items = (workflow.items as any[]) || [];

        // Find the item in the flat array
        const itemIndex = items.findIndex((item: any) => item.id === taskId);
        
        if (itemIndex === -1) {
          console.error("Item not found in workflow items:", taskId);
          toast.error("No se encontró el item en el workflow");
          setSavingTask(null);
          return false;
        }

        // Create updated items array - ALWAYS include progreso field
        const updatedItems = [...items];
        updatedItems[itemIndex] = { 
          ...items[itemIndex],
          // Always set fecha_inicio if provided
          ...(updates.fecha_inicio !== undefined && { fecha_inicio: updates.fecha_inicio }),
          // Always set fecha_termino if provided
          ...(updates.fecha_termino !== undefined && { fecha_termino: updates.fecha_termino }),
          // Always set progreso (default to current or 0)
          progreso: updates.progreso !== undefined 
            ? updates.progreso 
            : (items[itemIndex].progreso || 0),
        };

        console.log("Saving workflow item:", {
          taskId,
          updates,
          originalItem: items[itemIndex],
          updatedItem: updatedItems[itemIndex]
        });

        // Save to database
        const { error: updateError } = await supabase
          .from("workflows")
          .update({ 
            items: updatedItems, 
            updated_at: new Date().toISOString() 
          })
          .eq("id", workflow.id);

        if (updateError) {
          console.error("Error updating workflow:", updateError);
          throw updateError;
        }

        toast.success("Cambios guardados");
        setSavingTask(null);
        
        // CRITICAL: Call onRefresh to reload data from parent
        // This ensures the tree and all views get fresh data
        if (onRefresh) {
          console.log("Calling onRefresh to reload data");
          onRefresh();
        }
        
        return true;
      } catch (error) {
        console.error("Error updating workflow item:", error);
        toast.error("Error al guardar los cambios");
        
        // Revert local state on error
        setLocalTasks(tasks);
        setGanttKey(k => k + 1);
        
        setSavingTask(null);
        return false;
      }
    },
    [localTasks, tasks, onRefresh]
  );

  // Handle date change from Gantt (drag or resize)
  const handleDateChange = useCallback(
    async (task: Task): Promise<boolean> => {
      console.log("Date change:", { id: task.id, start: task.start, end: task.end });
      const result = await updateWorkflowItem(task.id, {
        fecha_inicio: formatDateForDB(task.start),
        fecha_termino: formatDateForDB(task.end),
      });
      return result;
    },
    [updateWorkflowItem]
  );

  // Handle progress change
  const handleProgressChange = useCallback(
    async (task: Task): Promise<boolean> => {
      console.log("Progress change:", { id: task.id, progress: task.progress });
      const result = await updateWorkflowItem(task.id, {
        progreso: Math.round(task.progress),
      });
      return result;
    },
    [updateWorkflowItem]
  );

  // Handle task click
  const handleTaskClick = useCallback((task: Task) => {
    console.log("Task clicked:", task.id);
  }, []);

  // Manual refresh handler
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    // Force re-render after refresh
    setGanttKey(k => k + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  }, [onRefresh]);

  if (localTasks.length === 0) {
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
          {/* Refresh button - next to title for visibility */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-muted"
            onClick={handleManualRefresh}
            disabled={isRefreshing || !!savingTask}
            title="Actualizar diagrama"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          {savingTask && (
            <Badge variant="outline" className="gap-1 ml-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Guardando...
            </Badge>
          )}
          {isRefreshing && !savingTask && (
            <Badge variant="outline" className="gap-1 ml-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Actualizando...
            </Badge>
          )}
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
      <div className="gantt-wrapper overflow-x-auto gantt-custom-styles">
        <style>{`
          .gantt-custom-styles .gantt-task-list {
            background: hsl(var(--card));
          }
          .gantt-custom-styles .gantt-task-list-header {
            background: hsl(var(--muted));
            font-weight: 600;
            font-size: 11px;
            color: hsl(var(--muted-foreground));
          }
          .gantt-custom-styles .gantt-task-list-wrapper {
            border-right: 1px solid hsl(var(--border));
          }
          .gantt-custom-styles .gantt-task-list-cell {
            border-bottom: 1px solid hsl(var(--border));
            font-size: 12px;
          }
          .gantt-custom-styles ._3_ygE {
            background: hsl(var(--card));
          }
          .gantt-custom-styles ._1nBOt {
            fill: hsl(var(--muted-foreground));
            font-size: 11px;
          }
          .gantt-custom-styles ._9w8d5 {
            stroke: hsl(var(--border));
          }
          .gantt-custom-styles ._CZjuD {
            fill: hsl(var(--primary) / 0.1);
          }
        `}</style>
        <Gantt
          key={ganttKey}
          tasks={ganttTasks}
          viewMode={viewMode}
          onDateChange={handleDateChange}
          onProgressChange={handleProgressChange}
          onClick={handleTaskClick}
          locale="es"
          listCellWidth="155px"
          columnWidth={viewMode === ViewMode.Day ? 44 : viewMode === ViewMode.Week ? 120 : 180}
          rowHeight={42}
          barCornerRadius={4}
          barFill={60}
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
          TaskListHeader={({ headerHeight }) => (
            <div 
              className="flex text-xs font-semibold text-muted-foreground bg-muted border-b border-border"
              style={{ height: headerHeight }}
            >
              <div className="flex-1 px-2 flex items-center min-w-[140px]">Tarea</div>
              <div className="w-[70px] px-1 flex items-center justify-center border-l border-border">Inicio</div>
              <div className="w-[70px] px-1 flex items-center justify-center border-l border-border">Fin</div>
              <div className="w-[45px] px-1 flex items-center justify-center border-l border-border">Días</div>
              <div className="w-[45px] px-1 flex items-center justify-center border-l border-border">%</div>
            </div>
          )}
          TaskListTable={({ tasks: tableTasks, rowHeight }) => (
            <div className="text-xs">
              {tableTasks.map((task) => {
                const duration = differenceInDays(task.end, task.start) + 1;
                const originalTask = localTasks.find(t => t.id === task.id);
                const colors = typeColors[originalTask?.tipo || 'tarea'];
                return (
                  <div
                    key={task.id}
                    className="flex items-center border-b border-border hover:bg-muted/50 transition-colors"
                    style={{ height: rowHeight }}
                  >
                    <div className="flex-1 px-2 flex items-center gap-2 min-w-[140px] overflow-hidden">
                      <div 
                        className="w-2 h-2 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: colors?.bar || '#6b7280' }}
                      />
                      <span className="truncate font-medium" title={task.name}>
                        {task.name}
                      </span>
                    </div>
                    <div className="w-[70px] px-1 text-center text-muted-foreground border-l border-border">
                      {task.start.toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                    </div>
                    <div className="w-[70px] px-1 text-center text-muted-foreground border-l border-border">
                      {task.end.toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                    </div>
                    <div className="w-[45px] px-1 text-center font-medium border-l border-border">
                      {duration}
                    </div>
                    <div className="w-[45px] px-1 text-center border-l border-border">
                      <span 
                        className={`font-medium ${
                          task.progress >= 100 ? 'text-emerald-600' : 
                          task.progress > 0 ? 'text-amber-600' : 'text-muted-foreground'
                        }`}
                      >
                        {task.progress}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          TooltipContent={({ task }) => {
            const originalTask = localTasks.find((t) => t.id === task.id);
            const duration = differenceInDays(task.end, task.start) + 1;
            return (
              <div className="bg-popover border rounded-lg p-3 shadow-lg min-w-[220px]">
                <p className="font-semibold text-sm mb-2">{task.name}</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inicio:</span>
                    <span>{task.start.toLocaleDateString("es", { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fin:</span>
                    <span>{task.end.toLocaleDateString("es", { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duración:</span>
                    <span>{duration} día{duration !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Progreso:</span>
                    <div className="flex items-center gap-2">
                      <Progress value={task.progress} className="w-12 h-1.5" />
                      <span>{task.progress}%</span>
                    </div>
                  </div>
                  {originalTask?.asignado_nombre && (
                    <div className="flex justify-between pt-1 border-t">
                      <span className="text-muted-foreground">Asignado:</span>
                      <span className="font-medium">{originalTask.asignado_nombre}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}

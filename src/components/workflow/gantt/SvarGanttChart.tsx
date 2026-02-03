import { useMemo, useState, useCallback, useEffect } from "react";
import { Gantt } from "wx-react-gantt";
import "wx-react-gantt/dist/gantt.css";
import { addDays, format, startOfMonth, endOfMonth, isSameMonth, differenceInDays, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import "./SvarGanttChart.css";

// Mantener compatibilidad con el tipo existente
export interface GanttTask {
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

interface SvarGanttChartProps {
  tasks: GanttTask[];
  profiles: { id: string; full_name: string | null }[];
  onRefresh?: () => void;
}

// Colores por tipo de tarea
const typeColors: Record<string, string> = {
  input: "#10b981",      // emerald-500
  tarea: "#f97316",      // orange-500
  output: "#a855f7",     // purple-500
  supervision: "#ef4444", // red-500
};

// Parsear fecha evitando problemas de timezone
const parseDate = (dateStr?: string): Date | undefined => {
  if (!dateStr) return undefined;
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
};

// Mapa para convertir IDs string a números
const createIdMap = (tasks: GanttTask[]): Map<string, number> => {
  const map = new Map<string, number>();
  tasks.forEach((task, index) => {
    map.set(task.id, index + 1); // IDs numéricos empezando desde 1
  });
  return map;
};

// Convertir GanttTask[] al formato de wx-react-gantt
const convertToWxTasks = (tasks: GanttTask[], idMap: Map<string, number>) => {
  return tasks.map((task) => {
    const start = parseDate(task.fecha_inicio) || new Date();
    const end = parseDate(task.fecha_termino) || addDays(start, 1);
    const duration = Math.max(1, differenceInDays(end, start));

    return {
      id: idMap.get(task.id) || 0,
      text: task.label,
      start,
      end,
      duration,
      progress: task.progreso || 0,
      type: task.isCompleted ? "milestone" : "task",
      lazy: false,
      open: true,
    };
  });
};

// Convertir dependencias al formato de links de wx-react-gantt
const convertToWxLinks = (tasks: GanttTask[], idMap: Map<string, number>) => {
  const links: { id: number; source: number; target: number; type: string }[] = [];
  let linkId = 1;

  tasks.forEach((task) => {
    if (task.dependencias && task.dependencias.length > 0) {
      task.dependencias.forEach((depId) => {
        const sourceId = idMap.get(depId);
        const targetId = idMap.get(task.id);
        if (sourceId && targetId) {
          links.push({
            id: linkId++,
            source: sourceId,
            target: targetId,
            type: "e2s", // end-to-start
          });
        }
      });
    }
  });

  return links;
};

export function SvarGanttChart({ tasks, profiles, onRefresh }: SvarGanttChartProps) {
  const [savingTask, setSavingTask] = useState<string | null>(null);

  // Crear mapa de IDs string a números
  const idMap = useMemo(() => createIdMap(tasks), [tasks]);

  // Convertir tareas al formato de la librería
  const wxTasks = useMemo(() => convertToWxTasks(tasks, idMap), [tasks, idMap]);
  const wxLinks = useMemo(() => convertToWxLinks(tasks, idMap), [tasks, idMap]);

  // Configuración de escalas
  const scales = useMemo(() => [
    { unit: "month", step: 1, format: "MMMM yyyy" },
    { unit: "week", step: 1, format: "'Semana' w" },
    { unit: "day", step: 1, format: "d" },
  ], []);

  // Columnas del panel izquierdo
  const columns = useMemo(() => [
    { 
      id: "text", 
      header: "Tarea", 
      flexgrow: 1,
      width: 200,
    },
    { 
      id: "start", 
      header: "Inicio", 
      width: 90, 
      align: "center" as const,
    },
    { 
      id: "end", 
      header: "Fin", 
      width: 90, 
      align: "center" as const,
    },
    { 
      id: "progress", 
      header: "%", 
      width: 50, 
      align: "center" as const,
    },
  ], []);

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.isCompleted).length;
    const withDates = tasks.filter(t => t.fecha_inicio).length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, withDates, progress };
  }, [tasks]);

  // Handler para actualizar tareas en Supabase
  const updateWorkflowItem = useCallback(async (
    taskId: string,
    updates: Partial<{
      fecha_inicio: string;
      fecha_termino: string;
      asignado_a: string | null;
      dependencias: string[];
      progreso: number;
    }>
  ) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task?.contratoId) return;

    setSavingTask(taskId);

    try {
      const { data: workflow, error: wfError } = await supabase
        .from("workflows")
        .select("id, items")
        .eq("contrato_id", task.contratoId)
        .maybeSingle();

      if (wfError) throw wfError;
      if (!workflow) {
        toast.error("No se encontró el workflow");
        return;
      }

      const items = (workflow.items as any[]) || [];

      const updatedItems = items.map((item: any) => {
        if (item.id === taskId) {
          const newItem = { ...item, ...updates };
          if (updates.asignado_a !== undefined) {
            const profile = profiles.find(p => p.id === updates.asignado_a);
            newItem.asignado_nombre = profile?.full_name || null;
          }
          return newItem;
        }
        return item;
      });

      const { error: updateError } = await supabase
        .from("workflows")
        .update({ items: updatedItems, updated_at: new Date().toISOString() })
        .eq("id", workflow.id);

      if (updateError) throw updateError;

      toast.success("Actualizado correctamente");
      onRefresh?.();
    } catch (error) {
      console.error("Error updating:", error);
      toast.error("Error al actualizar");
    }

    setSavingTask(null);
  }, [tasks, profiles, onRefresh]);

  // Handlers para eventos del Gantt
  const handleAction = useCallback((action: any) => {
    console.log("Gantt action:", action);

    if (action.type === "update-task") {
      const { id, task: updatedTask } = action;
      
      // Actualizar fechas y progreso
      updateWorkflowItem(id, {
        fecha_inicio: updatedTask.start?.toISOString(),
        fecha_termino: updatedTask.end?.toISOString(),
        progreso: updatedTask.progress,
      });
    }

    if (action.type === "add-link") {
      const { link } = action;
      const task = tasks.find(t => t.id === link.target);
      if (task) {
        const deps = task.dependencias || [];
        if (!deps.includes(link.source)) {
          updateWorkflowItem(link.target, {
            dependencias: [...deps, link.source],
          });
        }
      }
    }

    if (action.type === "delete-link") {
      const { id } = action;
      const [source, target] = id.split("-");
      const task = tasks.find(t => t.id === target);
      if (task) {
        const deps = task.dependencias || [];
        updateWorkflowItem(target, {
          dependencias: deps.filter(d => d !== source),
        });
      }
    }
  }, [tasks, updateWorkflowItem]);

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
    <div className="border rounded-lg bg-card overflow-hidden shadow-sm svar-gantt-container">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-muted/30 to-transparent">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Diagrama Gantt</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="flex items-center gap-3 text-xs">
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
      </div>

      {/* Gantt Chart */}
      <div className="h-[500px] relative">
        <Gantt
          tasks={wxTasks}
          links={wxLinks}
          scales={scales}
          columns={columns}
          cellWidth={40}
          cellHeight={38}
          scaleHeight={50}
          readonly={false}
        />
      </div>

      {/* Saving indicator */}
      {savingTask && (
        <div className="absolute top-14 right-4 flex items-center gap-2 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
          Guardando...
        </div>
      )}
    </div>
  );
}

export default SvarGanttChart;

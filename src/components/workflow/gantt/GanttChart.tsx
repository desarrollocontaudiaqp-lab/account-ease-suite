import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { format, parseISO, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import {
  GripVertical,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Calendar,
  User,
  Link2,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GanttTask {
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

interface GanttChartProps {
  tasks: GanttTask[];
  profiles: { id: string; full_name: string | null }[];
  onRefresh?: () => void;
}

type ZoomLevel = "day" | "week" | "month";

const CELL_WIDTH = {
  day: 40,
  week: 120,
  month: 200,
};

const typeColors: Record<string, string> = {
  input: "bg-emerald-500",
  tarea: "bg-orange-500",
  output: "bg-purple-500",
  supervision: "bg-red-500",
  actividad: "bg-blue-500",
};

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export function GanttChart({ tasks, profiles, onRefresh }: GanttChartProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("day");
  const [draggingTask, setDraggingTask] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [resizing, setResizing] = useState<{ taskId: string; edge: "start" | "end" } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Calculate date range for the view
  const dateRange = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(addDays(currentDate, 60));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Group dates by week/month for headers
  const groupedDates = useMemo(() => {
    const groups: { label: string; days: Date[] }[] = [];
    let currentGroup: { label: string; days: Date[] } | null = null;

    dateRange.forEach((date) => {
      const label = zoomLevel === "month" 
        ? format(date, "MMMM yyyy", { locale: es })
        : format(date, "'Sem' w - MMMM", { locale: es });

      if (!currentGroup || currentGroup.label !== label) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { label, days: [date] };
      } else {
        currentGroup.days.push(date);
      }
    });

    if (currentGroup) groups.push(currentGroup);
    return groups;
  }, [dateRange, zoomLevel]);

  const cellWidth = CELL_WIDTH[zoomLevel];
  const totalWidth = dateRange.length * cellWidth;

  // Calculate task bar position and width
  const getTaskBar = useCallback((task: GanttTask) => {
    if (!task.fecha_inicio) return null;

    const startDate = parseISO(task.fecha_inicio);
    const endDate = task.fecha_termino ? parseISO(task.fecha_termino) : addDays(startDate, 1);
    
    const startIdx = dateRange.findIndex(d => isSameDay(d, startDate));
    const endIdx = dateRange.findIndex(d => isSameDay(d, endDate));

    if (startIdx === -1) return null;

    const left = startIdx * cellWidth;
    const width = Math.max((endIdx - startIdx + 1) * cellWidth, cellWidth);

    return { left, width, startIdx, endIdx };
  }, [dateRange, cellWidth]);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, taskId: string, currentLeft: number) => {
    e.dataTransfer.effectAllowed = "move";
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset(e.clientX - rect.left);
    setDraggingTask(taskId);
  };

  // Handle drop
  const handleDrop = async (e: React.DragEvent, task: GanttTask) => {
    e.preventDefault();
    if (!draggingTask || !task.contratoId) return;

    const scrollLeft = scrollRef.current?.scrollLeft || 0;
    const containerRect = scrollRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const x = e.clientX - containerRect.left + scrollLeft - dragOffset - 280; // 280 = task name column
    const dayIndex = Math.floor(x / cellWidth);
    const newStartDate = dateRange[Math.max(0, Math.min(dayIndex, dateRange.length - 1))];

    if (!newStartDate) return;

    // Calculate duration to maintain
    const oldStart = task.fecha_inicio ? parseISO(task.fecha_inicio) : new Date();
    const oldEnd = task.fecha_termino ? parseISO(task.fecha_termino) : oldStart;
    const duration = differenceInDays(oldEnd, oldStart);

    const newEndDate = addDays(newStartDate, duration);

    await updateTaskDates(task, newStartDate, newEndDate);
    setDraggingTask(null);
  };

  // Update task dates in database
  const updateTaskDates = async (task: GanttTask, start: Date, end: Date) => {
    if (!task.contratoId) return;
    
    setSaving(task.id);

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
        if (item.id === task.id) {
          return {
            ...item,
            fecha_inicio: start.toISOString(),
            fecha_termino: end.toISOString(),
          };
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
      console.error("Error updating dates:", error);
      toast.error("Error al actualizar fechas");
    }

    setSaving(null);
  };

  // Update dependency
  const updateDependency = async (task: GanttTask, dependencyId: string | null) => {
    if (!task.contratoId) return;
    
    setSaving(task.id);

    try {
      const { data: workflow, error: wfError } = await supabase
        .from("workflows")
        .select("id, items")
        .eq("contrato_id", task.contratoId)
        .maybeSingle();

      if (wfError) throw wfError;
      if (!workflow) return;

      const items = (workflow.items as any[]) || [];
      const updatedItems = items.map((item: any) => {
        if (item.id === task.id) {
          const deps = item.dependencias || [];
          if (dependencyId) {
            if (!deps.includes(dependencyId)) {
              return { ...item, dependencias: [...deps, dependencyId] };
            }
          }
        }
        return item;
      });

      const { error: updateError } = await supabase
        .from("workflows")
        .update({ items: updatedItems, updated_at: new Date().toISOString() })
        .eq("id", workflow.id);

      if (updateError) throw updateError;

      toast.success("Dependencia agregada");
      onRefresh?.();
    } catch (error) {
      console.error("Error updating dependency:", error);
      toast.error("Error al actualizar dependencia");
    }

    setSaving(null);
  };

  // Update assignee
  const updateAssignee = async (task: GanttTask, userId: string | null) => {
    if (!task.contratoId) return;
    
    setSaving(task.id);

    try {
      const { data: workflow, error: wfError } = await supabase
        .from("workflows")
        .select("id, items")
        .eq("contrato_id", task.contratoId)
        .maybeSingle();

      if (wfError) throw wfError;
      if (!workflow) return;

      const items = (workflow.items as any[]) || [];
      const updatedItems = items.map((item: any) => {
        if (item.id === task.id) {
          return { ...item, asignado_a: userId };
        }
        return item;
      });

      const { error: updateError } = await supabase
        .from("workflows")
        .update({ items: updatedItems, updated_at: new Date().toISOString() })
        .eq("id", workflow.id);

      if (updateError) throw updateError;

      toast.success("Responsable actualizado");
      onRefresh?.();
    } catch (error) {
      console.error("Error updating assignee:", error);
      toast.error("Error al actualizar responsable");
    }

    setSaving(null);
  };

  // Draw dependency lines
  const renderDependencyLines = () => {
    const lines: JSX.Element[] = [];

    tasks.forEach((task) => {
      if (!task.dependencias?.length) return;

      const taskBar = getTaskBar(task);
      if (!taskBar) return;

      task.dependencias.forEach((depId) => {
        const depTask = tasks.find(t => t.id === depId);
        if (!depTask) return;

        const depBar = getTaskBar(depTask);
        if (!depBar) return;

        const taskIdx = tasks.indexOf(task);
        const depIdx = tasks.indexOf(depTask);

        const x1 = depBar.left + depBar.width + 280;
        const y1 = depIdx * 48 + 24;
        const x2 = taskBar.left + 280;
        const y2 = taskIdx * 48 + 24;

        lines.push(
          <svg
            key={`${depId}-${task.id}`}
            className="absolute top-0 left-0 pointer-events-none"
            style={{ width: totalWidth + 280, height: tasks.length * 48 }}
          >
            <path
              d={`M ${x1} ${y1} C ${x1 + 20} ${y1}, ${x2 - 20} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeDasharray="4 2"
              markerEnd="url(#arrowhead)"
            />
            <defs>
              <marker
                id="arrowhead"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 6 3, 0 6"
                  fill="hsl(var(--primary))"
                />
              </marker>
            </defs>
          </svg>
        );
      });
    });

    return lines;
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addDays(currentDate, -30))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentDate(new Date())}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addDays(currentDate, 30))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium ml-2">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={zoomLevel === "day" ? "default" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => setZoomLevel("day")}
          >
            Día
          </Button>
          <Button
            variant={zoomLevel === "week" ? "default" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => setZoomLevel("week")}
          >
            Semana
          </Button>
          <Button
            variant={zoomLevel === "month" ? "default" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => setZoomLevel("month")}
          >
            Mes
          </Button>
        </div>
      </div>

      {/* Chart */}
      <div className="flex">
        {/* Task Names Column */}
        <div className="w-[280px] flex-shrink-0 border-r bg-muted/20">
          {/* Header */}
          <div className="h-[60px] border-b flex items-center px-3 font-medium text-sm">
            Tareas
          </div>

          {/* Task rows */}
          {tasks.map((task, idx) => (
            <div
              key={task.id}
              className={cn(
                "h-12 flex items-center gap-2 px-3 border-b text-sm",
                idx % 2 === 0 ? "bg-background" : "bg-muted/10"
              )}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              <div className={cn("w-1.5 h-6 rounded-full", typeColors[task.tipo] || "bg-gray-400")} />
              <span className="truncate flex-1">{task.label}</span>
              {saving === task.id && <Loader2 className="h-3 w-3 animate-spin" />}
            </div>
          ))}
        </div>

        {/* Timeline */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div style={{ width: totalWidth, minWidth: "100%" }}>
            {/* Date Headers */}
            <div className="h-[60px] border-b flex flex-col">
              {/* Month/Week row */}
              <div className="h-[30px] flex">
                {groupedDates.map((group, idx) => (
                  <div
                    key={idx}
                    className="border-r flex items-center justify-center text-xs font-medium capitalize"
                    style={{ width: group.days.length * cellWidth }}
                  >
                    {group.label}
                  </div>
                ))}
              </div>

              {/* Day row */}
              <div className="h-[30px] flex">
                {dateRange.map((date, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center justify-center text-xs border-r",
                      isWeekend(date) && "bg-muted/50",
                      isSameDay(date, new Date()) && "bg-primary/10 font-bold text-primary"
                    )}
                    style={{ width: cellWidth }}
                  >
                    {format(date, "d")}
                  </div>
                ))}
              </div>
            </div>

            {/* Task Bars */}
            <div className="relative" style={{ height: tasks.length * 48 }}>
              {/* Grid lines */}
              {dateRange.map((date, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "absolute top-0 bottom-0 border-r",
                    isWeekend(date) && "bg-muted/30",
                    isSameDay(date, new Date()) && "bg-primary/5"
                  )}
                  style={{ left: idx * cellWidth, width: cellWidth }}
                />
              ))}

              {/* Row backgrounds */}
              {tasks.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "absolute left-0 right-0 h-12 border-b",
                    idx % 2 === 0 ? "bg-background/50" : "bg-transparent"
                  )}
                  style={{ top: idx * 48 }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, tasks[idx])}
                />
              ))}

              {/* Dependency lines */}
              {renderDependencyLines()}

              {/* Task bars */}
              {tasks.map((task, idx) => {
                const bar = getTaskBar(task);
                if (!bar) return null;

                return (
                  <Tooltip key={task.id} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "absolute h-8 rounded-md shadow-sm cursor-move transition-all",
                          "flex items-center gap-1 px-2 text-white text-xs font-medium",
                          typeColors[task.tipo] || "bg-gray-400",
                          task.isCompleted && "opacity-60",
                          draggingTask === task.id && "opacity-50"
                        )}
                        style={{
                          left: bar.left,
                          top: idx * 48 + 8,
                          width: bar.width,
                        }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id, bar.left)}
                      >
                        {/* Progress bar inside */}
                        <div
                          className="absolute inset-0 rounded-md bg-white/20"
                          style={{ width: `${task.progreso}%` }}
                        />

                        <span className="relative truncate">{task.label}</span>

                        {task.asignado_nombre && (
                          <Avatar className="h-5 w-5 border border-white/30 ml-auto">
                            <AvatarFallback className="text-[8px] bg-white/20">
                              {getInitials(task.asignado_nombre)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[300px]">
                      <div className="space-y-2">
                        <p className="font-semibold">{task.label}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Inicio:</span>
                            <span className="ml-1">
                              {task.fecha_inicio 
                                ? format(parseISO(task.fecha_inicio), "dd MMM yyyy", { locale: es })
                                : "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Fin:</span>
                            <span className="ml-1">
                              {task.fecha_termino 
                                ? format(parseISO(task.fecha_termino), "dd MMM yyyy", { locale: es })
                                : "-"}
                            </span>
                          </div>
                        </div>
                        <Progress value={task.progreso} className="h-1.5" />
                        <p className="text-xs text-muted-foreground">
                          {task.progreso}% completado
                        </p>
                        {task.dependencias?.length ? (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Link2 className="h-3 w-3" />
                            {task.dependencias.length} dependencia(s)
                          </p>
                        ) : null}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Calendar className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">Sin tareas para mostrar</p>
          <p className="text-sm">Agrega fechas a las actividades para verlas en el Gantt</p>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import {
  Table,
  LayoutGrid,
  List,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  client: string;
  contract: string;
  startDate: string;
  endDate: string;
  status: "Pendiente" | "En Proceso" | "Terminado";
  progress: number;
  assignee: string;
}

const tasks: Task[] = [
  {
    id: "1",
    title: "Declaración mensual IGV",
    client: "Empresa ABC S.A.C.",
    contract: "CTR-2024-001",
    startDate: "2024-12-01",
    endDate: "2024-12-15",
    status: "Terminado",
    progress: 100,
    assignee: "María García",
  },
  {
    id: "2",
    title: "Balance General",
    client: "Empresa ABC S.A.C.",
    contract: "CTR-2024-001",
    startDate: "2024-12-10",
    endDate: "2024-12-25",
    status: "En Proceso",
    progress: 60,
    assignee: "María García",
  },
  {
    id: "3",
    title: "Planilla de sueldos",
    client: "Inversiones XYZ E.I.R.L.",
    contract: "CTR-2024-002",
    startDate: "2024-12-05",
    endDate: "2024-12-20",
    status: "En Proceso",
    progress: 45,
    assignee: "Carlos López",
  },
  {
    id: "4",
    title: "Trámite SUNARP",
    client: "Comercial Delta S.A.",
    contract: "CTR-2024-003",
    startDate: "2024-12-15",
    endDate: "2024-12-30",
    status: "Pendiente",
    progress: 0,
    assignee: "Ana Rodríguez",
  },
  {
    id: "5",
    title: "Auditoría interna",
    client: "Tech Solutions Perú",
    contract: "CTR-2024-004",
    startDate: "2024-12-18",
    endDate: "2025-01-10",
    status: "Pendiente",
    progress: 0,
    assignee: "Luis Martínez",
  },
];

const statusStyles = {
  Pendiente: "bg-gray-100 text-gray-800 border-gray-200",
  "En Proceso": "bg-blue-100 text-blue-800 border-blue-200",
  Terminado: "bg-green-100 text-green-800 border-green-200",
};

const statusColors = {
  Pendiente: "bg-gray-400",
  "En Proceso": "bg-blue-500",
  Terminado: "bg-green-500",
};

// Simple Gantt-like visualization
const GanttView = ({ tasks }: { tasks: Task[] }) => {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Diciembre 2024</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Header */}
          <div className="flex border-b border-border">
            <div className="w-64 flex-shrink-0 p-3 bg-muted/50 font-medium text-sm text-muted-foreground">
              Actividad
            </div>
            <div className="flex-1 flex">
              {days.map((day) => (
                <div
                  key={day}
                  className={cn(
                    "flex-1 min-w-[30px] p-2 text-center text-xs text-muted-foreground border-l border-border",
                    day === 20 && "bg-primary/10"
                  )}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {tasks.map((task) => {
            const startDay = parseInt(task.startDate.split("-")[2]);
            const endDay = parseInt(task.endDate.split("-")[2]);
            
            return (
              <div key={task.id} className="flex border-b border-border hover:bg-muted/30">
                <div className="w-64 flex-shrink-0 p-3">
                  <p className="font-medium text-sm text-foreground truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{task.client}</p>
                </div>
                <div className="flex-1 flex relative">
                  {days.map((day) => (
                    <div
                      key={day}
                      className={cn(
                        "flex-1 min-w-[30px] border-l border-border",
                        day === 20 && "bg-primary/5"
                      )}
                    />
                  ))}
                  {/* Task bar */}
                  <div
                    className={cn(
                      "absolute top-2 bottom-2 rounded",
                      statusColors[task.status]
                    )}
                    style={{
                      left: `${((startDay - 1) / 31) * 100}%`,
                      width: `${((endDay - startDay + 1) / 31) * 100}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-border flex gap-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-gray-400" />
          <span className="text-xs text-muted-foreground">Pendiente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-blue-500" />
          <span className="text-xs text-muted-foreground">En Proceso</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-green-500" />
          <span className="text-xs text-muted-foreground">Terminado</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="h-3 w-8 bg-primary/10" />
          <span className="text-xs text-muted-foreground">Hoy (20 Dic)</span>
        </div>
      </div>
    </div>
  );
};

// Kanban View
const KanbanView = ({ tasks }: { tasks: Task[] }) => {
  const columns = [
    { status: "Pendiente" as const, icon: Circle, color: "text-gray-500" },
    { status: "En Proceso" as const, icon: Clock, color: "text-blue-500" },
    { status: "Terminado" as const, icon: CheckCircle, color: "text-green-500" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map((column) => {
        const Icon = column.icon;
        const columnTasks = tasks.filter((t) => t.status === column.status);
        
        return (
          <div key={column.status} className="bg-muted/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Icon className={cn("h-5 w-5", column.color)} />
              <h3 className="font-semibold text-foreground">{column.status}</h3>
              <Badge variant="secondary" className="ml-auto">
                {columnTasks.length}
              </Badge>
            </div>
            
            <div className="space-y-3">
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-card rounded-lg border border-border p-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <p className="font-medium text-foreground text-sm mb-1">{task.title}</p>
                  <p className="text-xs text-muted-foreground mb-3">{task.client}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{task.assignee}</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {task.endDate.split("-").slice(1).join("/")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Table View
const TableView = ({ tasks }: { tasks: Task[] }) => (
  <div className="bg-card rounded-xl border border-border overflow-hidden">
    <table className="w-full">
      <thead>
        <tr className="bg-muted/50">
          <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
            Actividad
          </th>
          <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
            Cliente
          </th>
          <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
            Contrato
          </th>
          <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
            Responsable
          </th>
          <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
            Fechas
          </th>
          <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
            Estado
          </th>
          <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
            Progreso
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {tasks.map((task) => (
          <tr key={task.id} className="table-row-hover">
            <td className="px-6 py-4">
              <span className="font-medium text-foreground">{task.title}</span>
            </td>
            <td className="px-6 py-4">
              <span className="text-sm text-muted-foreground">{task.client}</span>
            </td>
            <td className="px-6 py-4">
              <span className="text-sm font-mono text-foreground">{task.contract}</span>
            </td>
            <td className="px-6 py-4">
              <span className="text-sm text-muted-foreground">{task.assignee}</span>
            </td>
            <td className="px-6 py-4">
              <span className="text-xs text-muted-foreground">
                {task.startDate.split("-").slice(1).join("/")} - {task.endDate.split("-").slice(1).join("/")}
              </span>
            </td>
            <td className="px-6 py-4">
              <Badge variant="outline" className={statusStyles[task.status]}>
                {task.status}
              </Badge>
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[80px]">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {task.progress}%
                </span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const CalendarioTrabajo = () => {
  const [view, setView] = useState("gantt");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Calendario de Trabajo
          </h1>
          <p className="text-muted-foreground mt-1">
            Vista de actividades y tareas asignadas
          </p>
        </div>
        <Button className="btn-gradient gap-2">
          <Plus className="h-4 w-4" />
          Nueva Actividad
        </Button>
      </div>

      {/* View Switcher */}
      <Tabs value={view} onValueChange={setView}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="gantt" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Gantt
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-2">
              <List className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-2">
              <Table className="h-4 w-4" />
              Tabla
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Pendientes:</span>
              <span className="font-medium text-foreground">
                {tasks.filter((t) => t.status === "Pendiente").length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">En Proceso:</span>
              <span className="font-medium text-foreground">
                {tasks.filter((t) => t.status === "En Proceso").length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Terminados:</span>
              <span className="font-medium text-foreground">
                {tasks.filter((t) => t.status === "Terminado").length}
              </span>
            </div>
          </div>
        </div>

        <TabsContent value="gantt" className="mt-6">
          <GanttView tasks={tasks} />
        </TabsContent>

        <TabsContent value="kanban" className="mt-6">
          <KanbanView tasks={tasks} />
        </TabsContent>

        <TabsContent value="table" className="mt-6">
          <TableView tasks={tasks} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CalendarioTrabajo;

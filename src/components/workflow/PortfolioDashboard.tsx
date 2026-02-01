import { useState, useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Briefcase, 
  FileText, 
  ListTodo, 
  Package, 
  User,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  ArrowRight,
  Activity,
  Workflow,
  Building2,
  CalendarDays,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface PortfolioDashboardProps {
  carteraId: string;
  carteraNombre: string;
  especialidad?: string | null;
  miembros?: any[];
  stats?: {
    total: number;
    en_gestion: number;
    finalizados: number;
  };
  onViewContract?: (contractId: string) => void;
}

interface WorkflowItem {
  id: string;
  tipo: string;
  titulo: string;
  completado: boolean;
  asignado_a?: string;
  orden: number;
}

interface WorkflowWithDetails {
  id: string;
  codigo: string;
  contrato_id: string;
  items: WorkflowItem[];
  contrato?: {
    numero: string;
    cliente: string;
    status: string;
  };
  progress: number;
  totalItems: number;
  completedItems: number;
}

interface ContractWithProgress {
  id: string;
  numero: string;
  cliente: string;
  clienteCodigo: string;
  descripcion: string;
  status: string;
  fecha_inicio: string;
  tipo_servicio: string;
  progress: number;
  workflowCode?: string;
}

interface TaskItem {
  id: string;
  titulo: string;
  contrato: string;
  contratoId: string;
  asignado_a?: string;
  asignado_nombre?: string;
  completado: boolean;
}

interface DeliverableItem {
  id: string;
  titulo: string;
  contrato: string;
  contratoId: string;
  completado: boolean;
  workflowCode?: string;
}

const statusStyles: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  aprobado: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  en_gestion: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  activo: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  finalizado: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
};

const statusLabels: Record<string, string> = {
  borrador: "Borrador",
  aprobado: "Aprobado",
  en_gestion: "En Gestión",
  activo: "Activo",
  finalizado: "Finalizado",
};

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export function PortfolioDashboard({ 
  carteraId, 
  carteraNombre, 
  especialidad, 
  miembros = [], 
  stats,
  onViewContract 
}: PortfolioDashboardProps) {
  const [workflows, setWorkflows] = useState<WorkflowWithDetails[]>([]);
  const [contracts, setContracts] = useState<ContractWithProgress[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [deliverables, setDeliverables] = useState<DeliverableItem[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [carteraId]);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      // Fetch cartera clients
      const { data: carteraClients } = await supabase
        .from("cartera_clientes")
        .select("cliente_id")
        .eq("cartera_id", carteraId);

      const clienteIds = (carteraClients || []).map(c => c.cliente_id);

      if (clienteIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch contracts for this cartera
      const { data: contratosData } = await supabase
        .from("contratos")
        .select(`
          id, numero, descripcion, tipo_servicio, fecha_inicio, status,
          cliente:clientes(id, razon_social, codigo)
        `)
        .in("cliente_id", clienteIds)
        .neq("status", "borrador")
        .order("fecha_inicio", { ascending: false })
        .limit(10);

      // Fetch all workflows for these contracts
      const contratoIds = (contratosData || []).map(c => c.id);
      const { data: workflowsData } = await supabase
        .from("workflows")
        .select("id, codigo, contrato_id, items")
        .in("contrato_id", contratoIds);

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name");

      const pMap: Record<string, string> = {};
      (profilesData || []).forEach(p => {
        pMap[p.id] = p.full_name || "Sin nombre";
      });
      setProfilesMap(pMap);

      // Process workflows with progress
      const processedWorkflows: WorkflowWithDetails[] = [];
      const allTasks: TaskItem[] = [];
      const allDeliverables: DeliverableItem[] = [];

      (workflowsData || []).forEach((wf: any) => {
        const items = (wf.items as WorkflowItem[]) || [];
        const contrato = contratosData?.find(c => c.id === wf.contrato_id);
        
        const totalItems = items.length;
        const completedItems = items.filter(i => i.completado).length;
        const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        processedWorkflows.push({
          id: wf.id,
          codigo: wf.codigo,
          contrato_id: wf.contrato_id,
          items,
          contrato: contrato ? {
            numero: contrato.numero,
            cliente: (contrato.cliente as any)?.razon_social || "Sin cliente",
            status: contrato.status,
          } : undefined,
          progress,
          totalItems,
          completedItems,
        });

        // Extract tasks (tareas)
        items.filter(i => i.tipo === "tarea").forEach(task => {
          allTasks.push({
            id: task.id,
            titulo: task.titulo,
            contrato: (contrato?.cliente as any)?.razon_social || "Sin cliente",
            contratoId: wf.contrato_id,
            asignado_a: task.asignado_a,
            asignado_nombre: task.asignado_a ? pMap[task.asignado_a] : undefined,
            completado: task.completado,
          });
        });

        // Extract outputs (deliverables)
        items.filter(i => i.tipo === "output").forEach(output => {
          allDeliverables.push({
            id: output.id,
            titulo: output.titulo,
            contrato: (contrato?.cliente as any)?.razon_social || "Sin cliente",
            contratoId: wf.contrato_id,
            completado: output.completado,
            workflowCode: wf.codigo,
          });
        });
      });

      setWorkflows(processedWorkflows);
      setTasks(allTasks);
      setDeliverables(allDeliverables);

      // Process contracts with progress
      const processedContracts: ContractWithProgress[] = (contratosData || []).map(c => {
        const wf = workflowsData?.find((w: any) => w.contrato_id === c.id);
        const items = wf ? (Array.isArray(wf.items) ? wf.items as unknown as WorkflowItem[] : []) : [];
        const totalItems = items.length;
        const completedItems = items.filter((i: any) => i.completado).length;
        const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        return {
          id: c.id,
          numero: c.numero,
          cliente: (c.cliente as any)?.razon_social || "Sin cliente",
          clienteCodigo: (c.cliente as any)?.codigo || "",
          descripcion: c.descripcion,
          status: c.status,
          fecha_inicio: c.fecha_inicio,
          tipo_servicio: c.tipo_servicio,
          progress,
          workflowCode: wf?.codigo,
        };
      });

      setContracts(processedContracts);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }

    setLoading(false);
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const pendingTasks = tasks.filter(t => !t.completado).length;
    const completedTasks = tasks.filter(t => t.completado).length;
    const pendingDeliverables = deliverables.filter(d => !d.completado).length;
    const completedDeliverables = deliverables.filter(d => d.completado).length;
    const avgProgress = workflows.length > 0 
      ? Math.round(workflows.reduce((acc, w) => acc + w.progress, 0) / workflows.length)
      : 0;

    return {
      pendingTasks,
      completedTasks,
      pendingDeliverables,
      completedDeliverables,
      avgProgress,
      totalWorkflows: workflows.length,
    };
  }, [tasks, deliverables, workflows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
          <Briefcase className="h-7 w-7 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground">{carteraNombre}</h2>
          <p className="text-sm text-muted-foreground">{especialidad || "Cartera de trabajo"}</p>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Workflow className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summaryStats.totalWorkflows}</p>
                <p className="text-xs text-muted-foreground">Workflows Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <ListTodo className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summaryStats.pendingTasks}</p>
                <p className="text-xs text-muted-foreground">Tareas Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summaryStats.pendingDeliverables}</p>
                <p className="text-xs text-muted-foreground">Entregables Pend.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summaryStats.avgProgress}%</p>
                <p className="text-xs text-muted-foreground">Progreso Promedio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <Tabs defaultValue="workflows" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="workflows" className="gap-2">
            <Workflow className="h-4 w-4" />
            <span className="hidden sm:inline">Workflows</span>
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Contratos</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <ListTodo className="h-4 w-4" />
            <span className="hidden sm:inline">Tareas</span>
          </TabsTrigger>
          <TabsTrigger value="deliverables" className="gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Entregables</span>
          </TabsTrigger>
        </TabsList>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Workflow className="h-5 w-5 text-primary" />
                Workflows Recientes
              </CardTitle>
              <CardDescription>Flujos de trabajo asignados a esta cartera</CardDescription>
            </CardHeader>
            <CardContent>
              {workflows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Workflow className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No hay workflows asignados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workflows.map((wf) => (
                    <div 
                      key={wf.id} 
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => onViewContract?.(wf.contrato_id)}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        wf.progress === 100 ? "bg-green-100 dark:bg-green-900/30" : "bg-primary/10"
                      )}>
                        {wf.progress === 100 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <Workflow className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-semibold text-primary">{wf.codigo}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-sm truncate">{wf.contrato?.cliente}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={wf.progress} className="h-2 flex-1 max-w-[200px]" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {wf.completedItems}/{wf.totalItems} items
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusStyles[wf.contrato?.status || ""]}>
                          {statusLabels[wf.contrato?.status || ""] || wf.contrato?.status}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-600" />
                Contratos Recientes
              </CardTitle>
              <CardDescription>Últimos contratos asociados a esta cartera</CardDescription>
            </CardHeader>
            <CardContent>
              {contracts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No hay contratos registrados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contracts.map((contract) => (
                    <div 
                      key={contract.id} 
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <h4 className="font-semibold truncate">{contract.cliente}</h4>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <span className="font-mono">{contract.numero}</span>
                            {contract.clienteCodigo && (
                              <>
                                <span>•</span>
                                <span>{contract.clienteCodigo}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge className={cn("text-xs", statusStyles[contract.status])}>
                              {statusLabels[contract.status] || contract.status}
                            </Badge>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <CalendarDays className="h-3 w-3" />
                              {format(parseISO(contract.fecha_inicio), "dd MMM yyyy", { locale: es })}
                            </span>
                            {contract.workflowCode && (
                              <span className="text-xs font-mono text-primary">{contract.workflowCode}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1.5"
                            onClick={() => onViewContract?.(contract.id)}
                          >
                            <Eye className="h-4 w-4" />
                            Ver
                          </Button>
                          <div className="flex items-center gap-2">
                            <Progress value={contract.progress} className="h-2 w-20" />
                            <span className="text-xs font-medium">{contract.progress}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Pending Tasks */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  Tareas Pendientes
                  <Badge variant="secondary" className="ml-auto">{summaryStats.pendingTasks}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-80 overflow-y-auto">
                {tasks.filter(t => !t.completado).length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay tareas pendientes</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.filter(t => !t.completado).map((task) => (
                      <div 
                        key={task.id} 
                        className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30"
                      >
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.titulo}</p>
                          <p className="text-xs text-muted-foreground truncate">{task.contrato}</p>
                          {task.asignado_nombre && (
                            <div className="flex items-center gap-1 mt-1">
                              <Avatar className="h-4 w-4">
                                <AvatarFallback className="text-[8px]">
                                  {getInitials(task.asignado_nombre)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">{task.asignado_nombre}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completed Tasks */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Tareas Completadas
                  <Badge variant="secondary" className="ml-auto">{summaryStats.completedTasks}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-80 overflow-y-auto">
                {tasks.filter(t => t.completado).length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <ListTodo className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay tareas completadas</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.filter(t => t.completado).slice(0, 10).map((task) => (
                      <div 
                        key={task.id} 
                        className="flex items-start gap-3 p-3 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/30"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate line-through opacity-70">{task.titulo}</p>
                          <p className="text-xs text-muted-foreground truncate">{task.contrato}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Deliverables Tab */}
        <TabsContent value="deliverables" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Pending Deliverables */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  Entregables Pendientes
                  <Badge variant="secondary" className="ml-auto">{summaryStats.pendingDeliverables}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-80 overflow-y-auto">
                {deliverables.filter(d => !d.completado).length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Todos los entregables están completos</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {deliverables.filter(d => !d.completado).map((del) => (
                      <div 
                        key={del.id} 
                        className="flex items-start gap-3 p-3 rounded-lg bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200/50 dark:border-purple-800/30"
                      >
                        <Package className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{del.titulo}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground truncate">{del.contrato}</p>
                            {del.workflowCode && (
                              <span className="text-[10px] font-mono text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-1.5 rounded">
                                {del.workflowCode}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completed Deliverables */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Entregables Completados
                  <Badge variant="secondary" className="ml-auto">{summaryStats.completedDeliverables}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-80 overflow-y-auto">
                {deliverables.filter(d => d.completado).length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay entregables completados</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {deliverables.filter(d => d.completado).slice(0, 10).map((del) => (
                      <div 
                        key={del.id} 
                        className="flex items-start gap-3 p-3 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/30"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate line-through opacity-70">{del.titulo}</p>
                          <p className="text-xs text-muted-foreground truncate">{del.contrato}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Team Section */}
      {miembros && miembros.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              Equipo ({miembros.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {miembros.map((m: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(m.profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.profile?.full_name || m.profile?.email}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {m.rol_en_cartera}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Users,
  GripVertical,
  CheckCircle2,
  Circle,
  ArrowRight,
  Building2,
  FileCheck,
  Save,
  Edit2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WorkFlowItem {
  id: string;
  tipo: "actividad" | "input" | "tarea" | "output" | "supervision";
  titulo: string;
  descripcion?: string;
  asignado_a?: string;
  rol?: string;
  completado: boolean;
  orden: number;
  conexiones?: string[];
}

interface MiembroCartera {
  user_id: string;
  rol_en_cartera: string;
  profile: {
    full_name: string | null;
    email: string;
  } | null;
}

interface ContratoWorkflow {
  id: string;
  numero: string;
  descripcion: string;
  tipo_servicio: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  cliente: {
    razon_social: string;
    codigo: string;
  };
  cartera: {
    id: string;
    nombre: string;
    especialidad: string | null;
  } | null;
}

interface WorkFlowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: ContratoWorkflow;
  miembros: MiembroCartera[];
}

const columnConfig = [
  { id: "actividades", label: "Actividades", shortLabel: "A", color: "bg-sky-500", tipo: "actividad" },
  { id: "inputs", label: "Inputs", shortLabel: "I", color: "bg-emerald-500", tipo: "input" },
  { id: "procesos", label: "Procesos", shortLabel: "P", color: "bg-amber-500", tipo: "tarea", hasRoles: true },
  { id: "outputs", label: "Outputs", shortLabel: "O", color: "bg-purple-500", tipo: "output" },
  { id: "supervision", label: "Supervisión", shortLabel: "S", color: "bg-red-500", tipo: "supervision" },
];

const roleColors: Record<string, string> = {
  asesor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  auxiliar: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  practicante: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  contador: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  supervisor: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  gerente: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  asistente: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  administrador: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
};

export function WorkFlowModal({ open, onOpenChange, contrato, miembros }: WorkFlowModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<WorkFlowItem[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItemColumn, setNewItemColumn] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});

  // Calculate workflow dates and progress
  const fechaInicio = new Date(contrato.fecha_inicio);
  const fechaFin = contrato.fecha_fin ? new Date(contrato.fecha_fin) : null;
  const hoy = new Date();
  const diasTranscurridos = differenceInDays(hoy, fechaInicio);
  const diasTotales = fechaFin ? differenceInDays(fechaFin, fechaInicio) : null;
  const diasVencidos = fechaFin && hoy > fechaFin ? differenceInDays(hoy, fechaFin) : 0;
  
  const completados = items.filter(i => i.completado).length;
  const total = items.length;
  const progressPercent = total > 0 ? Math.round((completados / total) * 100) : 0;

  useEffect(() => {
    if (open) {
      loadWorkflow();
    }
  }, [open, contrato.id]);

  const loadWorkflow = async () => {
    setLoading(true);
    try {
      // Load workflow data from contrato datos_plantilla
      const { data, error } = await supabase
        .from("contratos")
        .select("datos_plantilla")
        .eq("id", contrato.id)
        .maybeSingle();

      if (error) throw error;

      const datosPlantilla = data?.datos_plantilla as Record<string, any> || {};
      const workflowItems = datosPlantilla.workflow_items || [];
      setItems(workflowItems);
    } catch (error) {
      console.error("Error loading workflow:", error);
      toast.error("Error al cargar el workflow");
    }
    setLoading(false);
  };

  const saveWorkflow = async () => {
    setSaving(true);
    try {
      const { data: contratoData } = await supabase
        .from("contratos")
        .select("datos_plantilla")
        .eq("id", contrato.id)
        .maybeSingle();

      const datosPlantilla = (contratoData?.datos_plantilla as Record<string, any>) || {};
      
      // Convert items to JSON-compatible format
      const workflowItemsJson = items.map(item => ({
        id: item.id,
        tipo: item.tipo,
        titulo: item.titulo,
        descripcion: item.descripcion || null,
        asignado_a: item.asignado_a || null,
        rol: item.rol || null,
        completado: item.completado,
        orden: item.orden,
        conexiones: item.conexiones || null,
      }));
      
      const { error } = await supabase
        .from("contratos")
        .update({
          datos_plantilla: {
            ...datosPlantilla,
            workflow_items: workflowItemsJson,
            workflow_updated_at: new Date().toISOString(),
          } as any
        })
        .eq("id", contrato.id);

      if (error) throw error;
      toast.success("WorkFlow guardado correctamente");
    } catch (error) {
      console.error("Error saving workflow:", error);
      toast.error("Error al guardar el workflow");
    }
    setSaving(false);
  };

  const addItem = (tipo: string, rol?: string) => {
    if (!newItemTitle.trim()) {
      toast.error("Ingresa un título");
      return;
    }

    const newItem: WorkFlowItem = {
      id: crypto.randomUUID(),
      tipo: tipo as any,
      titulo: newItemTitle,
      completado: false,
      orden: items.filter(i => i.tipo === tipo && i.rol === rol).length,
      rol,
    };

    setItems([...items, newItem]);
    setNewItemTitle("");
    setNewItemColumn(null);
  };

  const updateItem = (id: string, updates: Partial<WorkFlowItem>) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const toggleComplete = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, completado: !item.completado } : item
    ));
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getMiembrosByRol = (rol: string) => {
    return miembros.filter(m => m.rol_en_cartera.toLowerCase() === rol.toLowerCase());
  };

  const getItemsByTipoAndRol = (tipo: string, rol?: string) => {
    return items.filter(item => {
      if (tipo === "tarea" && rol) {
        return item.tipo === tipo && item.rol === rol;
      }
      return item.tipo === tipo;
    }).sort((a, b) => a.orden - b.orden);
  };

  const toggleRoleExpanded = (rol: string) => {
    setExpandedRoles(prev => ({ ...prev, [rol]: !prev[rol] }));
  };

  // Get unique roles from team members for process column
  const uniqueRoles = [...new Set(miembros.map(m => m.rol_en_cartera))];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">{contrato.cliente.razon_social}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">{contrato.numero}</span>
            </div>
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              {format(fechaInicio, "dd MMM yyyy", { locale: es })}
              {fechaFin && ` - ${format(fechaFin, "dd MMM yyyy", { locale: es })}`}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="text-muted-foreground">Fecha WorkFlow</p>
              <p className="font-medium">
                {diasTranscurridos > 0 ? `${diasTranscurridos} días transcurridos` : "Inicio hoy"}
                {diasVencidos > 0 && (
                  <span className="text-red-500 ml-2">/ {diasVencidos} días vencidos</span>
                )}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={saveWorkflow} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-5 border-b">
        {columnConfig.map(col => (
          <div key={col.id} className={cn("p-3 text-center text-white font-bold", col.color)}>
            <span className="text-2xl">{col.shortLabel}</span>
            <p className="text-sm font-normal">{col.label}</p>
          </div>
        ))}
      </div>

      {/* Sub-headers for Procesos column */}
      <div className="grid grid-cols-5 border-b bg-muted/30">
        <div className="col-span-2" /> {/* Empty space for A and I columns */}
        <div className="border-x">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.max(uniqueRoles.length, 1)}, 1fr)` }}>
            {uniqueRoles.length > 0 ? uniqueRoles.map(rol => (
              <div key={rol} className="p-2 text-center text-xs font-medium border-r last:border-r-0 capitalize">
                {rol}
              </div>
            )) : (
              <div className="p-2 text-center text-xs text-muted-foreground">
                Sin roles asignados
              </div>
            )}
          </div>
        </div>
        <div className="col-span-2" /> {/* Empty space for O and S columns */}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-5 h-full">
            {/* Actividades Column */}
            <div className="border-r p-3 bg-sky-50/50 dark:bg-sky-950/20">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {getItemsByTipoAndRol("actividad").map(item => (
                    <WorkFlowItemCard
                      key={item.id}
                      item={item}
                      onToggle={() => toggleComplete(item.id)}
                      onDelete={() => deleteItem(item.id)}
                      onEdit={() => setEditingItem(item.id)}
                      isEditing={editingItem === item.id}
                      onSaveEdit={(title) => {
                        updateItem(item.id, { titulo: title });
                        setEditingItem(null);
                      }}
                      onCancelEdit={() => setEditingItem(null)}
                    />
                  ))}
                  {newItemColumn === "actividad" ? (
                    <div className="flex gap-2">
                      <Input
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        placeholder="Nueva actividad..."
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addItem("actividad");
                          if (e.key === "Escape") setNewItemColumn(null);
                        }}
                      />
                      <Button size="sm" className="h-8" onClick={() => addItem("actividad")}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 text-muted-foreground"
                      onClick={() => setNewItemColumn("actividad")}
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Actividad
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Inputs Column */}
            <div className="border-r p-3 bg-emerald-50/50 dark:bg-emerald-950/20">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {getItemsByTipoAndRol("input").map(item => (
                    <WorkFlowItemCard
                      key={item.id}
                      item={item}
                      onToggle={() => toggleComplete(item.id)}
                      onDelete={() => deleteItem(item.id)}
                      onEdit={() => setEditingItem(item.id)}
                      isEditing={editingItem === item.id}
                      onSaveEdit={(title) => {
                        updateItem(item.id, { titulo: title });
                        setEditingItem(null);
                      }}
                      onCancelEdit={() => setEditingItem(null)}
                      variant="diamond"
                    />
                  ))}
                  {newItemColumn === "input" ? (
                    <div className="flex gap-2">
                      <Input
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        placeholder="Nuevo input..."
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addItem("input");
                          if (e.key === "Escape") setNewItemColumn(null);
                        }}
                      />
                      <Button size="sm" className="h-8" onClick={() => addItem("input")}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 text-muted-foreground"
                      onClick={() => setNewItemColumn("input")}
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Input
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Procesos Column (with roles) */}
            <div className="border-r p-3 bg-amber-50/50 dark:bg-amber-950/20">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {uniqueRoles.length > 0 ? uniqueRoles.map(rol => {
                    const rolItems = getItemsByTipoAndRol("tarea", rol);
                    const rolMiembros = getMiembrosByRol(rol);
                    const isExpanded = expandedRoles[rol] !== false;
                    
                    return (
                      <div key={rol} className="space-y-2">
                        <button
                          onClick={() => toggleRoleExpanded(rol)}
                          className="flex items-center justify-between w-full p-2 rounded-lg bg-white dark:bg-gray-800 border shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-2">
                            <Badge className={cn("capitalize", roleColors[rol.toLowerCase()] || "bg-gray-100 text-gray-800")}>
                              {rol}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {rolItems.length} tareas
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-1">
                              {rolMiembros.slice(0, 3).map(m => (
                                <Avatar key={m.user_id} className="h-5 w-5 border border-background">
                                  <AvatarFallback className="text-[8px]">
                                    {getInitials(m.profile?.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </button>
                        
                        {isExpanded && (
                          <div className="pl-2 space-y-2">
                            {rolItems.map(item => (
                              <WorkFlowItemCard
                                key={item.id}
                                item={item}
                                onToggle={() => toggleComplete(item.id)}
                                onDelete={() => deleteItem(item.id)}
                                onEdit={() => setEditingItem(item.id)}
                                isEditing={editingItem === item.id}
                                onSaveEdit={(title) => {
                                  updateItem(item.id, { titulo: title });
                                  setEditingItem(null);
                                }}
                                onCancelEdit={() => setEditingItem(null)}
                                miembros={rolMiembros}
                                selectedAsignado={item.asignado_a}
                                onAsignar={(userId) => updateItem(item.id, { asignado_a: userId })}
                              />
                            ))}
                            {newItemColumn === `tarea-${rol}` ? (
                              <div className="flex gap-2">
                                <Input
                                  value={newItemTitle}
                                  onChange={(e) => setNewItemTitle(e.target.value)}
                                  placeholder="Nueva tarea..."
                                  className="h-8 text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") addItem("tarea", rol);
                                    if (e.key === "Escape") setNewItemColumn(null);
                                  }}
                                />
                                <Button size="sm" className="h-8" onClick={() => addItem("tarea", rol)}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start gap-2 text-muted-foreground text-xs"
                                onClick={() => setNewItemColumn(`tarea-${rol}`)}
                              >
                                <Plus className="h-3 w-3" />
                                Agregar Tarea
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay miembros en la cartera</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Outputs Column */}
            <div className="border-r p-3 bg-purple-50/50 dark:bg-purple-950/20">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {getItemsByTipoAndRol("output").map(item => (
                    <WorkFlowItemCard
                      key={item.id}
                      item={item}
                      onToggle={() => toggleComplete(item.id)}
                      onDelete={() => deleteItem(item.id)}
                      onEdit={() => setEditingItem(item.id)}
                      isEditing={editingItem === item.id}
                      onSaveEdit={(title) => {
                        updateItem(item.id, { titulo: title });
                        setEditingItem(null);
                      }}
                      onCancelEdit={() => setEditingItem(null)}
                      variant="rounded"
                    />
                  ))}
                  {newItemColumn === "output" ? (
                    <div className="flex gap-2">
                      <Input
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        placeholder="Nuevo producto..."
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addItem("output");
                          if (e.key === "Escape") setNewItemColumn(null);
                        }}
                      />
                      <Button size="sm" className="h-8" onClick={() => addItem("output")}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 text-muted-foreground"
                      onClick={() => setNewItemColumn("output")}
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Producto
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Supervision Column */}
            <div className="p-3 bg-red-50/50 dark:bg-red-950/20">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {getItemsByTipoAndRol("supervision").map(item => (
                    <WorkFlowItemCard
                      key={item.id}
                      item={item}
                      onToggle={() => toggleComplete(item.id)}
                      onDelete={() => deleteItem(item.id)}
                      onEdit={() => setEditingItem(item.id)}
                      isEditing={editingItem === item.id}
                      onSaveEdit={(title) => {
                        updateItem(item.id, { titulo: title });
                        setEditingItem(null);
                      }}
                      onCancelEdit={() => setEditingItem(null)}
                      variant="oval"
                    />
                  ))}
                  {newItemColumn === "supervision" ? (
                    <div className="flex gap-2">
                      <Input
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        placeholder="Nueva supervisión..."
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addItem("supervision");
                          if (e.key === "Escape") setNewItemColumn(null);
                        }}
                      />
                      <Button size="sm" className="h-8" onClick={() => addItem("supervision")}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 text-muted-foreground"
                      onClick={() => setNewItemColumn("supervision")}
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Supervisión
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>

      {/* Footer Progress Bar */}
      <div className="border-t bg-card px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Progress value={progressPercent} className="h-3" />
          </div>
          <div className="text-sm font-medium min-w-[60px] text-center">
            {progressPercent}%
          </div>
          <div className="text-sm text-muted-foreground">
            {completados} de {total} tareas completadas
          </div>
        </div>
      </div>
    </div>
  );
}

interface WorkFlowItemCardProps {
  item: WorkFlowItem;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  isEditing: boolean;
  onSaveEdit: (title: string) => void;
  onCancelEdit: () => void;
  variant?: "default" | "diamond" | "rounded" | "oval";
  miembros?: MiembroCartera[];
  selectedAsignado?: string;
  onAsignar?: (userId: string) => void;
}

function WorkFlowItemCard({
  item,
  onToggle,
  onDelete,
  onEdit,
  isEditing,
  onSaveEdit,
  onCancelEdit,
  variant = "default",
  miembros,
  selectedAsignado,
  onAsignar,
}: WorkFlowItemCardProps) {
  const [editTitle, setEditTitle] = useState(item.titulo);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const shapeClasses = {
    default: "rounded-lg",
    diamond: "rounded-lg", // We'll use a different visual for diamond
    rounded: "rounded-2xl",
    oval: "rounded-full px-4",
  };

  if (isEditing) {
    return (
      <div className={cn(
        "p-2 bg-white dark:bg-gray-800 border-2 border-primary shadow-sm",
        shapeClasses[variant]
      )}>
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="h-7 text-sm mb-2"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") onSaveEdit(editTitle);
            if (e.key === "Escape") onCancelEdit();
          }}
        />
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" className="h-6 px-2" onClick={onCancelEdit}>
            Cancelar
          </Button>
          <Button size="sm" className="h-6 px-2" onClick={() => onSaveEdit(editTitle)}>
            Guardar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative p-2 bg-white dark:bg-gray-800 border shadow-sm hover:shadow-md transition-all cursor-pointer",
        item.completado && "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
        shapeClasses[variant],
        variant === "diamond" && "transform rotate-0" // Diamond style
      )}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="mt-0.5 flex-shrink-0"
        >
          {item.completado ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium line-clamp-2",
            item.completado && "line-through text-muted-foreground"
          )}>
            {item.titulo}
          </p>
          {miembros && onAsignar && (
            <div className="mt-1">
              <Select value={selectedAsignado || ""} onValueChange={onAsignar}>
                <SelectTrigger className="h-6 text-xs">
                  <SelectValue placeholder="Asignar a..." />
                </SelectTrigger>
                <SelectContent>
                  {miembros.map(m => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[8px]">
                            {getInitials(m.profile?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        {m.profile?.full_name || m.profile?.email}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
      
      {/* Action buttons on hover */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Users,
  CheckCircle2,
  Circle,
  Building2,
  FileCheck,
  Save,
  Edit2,
  Activity,
  Database,
  Settings,
  Package,
  ShieldCheck,
  Link2,
  Unlink,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
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
  subColumna?: number; // For proceso items: 0, 1, or 2
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

interface SupervisorProfile {
  id: string;
  full_name: string | null;
  email: string;
  puesto: string | null;
  asignar_supervision: boolean;
}

interface WorkFlowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: ContratoWorkflow;
  miembros: MiembroCartera[];
}

const columnConfig = [
  { id: "actividades", label: "Actividades", shortLabel: "A", color: "bg-sky-500", tipo: "actividad", icon: Activity },
  { id: "inputs", label: "Inputs", shortLabel: "I", color: "bg-emerald-500", tipo: "input", icon: Database },
  { id: "procesos", label: "Procesos", shortLabel: "P", color: "bg-amber-500", tipo: "tarea", hasRoles: true, icon: Settings },
  { id: "outputs", label: "Outputs", shortLabel: "O", color: "bg-purple-500", tipo: "output", icon: Package },
  { id: "supervision", label: "Supervisión", shortLabel: "S", color: "bg-red-500", tipo: "supervision", icon: ShieldCheck },
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

// Ya no usamos exclusión por puesto, ahora usamos el campo asignar_supervision

export function WorkFlowModal({ open, onOpenChange, contrato, miembros }: WorkFlowModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<WorkFlowItem[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItemColumn, setNewItemColumn] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [supervisores, setSupervisores] = useState<SupervisorProfile[]>([]);
  const [, forceUpdate] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Force re-render on resize to update connection lines
  useEffect(() => {
    const handleResize = () => forceUpdate(n => n + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate workflow dates and progress
  const fechaInicio = new Date(contrato.fecha_inicio);
  const fechaFin = contrato.fecha_fin ? new Date(contrato.fecha_fin) : null;
  const hoy = new Date();
  const diasTranscurridos = differenceInDays(hoy, fechaInicio);
  const diasVencidos = fechaFin && hoy > fechaFin ? differenceInDays(hoy, fechaFin) : 0;
  
  const completados = items.filter(i => i.completado).length;
  const total = items.length;
  const progressPercent = total > 0 ? Math.round((completados / total) * 100) : 0;

  // Get unique roles from team members for process column sub-columns
  // Limit to actual member count: if 2 members, 2 sub-columns; if 3+, 3 sub-columns
  const memberRoles = [...new Set(miembros.map(m => m.rol_en_cartera))];
  const subColumnCount = Math.min(Math.max(memberRoles.length, 2), 3); // Min 2, max 3
  const uniqueRoles = memberRoles.slice(0, subColumnCount);
  // Pad only if we have fewer roles than the determined column count
  while (uniqueRoles.length < subColumnCount) {
    uniqueRoles.push(`Rol ${uniqueRoles.length + 1}`);
  }

  useEffect(() => {
    if (open) {
      loadWorkflow();
      loadSupervisores();
    }
  }, [open, contrato.id]);

  const loadSupervisores = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, puesto, asignar_supervision")
        .eq("asignar_supervision", true);

      if (error) throw error;

      setSupervisores(data || []);
    } catch (error) {
      console.error("Error loading supervisores:", error);
    }
  };

  const loadWorkflow = async () => {
    setLoading(true);
    try {
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
        subColumna: item.subColumna ?? null,
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

  const addItem = (tipo: string, rol?: string, subColumna?: number) => {
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
      subColumna,
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
    // Also remove any connections to this item
    setItems(items.filter(item => item.id !== id).map(item => ({
      ...item,
      conexiones: item.conexiones?.filter(c => c !== id) || [],
    })));
  };

  const toggleComplete = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, completado: !item.completado } : item
    ));
  };

  const startConnection = (fromId: string) => {
    setConnectingFrom(fromId);
  };

  const completeConnection = (toId: string) => {
    if (connectingFrom && connectingFrom !== toId) {
      setItems(items.map(item => {
        if (item.id === connectingFrom) {
          const currentConnections = item.conexiones || [];
          if (!currentConnections.includes(toId)) {
            return { ...item, conexiones: [...currentConnections, toId] };
          }
        }
        return item;
      }));
      toast.success("Conexión creada");
    }
    setConnectingFrom(null);
  };

  const removeConnection = (fromId: string, toId: string) => {
    setItems(items.map(item => {
      if (item.id === fromId) {
        return { 
          ...item, 
          conexiones: (item.conexiones || []).filter(c => c !== toId) 
        };
      }
      return item;
    }));
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getMiembrosByRol = (rol: string) => {
    return miembros.filter(m => m.rol_en_cartera.toLowerCase() === rol.toLowerCase());
  };

  const getItemsByTipo = (tipo: string) => {
    return items.filter(item => item.tipo === tipo).sort((a, b) => a.orden - b.orden);
  };

  const getItemsBySubColumna = (subColumna: number) => {
    return items.filter(item => item.tipo === "tarea" && item.subColumna === subColumna)
      .sort((a, b) => a.orden - b.orden);
  };

  const setItemRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      itemRefs.current.set(id, el);
    } else {
      itemRefs.current.delete(id);
    }
  }, []);

  // Get column index for an item based on its type
  const getColumnIndex = (item: WorkFlowItem): number => {
    switch (item.tipo) {
      case "actividad": return 0;
      case "input": return 1;
      case "tarea": return 2;
      case "output": return 3;
      case "supervision": return 4;
      default: return -1;
    }
  };

  // Check if two items are in the exact same visual column (considering sub-columns)
  const isSameVisualColumn = (from: WorkFlowItem, to: WorkFlowItem): boolean => {
    const fromColIndex = getColumnIndex(from);
    const toColIndex = getColumnIndex(to);
    
    // Different main columns
    if (fromColIndex !== toColIndex) return false;
    
    // For 'tarea' type (Procesos), check sub-columns
    if (from.tipo === "tarea" && to.tipo === "tarea") {
      return from.subColumna === to.subColumna;
    }
    
    // Same main column, same type
    return true;
  };

  // Calculate connection lines with improved routing
  const renderConnections = () => {
    const connections: JSX.Element[] = [];
    
    items.forEach(item => {
      if (item.conexiones && item.conexiones.length > 0) {
        const fromEl = itemRefs.current.get(item.id);
        
        item.conexiones.forEach((toId, connIndex) => {
          const toEl = itemRefs.current.get(toId);
          const toItem = items.find(i => i.id === toId);
          
          if (fromEl && toEl && containerRef.current && toItem) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();
            
            const fromColIndex = getColumnIndex(item);
            const toColIndex = getColumnIndex(toItem);
            const sameVisualCol = isSameVisualColumn(item, toItem);
            
            let path = "";
            let startX = 0, startY = 0, endX = 0, endY = 0;
            const offset = 20 + (connIndex * 8); // Offset for multiple connections
            
            if (sameVisualCol) {
              // Exact same visual column (same sub-column): route through LEFT side (left-to-left)
              startX = fromRect.left - containerRect.left;
              startY = fromRect.top + fromRect.height / 2 - containerRect.top;
              endX = toRect.left - containerRect.left;
              endY = toRect.top + toRect.height / 2 - containerRect.top;
              
              const leftOffset = -offset;
              
              path = `M ${startX} ${startY} 
                      L ${startX + leftOffset} ${startY}
                      L ${endX + leftOffset} ${endY}
                      L ${endX} ${endY}`;
            } else if (toColIndex < fromColIndex) {
              // Going backwards (to a previous main column): route around the boxes
              startX = fromRect.left - containerRect.left;
              startY = fromRect.top + fromRect.height / 2 - containerRect.top;
              endX = toRect.right - containerRect.left;
              endY = toRect.top + toRect.height / 2 - containerRect.top;
              
              const verticalOffset = startY < endY ? -40 - offset : 40 + offset;
              
              path = `M ${startX} ${startY}
                      L ${startX - offset} ${startY}
                      L ${startX - offset} ${startY + verticalOffset}
                      L ${endX + offset} ${startY + verticalOffset}
                      L ${endX + offset} ${endY}
                      L ${endX} ${endY}`;
            } else {
              // Different columns or different sub-columns (forward flow): RIGHT of source → LEFT of destination
              startX = fromRect.right - containerRect.left;
              startY = fromRect.top + fromRect.height / 2 - containerRect.top;
              endX = toRect.left - containerRect.left;
              endY = toRect.top + toRect.height / 2 - containerRect.top;
              
              const midX = (startX + endX) / 2;
              
              // Use orthogonal routing to avoid crossing boxes
              path = `M ${startX} ${startY}
                      L ${midX} ${startY}
                      L ${midX} ${endY}
                      L ${endX} ${endY}`;
            }
            
            connections.push(
              <g key={`${item.id}-${toId}`}>
                <path
                  d={path}
                  fill="none"
                  stroke="hsl(var(--destructive))"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.2))" }}
                />
                {/* Connection dots at endpoints */}
                <circle
                  cx={startX}
                  cy={startY}
                  r="5"
                  fill="hsl(var(--destructive))"
                />
                <circle
                  cx={endX}
                  cy={endY}
                  r="5"
                  fill="hsl(var(--destructive))"
                />
              </g>
            );
          }
        });
      }
    });
    
    return connections;
  };

  // Get connection labels for an item
  const getConnectionLabels = (itemId: string): { outgoing: string[]; incoming: string[] } => {
    const outgoing: string[] = [];
    const incoming: string[] = [];
    
    const currentItem = items.find(i => i.id === itemId);
    if (currentItem?.conexiones) {
      currentItem.conexiones.forEach(toId => {
        const toItem = items.find(i => i.id === toId);
        if (toItem) {
          outgoing.push(toItem.titulo.substring(0, 15) + (toItem.titulo.length > 15 ? "..." : ""));
        }
      });
    }
    
    items.forEach(i => {
      if (i.conexiones?.includes(itemId)) {
        incoming.push(i.titulo.substring(0, 15) + (i.titulo.length > 15 ? "..." : ""));
      }
    });
    
    return { outgoing, incoming };
  };

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
            {connectingFrom && (
              <Badge variant="secondary" className="gap-2 animate-pulse">
                <Link2 className="h-4 w-4" />
                Selecciona el destino
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 px-1"
                  onClick={() => setConnectingFrom(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
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

      {/* Column Headers - Grid with Procesos taking dynamic space based on member count */}
      <div className="grid border-b" style={{ gridTemplateColumns: `1fr 1fr ${subColumnCount}fr 1fr 1fr` }}>
        {columnConfig.map(col => {
          const Icon = col.icon;
          return (
            <div 
              key={col.id} 
              className={cn(
                "p-3 text-center text-white font-bold flex flex-col items-center gap-1", 
                col.color
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-2xl">{col.shortLabel}</span>
              <p className="text-sm font-normal">{col.label}</p>
            </div>
          );
        })}
      </div>

      {/* Sub-headers for Procesos column - dynamic sub-columns based on member count */}
      <div className="grid border-b bg-muted/30" style={{ gridTemplateColumns: `1fr 1fr ${subColumnCount}fr 1fr 1fr` }}>
        <div /> {/* Empty space for A column */}
        <div /> {/* Empty space for I column */}
        <div className="border-x">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${subColumnCount}, 1fr)` }}>
            {uniqueRoles.map((rol, index) => (
              <div key={rol} className="p-2 text-center border-r last:border-r-0">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs capitalize", roleColors[rol.toLowerCase()] || "bg-gray-100")}
                >
                  {rol}
                </Badge>
              </div>
            ))}
          </div>
        </div>
        <div /> {/* Empty space for O column */}
        <div /> {/* Empty space for S column */}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative" ref={containerRef}>
        {/* SVG for connection lines (no arrows) */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{ overflow: 'visible' }}
        >
          {renderConnections()}
        </svg>

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid h-full" style={{ gridTemplateColumns: `1fr 1fr ${subColumnCount}fr 1fr 1fr` }}>
            {/* Actividades Column */}
            <div className="border-r p-3 bg-sky-50/50 dark:bg-sky-950/20">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {getItemsByTipo("actividad").map(item => (
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
                      onStartConnection={() => startConnection(item.id)}
                      onCompleteConnection={() => completeConnection(item.id)}
                      isConnecting={!!connectingFrom}
                      isConnectingFrom={connectingFrom === item.id}
                      onRemoveConnections={() => updateItem(item.id, { conexiones: [] })}
                      hasConnections={(item.conexiones?.length || 0) > 0}
                      setRef={(el) => setItemRef(item.id, el)}
                      connectionLabels={getConnectionLabels(item.id)}
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
                      Agregar
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Inputs Column */}
            <div className="border-r p-3 bg-emerald-50/50 dark:bg-emerald-950/20">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {getItemsByTipo("input").map(item => (
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
                      onStartConnection={() => startConnection(item.id)}
                      onCompleteConnection={() => completeConnection(item.id)}
                      isConnecting={!!connectingFrom}
                      isConnectingFrom={connectingFrom === item.id}
                      onRemoveConnections={() => updateItem(item.id, { conexiones: [] })}
                      hasConnections={(item.conexiones?.length || 0) > 0}
                      setRef={(el) => setItemRef(item.id, el)}
                      connectionLabels={getConnectionLabels(item.id)}
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
                      Agregar
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Procesos Column - dynamic sub-columns based on member count */}
            <div className="border-r bg-amber-50/50 dark:bg-amber-950/20">
              <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${subColumnCount}, 1fr)` }}>
                {uniqueRoles.map((rol, subColIndex) => {
                  const rolMiembros = getMiembrosByRol(rol);
                  const subColItems = getItemsBySubColumna(subColIndex);
                  
                  return (
                    <div key={rol} className="border-r last:border-r-0 p-2">
                      <ScrollArea className="h-full">
                        <div className="space-y-2">
                          {subColItems.map(item => (
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
                              variant="default"
                              miembros={rolMiembros}
                              selectedAsignado={item.asignado_a}
                              onAsignar={(userId) => updateItem(item.id, { asignado_a: userId })}
                              onStartConnection={() => startConnection(item.id)}
                              onCompleteConnection={() => completeConnection(item.id)}
                              isConnecting={!!connectingFrom}
                              isConnectingFrom={connectingFrom === item.id}
                              onRemoveConnections={() => updateItem(item.id, { conexiones: [] })}
                              hasConnections={(item.conexiones?.length || 0) > 0}
                              setRef={(el) => setItemRef(item.id, el)}
                              connectionLabels={getConnectionLabels(item.id)}
                            />
                          ))}
                          {newItemColumn === `tarea-${subColIndex}` ? (
                            <div className="flex gap-1">
                              <Input
                                value={newItemTitle}
                                onChange={(e) => setNewItemTitle(e.target.value)}
                                placeholder="Nueva tarea..."
                                className="h-7 text-xs"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") addItem("tarea", rol, subColIndex);
                                  if (e.key === "Escape") setNewItemColumn(null);
                                }}
                              />
                              <Button size="sm" className="h-7 px-2" onClick={() => addItem("tarea", rol, subColIndex)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-center gap-1 text-muted-foreground text-xs h-7"
                              onClick={() => setNewItemColumn(`tarea-${subColIndex}`)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Outputs Column */}
            <div className="border-r p-3 bg-purple-50/50 dark:bg-purple-950/20">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {getItemsByTipo("output").map(item => (
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
                      onStartConnection={() => startConnection(item.id)}
                      onCompleteConnection={() => completeConnection(item.id)}
                      isConnecting={!!connectingFrom}
                      isConnectingFrom={connectingFrom === item.id}
                      onRemoveConnections={() => updateItem(item.id, { conexiones: [] })}
                      hasConnections={(item.conexiones?.length || 0) > 0}
                      setRef={(el) => setItemRef(item.id, el)}
                      connectionLabels={getConnectionLabels(item.id)}
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
                      Agregar
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Supervision Column */}
            <div className="p-3 bg-red-50/50 dark:bg-red-950/20">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {getItemsByTipo("supervision").map(item => (
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
                      supervisores={supervisores}
                      selectedAsignado={item.asignado_a}
                      onAsignar={(userId) => updateItem(item.id, { asignado_a: userId })}
                      onStartConnection={() => startConnection(item.id)}
                      onCompleteConnection={() => completeConnection(item.id)}
                      isConnecting={!!connectingFrom}
                      isConnectingFrom={connectingFrom === item.id}
                      onRemoveConnections={() => updateItem(item.id, { conexiones: [] })}
                      hasConnections={(item.conexiones?.length || 0) > 0}
                      setRef={(el) => setItemRef(item.id, el)}
                      connectionLabels={getConnectionLabels(item.id)}
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
                      Agregar
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
  supervisores?: SupervisorProfile[];
  selectedAsignado?: string;
  onAsignar?: (userId: string) => void;
  onStartConnection: () => void;
  onCompleteConnection: () => void;
  isConnecting: boolean;
  isConnectingFrom: boolean;
  onRemoveConnections: () => void;
  hasConnections: boolean;
  setRef: (el: HTMLDivElement | null) => void;
  connectionLabels: { outgoing: string[]; incoming: string[] };
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
  supervisores,
  selectedAsignado,
  onAsignar,
  onStartConnection,
  onCompleteConnection,
  isConnecting,
  isConnectingFrom,
  onRemoveConnections,
  hasConnections,
  setRef,
  connectionLabels,
}: WorkFlowItemCardProps) {
  const [editTitle, setEditTitle] = useState(item.titulo);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const shapeClasses = {
    default: "rounded-lg",
    diamond: "rounded-lg rotate-0", 
    rounded: "rounded-2xl",
    oval: "rounded-full px-3",
  };

  const borderStyles = {
    default: "border-blue-400",
    diamond: "border-emerald-400",
    rounded: "border-purple-400",
    oval: "border-blue-400",
  };

  if (isEditing) {
    return (
      <div 
        ref={setRef}
        className={cn(
          "p-2 bg-white dark:bg-gray-800 border-2 border-primary shadow-sm",
          shapeClasses[variant]
        )}
      >
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

  const hasLabels = connectionLabels.outgoing.length > 0 || connectionLabels.incoming.length > 0;

  return (
    <div
      ref={setRef}
      onClick={() => {
        if (isConnecting && !isConnectingFrom) {
          onCompleteConnection();
        }
      }}
      className={cn(
        "group relative p-2 bg-white dark:bg-gray-800 border-2 shadow-sm hover:shadow-md transition-all",
        item.completado && "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700",
        !item.completado && borderStyles[variant],
        shapeClasses[variant],
        isConnecting && !isConnectingFrom && "cursor-pointer ring-2 ring-blue-300 ring-offset-1",
        isConnectingFrom && "ring-2 ring-primary ring-offset-2"
      )}
    >
      {/* Connection labels - Incoming */}
      {connectionLabels.incoming.length > 0 && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full flex flex-col gap-0.5 max-w-[80px]">
          {connectionLabels.incoming.map((label, idx) => (
            <div 
              key={idx}
              className="flex items-center gap-0.5 text-[9px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded-sm whitespace-nowrap overflow-hidden"
              title={label}
            >
              <ArrowRight className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Connection labels - Outgoing */}
      {connectionLabels.outgoing.length > 0 && (
        <div className="absolute -right-1 top-1/2 -translate-y-1/2 translate-x-full flex flex-col gap-0.5 max-w-[80px]">
          {connectionLabels.outgoing.map((label, idx) => (
            <div 
              key={idx}
              className="flex items-center gap-0.5 text-[9px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-1 py-0.5 rounded-sm whitespace-nowrap overflow-hidden"
              title={label}
            >
              <span className="truncate">{label}</span>
              <ArrowLeft className="h-2.5 w-2.5 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

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
            "text-xs font-medium line-clamp-2",
            item.completado && "line-through text-muted-foreground"
          )}>
            {item.titulo}
          </p>
          {miembros && onAsignar && (
            <div className="mt-1">
              <Select value={selectedAsignado || ""} onValueChange={onAsignar}>
                <SelectTrigger className="h-5 text-[10px]">
                  <SelectValue placeholder="Asignar..." />
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
                        <span className="text-xs">{m.profile?.full_name || m.profile?.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {supervisores && onAsignar && (
            <div className="mt-1">
              <Select value={selectedAsignado || ""} onValueChange={onAsignar}>
                <SelectTrigger className="h-5 text-[10px]">
                  <SelectValue placeholder="Asignar supervisor..." />
                </SelectTrigger>
                <SelectContent>
                  {supervisores.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[8px]">
                            {getInitials(s.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{s.full_name || s.email}</span>
                        {s.puesto && (
                          <span className="text-[9px] text-muted-foreground">({s.puesto})</span>
                        )}
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
      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 bg-white dark:bg-gray-800 rounded-lg shadow-md p-0.5 border z-20">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={(e) => {
            e.stopPropagation();
            onStartConnection();
          }}
          title="Crear conexión"
        >
          <Link2 className="h-3 w-3 text-blue-500" />
        </Button>
        {hasConnections && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveConnections();
            }}
            title="Eliminar conexiones"
          >
            <Unlink className="h-3 w-3 text-orange-500" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
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
          className="h-5 w-5 text-destructive hover:text-destructive"
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

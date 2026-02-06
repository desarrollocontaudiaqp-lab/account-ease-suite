import { useState, useEffect, useCallback, useMemo } from "react";
import { format, parseISO, isPast } from "date-fns";
import { es } from "date-fns/locale";
import {
  ListTodo,
  Plus,
  GripVertical,
  Trash2,
  Loader2,
  Clock,
  User,
  Tag,
  AlertTriangle,
  MoreHorizontal,
  Calendar,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TreeNode } from "../WorkFlowTreeSidebar";
import { useWorkflowItemProgress } from "@/hooks/useWorkflowItemProgress";

interface KanbanBoardProps {
  node: TreeNode;
  workflowId?: string;
  profiles: { id: string; full_name: string | null }[];
  onRefresh?: () => void;
}

interface KanbanCard {
  id: string;
  titulo: string;
  descripcion?: string;
  status: string;
  orden: number;
  asignado_a?: string;
  fecha_vencimiento?: string;
  prioridad: string;
  etiquetas: { color: string; label: string }[];
}

const COLUMNS = [
  { id: "pendiente", label: "Pendiente", color: "bg-gray-100 dark:bg-gray-800" },
  { id: "en_progreso", label: "En Progreso", color: "bg-blue-50 dark:bg-blue-950/30" },
  { id: "en_revision", label: "En Revisión", color: "bg-amber-50 dark:bg-amber-950/30" },
  { id: "completado", label: "Completado", color: "bg-green-50 dark:bg-green-950/30" },
];

const PRIORITIES = [
  { value: "baja", label: "Baja", color: "bg-gray-100 text-gray-700" },
  { value: "media", label: "Media", color: "bg-blue-100 text-blue-700" },
  { value: "alta", label: "Alta", color: "bg-orange-100 text-orange-700" },
  { value: "urgente", label: "Urgente", color: "bg-red-100 text-red-700" },
];

const TAG_COLORS = [
  { color: "#ef4444", label: "Rojo" },
  { color: "#f97316", label: "Naranja" },
  { color: "#eab308", label: "Amarillo" },
  { color: "#22c55e", label: "Verde" },
  { color: "#3b82f6", label: "Azul" },
  { color: "#8b5cf6", label: "Violeta" },
];

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

// Helper to format dates safely - handles ISO format with time component
const formatDateSafe = (dateStr: string | undefined): string | null => {
  if (!dateStr || !dateStr.trim()) return null;
  try {
    // Handle ISO format with T separator (e.g., "2026-02-05T00:00:00.000Z")
    const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const [year, month, day] = datePart.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, "dd MMM yyyy", { locale: es });
  } catch {
    return null;
  }
};

export function KanbanBoard({ node, workflowId, profiles, onRefresh }: KanbanBoardProps) {
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggingCard, setDraggingCard] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [showNewCardDialog, setShowNewCardDialog] = useState(false);
  const [newCardColumn, setNewCardColumn] = useState<string>("pendiente");
  const [newCardTitle, setNewCardTitle] = useState("");

  // Hook to sync progress to workflow JSON
  const { syncProgress } = useWorkflowItemProgress(workflowId, node.id, onRefresh);

  // Calculate progress: cards in "completado" / total cards
  const progress = useMemo(() => {
    if (cards.length === 0) return 0;
    const completed = cards.filter(c => c.status === "completado").length;
    return Math.round((completed / cards.length) * 100);
  }, [cards]);

  // Sync progress when it changes
  useEffect(() => {
    if (!loading && cards.length > 0) {
      syncProgress(progress);
    }
  }, [progress, loading, cards.length, syncProgress]);

  // Fetch cards
  useEffect(() => {
    if (workflowId) {
      fetchCards();
    }
  }, [workflowId, node.id]);

  const fetchCards = async () => {
    if (!workflowId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("workflow_kanban_cards")
        .select("*")
        .eq("workflow_id", workflowId)
        .eq("workflow_item_id", node.id)
        .order("orden");

      if (error) throw error;

      setCards((data || []).map((c: any) => ({
        id: c.id,
        titulo: c.titulo,
        descripcion: c.descripcion,
        status: c.status,
        orden: c.orden,
        asignado_a: c.asignado_a,
        fecha_vencimiento: c.fecha_vencimiento,
        prioridad: c.prioridad || "media",
        etiquetas: c.etiquetas || [],
      })));
    } catch (error) {
      console.error("Error fetching cards:", error);
    }
    setLoading(false);
  };

  // Add new card
  const addCard = async () => {
    if (!workflowId || !newCardTitle.trim()) return;

    setSaving(true);
    try {
      const columnCards = cards.filter(c => c.status === newCardColumn);
      const orden = columnCards.length;

      const { data, error } = await supabase
        .from("workflow_kanban_cards")
        .insert({
          workflow_id: workflowId,
          workflow_item_id: node.id,
          titulo: newCardTitle.trim(),
          status: newCardColumn,
          orden,
          prioridad: "media",
          etiquetas: [],
        })
        .select()
        .single();

      if (error) throw error;

      const newCard: KanbanCard = {
        id: data.id,
        titulo: data.titulo,
        descripcion: data.descripcion || undefined,
        status: data.status,
        orden: data.orden,
        asignado_a: data.asignado_a || undefined,
        fecha_vencimiento: data.fecha_vencimiento || undefined,
        prioridad: data.prioridad || "media",
        etiquetas: Array.isArray(data.etiquetas) ? data.etiquetas as { color: string; label: string }[] : [],
      };
      setCards([...cards, newCard]);

      setNewCardTitle("");
      setShowNewCardDialog(false);
      toast.success("Tarjeta creada");
    } catch (error) {
      console.error("Error adding card:", error);
      toast.error("Error al crear tarjeta");
    }
    setSaving(false);
  };

  // Update card
  const updateCard = async (cardId: string, updates: Partial<KanbanCard>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("workflow_kanban_cards")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cardId);

      if (error) throw error;

      setCards(cards.map(c => c.id === cardId ? { ...c, ...updates } : c));
      toast.success("Tarjeta actualizada");
    } catch (error) {
      console.error("Error updating card:", error);
      toast.error("Error al actualizar");
    }
    setSaving(false);
  };

  // Delete card
  const deleteCard = async (cardId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("workflow_kanban_cards")
        .delete()
        .eq("id", cardId);

      if (error) throw error;

      setCards(cards.filter(c => c.id !== cardId));
      setEditingCard(null);
      toast.success("Tarjeta eliminada");
    } catch (error) {
      console.error("Error deleting card:", error);
      toast.error("Error al eliminar");
    }
    setSaving(false);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggingCard(cardId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    if (!draggingCard) return;

    const card = cards.find(c => c.id === draggingCard);
    if (!card || card.status === targetColumn) {
      setDraggingCard(null);
      return;
    }

    // Calculate new order
    const columnCards = cards.filter(c => c.status === targetColumn);
    const newOrden = columnCards.length;

    await updateCard(draggingCard, { status: targetColumn, orden: newOrden });
    setDraggingCard(null);
  };

  // Get profile name
  const getProfileName = (userId?: string) => {
    if (!userId) return null;
    const profile = profiles.find(p => p.id === userId);
    return profile?.full_name;
  };

  // Stats
  const stats = useMemo(() => ({
    total: cards.length,
    pendiente: cards.filter(c => c.status === "pendiente").length,
    en_progreso: cards.filter(c => c.status === "en_progreso").length,
    en_revision: cards.filter(c => c.status === "en_revision").length,
    completado: cards.filter(c => c.status === "completado").length,
  }), [cards]);

  const renderCard = (card: KanbanCard) => {
    const isOverdue = card.fecha_vencimiento && !["completado"].includes(card.status) && isPast(parseISO(card.fecha_vencimiento));
    const assigneeName = getProfileName(card.asignado_a);
    const priority = PRIORITIES.find(p => p.value === card.prioridad);

    return (
      <div
        key={card.id}
        className={cn(
          "bg-card border rounded-lg p-3 cursor-grab shadow-sm hover:shadow-md transition-all",
          draggingCard === card.id && "opacity-50",
          isOverdue && "border-red-300 dark:border-red-700"
        )}
        draggable
        onDragStart={(e) => handleDragStart(e, card.id)}
        onClick={() => setEditingCard(card)}
      >
        {/* Tags */}
        {card.etiquetas.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {card.etiquetas.map((tag, idx) => (
              <div
                key={idx}
                className="h-1.5 w-8 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
            ))}
          </div>
        )}

        {/* Title */}
        <h4 className="font-medium text-sm mb-2 line-clamp-2">{card.titulo}</h4>

        {/* Description preview */}
        {card.descripcion && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{card.descripcion}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Priority */}
            {priority && (
              <Badge variant="secondary" className={cn("text-[10px] h-5", priority.color)}>
                {priority.label}
              </Badge>
            )}

            {/* Due date */}
            {card.fecha_vencimiento && (
              <span className={cn(
                "text-[10px] flex items-center gap-1",
                isOverdue ? "text-red-600" : "text-muted-foreground"
              )}>
                {isOverdue && <AlertTriangle className="h-3 w-3" />}
                <Clock className="h-3 w-3" />
                {format(parseISO(card.fecha_vencimiento), "dd MMM", { locale: es })}
              </span>
            )}
          </div>

          {/* Assignee */}
          {assigneeName && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]">
                {getInitials(assigneeName)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <ListTodo className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="font-semibold">{node.label}</h3>
            <p className="text-xs text-muted-foreground">
              {stats.completado}/{stats.total} tareas completadas
            </p>
            {/* Metadata: Responsable and dates */}
            {(node.data?.asignado_nombre || (node.data?.fecha_inicio && node.data.fecha_inicio.trim()) || (node.data?.fecha_termino && node.data.fecha_termino.trim())) && (
              <div className="flex items-center gap-3 mt-1">
                {node.data?.asignado_nombre && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{node.data.asignado_nombre}</span>
                  </div>
                )}
                {((node.data?.fecha_inicio && node.data.fecha_inicio.trim()) || (node.data?.fecha_termino && node.data.fecha_termino.trim())) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    <span>
                      {formatDateSafe(node.data.fecha_inicio) || "—"} - {formatDateSafe(node.data.fecha_termino) || "—"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <Progress 
                value={progress} 
                className={cn(
                  "w-32 h-2",
                  progress >= 100 && "[&>div]:bg-green-500",
                  progress > 0 && progress < 100 && "[&>div]:bg-amber-500"
                )} 
              />
              <span className={cn(
                "text-sm font-bold min-w-[40px] text-right",
                progress >= 100 && "text-green-600",
                progress > 0 && progress < 100 && "text-amber-600"
              )}>
                {progress}%
              </span>
            </div>
          </div>
          
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setNewCardColumn("pendiente");
              setShowNewCardDialog(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva Tarjeta
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => {
            const columnCards = cards.filter(c => c.status === column.id).sort((a, b) => a.orden - b.orden);

            return (
              <div
                key={column.id}
                className={cn(
                  "flex-shrink-0 w-72 rounded-lg",
                  column.color
                )}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column header */}
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm">{column.label}</h3>
                    <Badge variant="secondary" className="h-5 text-xs">
                      {columnCards.length}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setNewCardColumn(column.id);
                      setShowNewCardDialog(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Cards */}
                <ScrollArea className="h-[calc(100vh-350px)]">
                  <div className="p-2 space-y-2">
                    {columnCards.map(renderCard)}

                    {columnCards.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-xs">
                        Sin tarjetas
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      )}

      {/* New Card Dialog */}
      <Dialog open={showNewCardDialog} onOpenChange={setShowNewCardDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Nueva Tarjeta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Título de la tarjeta"
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCard()}
            />
            <Select value={newCardColumn} onValueChange={setNewCardColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Columna" />
              </SelectTrigger>
              <SelectContent>
                {COLUMNS.map((col) => (
                  <SelectItem key={col.id} value={col.id}>{col.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCardDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={addCard} disabled={!newCardTitle.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Card Dialog */}
      {editingCard && (
        <Dialog open={!!editingCard} onOpenChange={() => setEditingCard(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Tarjeta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Título"
                value={editingCard.titulo}
                onChange={(e) => setEditingCard({ ...editingCard, titulo: e.target.value })}
              />
              <Textarea
                placeholder="Descripción"
                value={editingCard.descripcion || ""}
                onChange={(e) => setEditingCard({ ...editingCard, descripcion: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Estado</label>
                  <Select
                    value={editingCard.status}
                    onValueChange={(v) => setEditingCard({ ...editingCard, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMNS.map((col) => (
                        <SelectItem key={col.id} value={col.id}>{col.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Prioridad</label>
                  <Select
                    value={editingCard.prioridad}
                    onValueChange={(v) => setEditingCard({ ...editingCard, prioridad: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assignee */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Asignado</label>
                  <Select
                    value={editingCard.asignado_a || "none"}
                    onValueChange={(v) => setEditingCard({ ...editingCard, asignado_a: v === "none" ? undefined : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.full_name || p.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Due date */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Vencimiento</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {editingCard.fecha_vencimiento
                          ? format(parseISO(editingCard.fecha_vencimiento), "dd MMM yyyy", { locale: es })
                          : "Seleccionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={editingCard.fecha_vencimiento ? parseISO(editingCard.fecha_vencimiento) : undefined}
                        onSelect={(date) => setEditingCard({
                          ...editingCard,
                          fecha_vencimiento: date?.toISOString().split("T")[0]
                        })}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Etiquetas</label>
                <div className="flex flex-wrap gap-2">
                  {TAG_COLORS.map((tag) => {
                    const isSelected = editingCard.etiquetas.some(t => t.color === tag.color);
                    return (
                      <button
                        key={tag.color}
                        className={cn(
                          "h-6 w-12 rounded transition-all",
                          isSelected ? "ring-2 ring-offset-2 ring-primary" : "opacity-60 hover:opacity-100"
                        )}
                        style={{ backgroundColor: tag.color }}
                        onClick={() => {
                          if (isSelected) {
                            setEditingCard({
                              ...editingCard,
                              etiquetas: editingCard.etiquetas.filter(t => t.color !== tag.color)
                            });
                          } else {
                            setEditingCard({
                              ...editingCard,
                              etiquetas: [...editingCard.etiquetas, { color: tag.color, label: tag.label }]
                            });
                          }
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter className="flex justify-between">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteCard(editingCard.id)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingCard(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    updateCard(editingCard.id, {
                      titulo: editingCard.titulo,
                      descripcion: editingCard.descripcion,
                      status: editingCard.status,
                      prioridad: editingCard.prioridad,
                      asignado_a: editingCard.asignado_a,
                      fecha_vencimiento: editingCard.fecha_vencimiento,
                      etiquetas: editingCard.etiquetas,
                    });
                    setEditingCard(null);
                  }}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

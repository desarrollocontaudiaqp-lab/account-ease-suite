import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Database,
  Plus,
  FileText,
  Table as TableIcon,
  CheckSquare,
  Trash2,
  GripVertical,
  Loader2,
  Edit3,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TreeNode } from "../WorkFlowTreeSidebar";
import { useWorkflowItemProgress } from "@/hooks/useWorkflowItemProgress";

interface DataNotionViewProps {
  node: TreeNode;
  workflowId?: string;
  onRefresh?: () => void;
}

interface NoteBlock {
  id: string;
  tipo: "nota" | "tabla" | "checklist";
  titulo?: string;
  content: any;
  metadata?: any;
  orden: number;
}

const statusColors: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  en_progreso: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completado: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  bloqueado: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function DataNotionView({ node, workflowId, onRefresh }: DataNotionViewProps) {
  const [notes, setNotes] = useState<NoteBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Hook to sync progress to workflow JSON
  const { syncProgress } = useWorkflowItemProgress(workflowId, node.id, onRefresh);

  // Calculate progress based on completed elements
  // Checklist: % of items completed
  // Table: % of rows with estado="completado"
  // Nota: considered complete if has content
  const progress = useMemo(() => {
    if (notes.length === 0) return 0;
    
    let totalElements = 0;
    let completedElements = 0;

    notes.forEach(note => {
      if (note.tipo === "checklist") {
        const items = note.content?.items || [];
        totalElements += items.length;
        completedElements += items.filter((i: any) => i.completado).length;
      } else if (note.tipo === "tabla") {
        const rows = note.content?.rows || [];
        totalElements += rows.length;
        completedElements += rows.filter((r: any) => r.Estado === "completado").length;
      } else if (note.tipo === "nota") {
        totalElements += 1;
        // Nota is complete if it has text content
        if (note.content?.text && note.content.text.trim().length > 0) {
          completedElements += 1;
        }
      }
    });

    return totalElements > 0 ? Math.round((completedElements / totalElements) * 100) : 0;
  }, [notes]);

  // Sync progress when it changes
  useEffect(() => {
    if (!loading && notes.length > 0) {
      syncProgress(progress);
    }
  }, [progress, loading, notes.length, syncProgress]);

  // Fetch notes for this item
  useEffect(() => {
    if (workflowId) {
      fetchNotes();
    }
  }, [workflowId, node.id]);

  const fetchNotes = async () => {
    if (!workflowId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("workflow_notes")
        .select("*")
        .eq("workflow_id", workflowId)
        .eq("workflow_item_id", node.id)
        .order("orden");

      if (error) throw error;

      setNotes((data || []).map((n: any) => ({
        id: n.id,
        tipo: n.tipo,
        titulo: n.titulo,
        content: n.content,
        metadata: n.metadata,
        orden: n.orden,
      })));
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
    setLoading(false);
  };

  // Add new note block
  const addNoteBlock = async (tipo: "nota" | "tabla" | "checklist") => {
    if (!workflowId) return;

    setSaving(true);
    try {
      const defaultContent = tipo === "nota" 
        ? { text: "" }
        : tipo === "tabla"
          ? { columns: ["Campo", "Valor", "Estado"], rows: [] }
          : { items: [] };

      const { data, error } = await supabase
        .from("workflow_notes")
        .insert({
          workflow_id: workflowId,
          workflow_item_id: node.id,
          tipo,
          titulo: tipo === "nota" ? "Nueva nota" : tipo === "tabla" ? "Nueva tabla" : "Checklist",
          content: defaultContent,
          metadata: {},
          orden: notes.length,
        })
        .select()
        .single();

      if (error) throw error;

      const newNote: NoteBlock = {
        id: data.id,
        tipo: data.tipo as "nota" | "tabla" | "checklist",
        titulo: data.titulo,
        content: data.content,
        metadata: data.metadata,
        orden: data.orden,
      };
      setNotes([...notes, newNote]);

      toast.success("Bloque agregado");
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Error al agregar bloque");
    }
    setSaving(false);
  };

  // Update note content
  const updateNote = async (noteId: string, updates: Partial<NoteBlock>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("workflow_notes")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", noteId);

      if (error) throw error;

      setNotes(notes.map(n => n.id === noteId ? { ...n, ...updates } : n));
      toast.success("Guardado");
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Error al guardar");
    }
    setSaving(false);
  };

  // Delete note
  const deleteNote = async (noteId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("workflow_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      setNotes(notes.filter(n => n.id !== noteId));
      toast.success("Bloque eliminado");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Error al eliminar");
    }
    setSaving(false);
  };

  // Get completion stats for display
  const completionStats = useMemo(() => {
    let totalElements = 0;
    let completedElements = 0;

    notes.forEach(note => {
      if (note.tipo === "checklist") {
        const items = note.content?.items || [];
        totalElements += items.length;
        completedElements += items.filter((i: any) => i.completado).length;
      } else if (note.tipo === "tabla") {
        const rows = note.content?.rows || [];
        totalElements += rows.length;
        completedElements += rows.filter((r: any) => r.Estado === "completado").length;
      } else if (note.tipo === "nota") {
        totalElements += 1;
        if (note.content?.text && note.content.text.trim().length > 0) {
          completedElements += 1;
        }
      }
    });

    return { total: totalElements, completed: completedElements };
  }, [notes]);

  const renderNoteBlock = (note: NoteBlock) => {
    const isEditing = editingNote === note.id;

    switch (note.tipo) {
      case "nota":
        return (
          <Card key={note.id} className="group">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100" />
                <FileText className="h-4 w-4 text-blue-500" />
                <Input
                  value={note.titulo || ""}
                  onChange={(e) => updateNote(note.id, { titulo: e.target.value })}
                  className="h-7 w-auto font-medium border-none shadow-none focus-visible:ring-0 px-1"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={() => deleteNote(note.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </CardHeader>
            <CardContent>
              <Textarea
                value={note.content?.text || ""}
                onChange={(e) => updateNote(note.id, { content: { text: e.target.value } })}
                placeholder="Escribe tus notas aquí..."
                className="min-h-[100px] resize-none"
              />
            </CardContent>
          </Card>
        );

      case "tabla":
        const columns = note.content?.columns || ["Campo", "Valor", "Estado"];
        const rows = note.content?.rows || [];

        const addRow = () => {
          const newRow = columns.reduce((acc: any, col: string) => ({ ...acc, [col]: "" }), { id: crypto.randomUUID() });
          updateNote(note.id, { content: { columns, rows: [...rows, newRow] } });
        };

        const updateCell = (rowIdx: number, col: string, value: string) => {
          const newRows = [...rows];
          newRows[rowIdx] = { ...newRows[rowIdx], [col]: value };
          updateNote(note.id, { content: { columns, rows: newRows } });
        };

        const deleteRow = (rowIdx: number) => {
          const newRows = rows.filter((_: any, i: number) => i !== rowIdx);
          updateNote(note.id, { content: { columns, rows: newRows } });
        };

        return (
          <Card key={note.id} className="group">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100" />
                <TableIcon className="h-4 w-4 text-purple-500" />
                <Input
                  value={note.titulo || ""}
                  onChange={(e) => updateNote(note.id, { titulo: e.target.value })}
                  className="h-7 w-auto font-medium border-none shadow-none focus-visible:ring-0 px-1"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={() => deleteNote(note.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    {columns.map((col: string, idx: number) => (
                      <TableHead key={idx} className="text-xs">{col}</TableHead>
                    ))}
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row: any, rowIdx: number) => (
                    <TableRow key={row.id || rowIdx}>
                      {columns.map((col: string, colIdx: number) => (
                        <TableCell key={colIdx} className="py-1">
                          {col === "Estado" ? (
                            <Select
                              value={row[col] || "pendiente"}
                              onValueChange={(v) => updateCell(rowIdx, col, v)}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                <SelectItem value="en_progreso">En Progreso</SelectItem>
                                <SelectItem value="completado">Completado</SelectItem>
                                <SelectItem value="bloqueado">Bloqueado</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={row[col] || ""}
                              onChange={(e) => updateCell(rowIdx, col, e.target.value)}
                              className="h-7 text-xs"
                            />
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="py-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => deleteRow(rowIdx)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-2 border-t">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addRow}>
                  <Plus className="h-3 w-3" />
                  Agregar fila
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case "checklist":
        const items = note.content?.items || [];

        const toggleItem = (itemIdx: number) => {
          const newItems = [...items];
          newItems[itemIdx] = { ...newItems[itemIdx], completado: !newItems[itemIdx].completado };
          updateNote(note.id, { content: { items: newItems } });
        };

        const addItem = () => {
          const newItem = { id: crypto.randomUUID(), texto: "Nuevo item", completado: false };
          updateNote(note.id, { content: { items: [...items, newItem] } });
        };

        const updateItemText = (itemIdx: number, texto: string) => {
          const newItems = [...items];
          newItems[itemIdx] = { ...newItems[itemIdx], texto };
          updateNote(note.id, { content: { items: newItems } });
        };

        const deleteItem = (itemIdx: number) => {
          const newItems = items.filter((_: any, i: number) => i !== itemIdx);
          updateNote(note.id, { content: { items: newItems } });
        };

        const completedCount = items.filter((i: any) => i.completado).length;
        const itemProgress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

        return (
          <Card key={note.id} className="group">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100" />
                <CheckSquare className="h-4 w-4 text-green-500" />
                <Input
                  value={note.titulo || ""}
                  onChange={(e) => updateNote(note.id, { titulo: e.target.value })}
                  className="h-7 w-auto font-medium border-none shadow-none focus-visible:ring-0 px-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{completedCount}/{items.length}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteNote(note.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress value={itemProgress} className="h-1.5" />
              <div className="space-y-1">
                {items.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="flex items-center gap-2 group/item">
                    <button
                      className={cn(
                        "h-5 w-5 rounded border-2 flex items-center justify-center transition-colors",
                        item.completado
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-muted-foreground/30 hover:border-green-500"
                      )}
                      onClick={() => toggleItem(idx)}
                    >
                      {item.completado && <CheckSquare className="h-3 w-3" />}
                    </button>
                    <Input
                      value={item.texto}
                      onChange={(e) => updateItemText(idx, e.target.value)}
                      className={cn(
                        "h-7 flex-1 text-sm border-none shadow-none focus-visible:ring-0 px-1",
                        item.completado && "line-through text-muted-foreground"
                      )}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover/item:opacity-100"
                      onClick={() => deleteItem(idx)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addItem}>
                <Plus className="h-3 w-3" />
                Agregar item
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold">{node.label}</h3>
            <p className="text-xs text-muted-foreground">Vista de datos y anotaciones</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
            <span className="text-[10px] text-muted-foreground">
              {completionStats.completed}/{completionStats.total} elementos
            </span>
          </div>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {/* Add block buttons */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => addNoteBlock("nota")}>
          <FileText className="h-3.5 w-3.5" />
          Nota
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => addNoteBlock("tabla")}>
          <TableIcon className="h-3.5 w-3.5" />
          Tabla
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => addNoteBlock("checklist")}>
          <CheckSquare className="h-3.5 w-3.5" />
          Checklist
        </Button>
      </div>

      {/* Notes/blocks */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Database className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Sin contenido</p>
            <p className="text-sm">Agrega notas, tablas o checklists para organizar la información</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map(renderNoteBlock)}
        </div>
      )}
    </div>
  );
}

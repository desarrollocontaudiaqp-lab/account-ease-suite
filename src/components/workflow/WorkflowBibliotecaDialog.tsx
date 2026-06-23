import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Library, Search, Edit2, Trash2, Loader2, Send, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WorkFlowModal } from "@/components/asignaciones/WorkFlowModal";

interface BibliotecaWorkflow {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  id_workflow_origen: string | null;
  items: any[];
  created_at: string;
  updated_at: string;
}

interface ContratoOption {
  id: string;
  numero: string;
  descripcion: string;
  tipo_servicio: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  cliente_id: string;
  cliente?: { razon_social: string; codigo: string };
  cartera?: { id: string; nombre: string; especialidad: string | null } | null;
}

interface WorkflowBibliotecaDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAssigned?: () => void;
}

const DUMMY_CONTRATO = {
  id: "biblioteca",
  numero: "BIBLIOTECA",
  descripcion: "Edición de Workflow de Biblioteca",
  tipo_servicio: "Biblioteca",
  fecha_inicio: new Date().toISOString().slice(0, 10),
  fecha_fin: null,
  cliente: { razon_social: "Biblioteca", codigo: "" },
  cartera: { id: "biblioteca", nombre: "Biblioteca", especialidad: null },
};

export function WorkflowBibliotecaDialog({ open, onOpenChange, onAssigned }: WorkflowBibliotecaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<BibliotecaWorkflow[]>([]);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | undefined>();
  const [editingNombre, setEditingNombre] = useState<string>("");

  // Assign flow
  const [assignTarget, setAssignTarget] = useState<BibliotecaWorkflow | null>(null);
  const [contratos, setContratos] = useState<ContratoOption[]>([]);
  const [loadingContratos, setLoadingContratos] = useState(false);
  const [contratoSearch, setContratoSearch] = useState("");
  const [selectedContratoId, setSelectedContratoId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("workflow_biblioteca" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setList(((data as any[]) || []) as BibliotecaWorkflow[]);
    } catch (e: any) {
      console.error(e);
      toast.error("Error al cargar la biblioteca");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const loadContratos = async () => {
    if (contratos.length > 0) return;
    setLoadingContratos(true);
    try {
      const { data: cs, error } = await supabase
        .from("contratos")
        .select("id, numero, descripcion, tipo_servicio, fecha_inicio, fecha_fin, cliente_id")
        .in("condicion", ["Vigente"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      const clienteIds = [...new Set((cs || []).map((c) => c.cliente_id))];
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, razon_social, codigo")
        .in("id", clienteIds);
      const { data: cc } = await supabase.from("cartera_clientes").select("cliente_id, cartera_id");
      const { data: cart } = await supabase.from("carteras").select("id, nombre, especialidad");
      const clMap = new Map((clientes || []).map((c) => [c.id, c]));
      const ccMap = new Map((cc || []).map((x) => [x.cliente_id, x.cartera_id]));
      const cMap = new Map((cart || []).map((c) => [c.id, c]));
      setContratos(
        (cs || []).map((c) => {
          const cli = clMap.get(c.cliente_id);
          const carId = ccMap.get(c.cliente_id);
          const cartera = carId ? cMap.get(carId) : null;
          return {
            ...c,
            cliente: cli ? { razon_social: cli.razon_social, codigo: cli.codigo } : undefined,
            cartera: cartera ? { id: cartera.id, nombre: cartera.nombre, especialidad: cartera.especialidad } : null,
          } as ContratoOption;
        }),
      );
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar contratos");
    }
    setLoadingContratos(false);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (w) =>
        w.nombre.toLowerCase().includes(q) ||
        w.codigo.toLowerCase().includes(q) ||
        (w.descripcion || "").toLowerCase().includes(q) ||
        (w.id_workflow_origen || "").toLowerCase().includes(q),
    );
  }, [list, search]);

  const filteredContratos = useMemo(() => {
    const q = contratoSearch.trim().toLowerCase();
    if (!q) return contratos;
    return contratos.filter(
      (c) =>
        c.numero.toLowerCase().includes(q) ||
        c.descripcion.toLowerCase().includes(q) ||
        (c.cliente?.razon_social || "").toLowerCase().includes(q) ||
        (c.cliente?.codigo || "").toLowerCase().includes(q),
    );
  }, [contratos, contratoSearch]);

  const stats = (items: any[]) => ({
    acts: items.filter((i) => i.tipo === "actividad").length,
    inputs: items.filter((i) => i.tipo === "input").length,
    tareas: items.filter((i) => i.tipo === "tarea").length,
    outputs: items.filter((i) => i.tipo === "output").length,
    sups: items.filter((i) => i.tipo === "supervision").length,
  });

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const { error } = await supabase.from("workflow_biblioteca" as any).delete().eq("id", deletingId);
      if (error) throw error;
      toast.success("Workflow eliminado de la biblioteca");
      setList((prev) => prev.filter((w) => w.id !== deletingId));
    } catch (e) {
      console.error(e);
      toast.error("Error al eliminar");
    }
    setDeletingId(null);
  };

  const handleEdit = (w: BibliotecaWorkflow) => {
    setEditingWorkflowId(w.id);
    setEditingNombre(w.nombre);
    setEditOpen(true);
  };

  const handleAssignClick = async (w: BibliotecaWorkflow) => {
    setAssignTarget(w);
    setSelectedContratoId("");
    setContratoSearch("");
    await loadContratos();
  };

  const handleConfirmAssign = async () => {
    if (!assignTarget || !selectedContratoId) return;
    setAssigning(true);
    try {
      const contrato = contratos.find((c) => c.id === selectedContratoId);
      if (!contrato) throw new Error("Contrato no encontrado");

      // Clone items with NEW UUIDs and remap parentId / conexiones
      const idMap = new Map<string, string>();
      const sourceItems = (assignTarget.items || []) as any[];
      sourceItems.forEach((it) => idMap.set(it.id, crypto.randomUUID()));
      const clonedItems = sourceItems.map((it) => ({
        ...it,
        id: idMap.get(it.id),
        parentId: it.parentId ? idMap.get(it.parentId) || null : null,
        conexiones: Array.isArray(it.conexiones)
          ? it.conexiones.map((c: string) => idMap.get(c)).filter(Boolean)
          : null,
        // Reset progress when assigning fresh to a contract
        completado: false,
        progreso: 0,
        // Strip per-user assignments (left for user to reassign)
        asignado_a: null,
        asignado_nombre: null,
      }));

      // Check if contrato already has an asignado workflow
      const { data: existing } = await supabase
        .from("workflows")
        .select("id")
        .eq("contrato_id", contrato.id)
        .eq("tipo", "asignado")
        .maybeSingle();

      if (existing) {
        const ok = window.confirm(
          "Este contrato ya tiene un workflow asignado. ¿Deseas reemplazarlo con el de la biblioteca?",
        );
        if (!ok) {
          setAssigning(false);
          return;
        }
        const { error: upErr } = await supabase
          .from("workflows")
          .update({ items: clonedItems as any, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (upErr) throw upErr;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { data: codeData, error: codeError } = await supabase.rpc("get_next_workflow_code");
        if (codeError) throw codeError;
        const { error: insErr } = await supabase.from("workflows").insert({
          codigo: codeData as string,
          contrato_id: contrato.id,
          tipo: "asignado",
          items: clonedItems as any,
          created_by: userData?.user?.id,
        } as any);
        if (insErr) throw insErr;
      }

      toast.success(`Workflow asignado al contrato ${contrato.numero}`);
      setAssignTarget(null);
      setSelectedContratoId("");
      onAssigned?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Error al asignar workflow");
    }
    setAssigning(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library className="h-5 w-5 text-primary" />
              Biblioteca de Workflows
            </DialogTitle>
            <DialogDescription>
              Workflows reutilizables disponibles para asignar a cualquier contrato.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, código u origen…"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[55vh] pr-2">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <FileSpreadsheet className="h-10 w-10 mx-auto mb-2 opacity-40" />
                {list.length === 0
                  ? "Aún no hay workflows en la biblioteca. Importa un Excel con la columna ID_WorkFlow."
                  : "Sin coincidencias para tu búsqueda."}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((w) => {
                  const s = stats(w.items || []);
                  return (
                    <div key={w.id} className="rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono text-xs">{w.codigo}</Badge>
                            {w.id_workflow_origen && (
                              <Badge variant="secondary" className="text-[10px]">{w.id_workflow_origen}</Badge>
                            )}
                            <span className="text-sm font-medium truncate">{w.nombre}</span>
                          </div>
                          {w.descripcion && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{w.descripcion}</p>
                          )}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{s.acts} act</Badge>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{s.inputs} inp</Badge>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{s.tareas} proc</Badge>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{s.outputs} out</Badge>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{s.sups} sup</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 gap-1.5"
                            onClick={() => handleAssignClick(w)}
                          >
                            <Send className="h-3.5 w-3.5" />
                            Asignar
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleEdit(w)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeletingId(w.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar workflow de la biblioteca?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los contratos que ya tienen una copia asignada no se verán afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign dialog */}
      <Dialog open={!!assignTarget} onOpenChange={(o) => !o && setAssignTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Asignar a contrato</DialogTitle>
            <DialogDescription>
              Se creará una copia independiente del workflow <span className="font-semibold">{assignTarget?.nombre}</span> en el contrato seleccionado. El workflow original permanece en la biblioteca.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contrato por número, cliente o RUC…"
                className="pl-8"
                value={contratoSearch}
                onChange={(e) => setContratoSearch(e.target.value)}
              />
            </div>
            <ScrollArea className="h-64 border rounded-md">
              {loadingContratos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredContratos.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">Sin contratos.</div>
              ) : (
                <div className="divide-y">
                  {filteredContratos.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedContratoId(c.id)}
                      className={`w-full text-left p-2.5 hover:bg-muted/50 transition-colors ${
                        selectedContratoId === c.id ? "bg-primary/10" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">{c.numero}</Badge>
                        <span className="text-sm font-medium truncate">{c.cliente?.razon_social}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {c.tipo_servicio} · {c.descripcion}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)} disabled={assigning}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmAssign} disabled={!selectedContratoId || assigning}>
              {assigning && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Confirmar asignación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editor */}
      {editOpen && (
        <WorkFlowModal
          open={editOpen}
          onOpenChange={(o) => {
            setEditOpen(o);
            if (!o) {
              setEditingWorkflowId(undefined);
              load();
            }
          }}
          contrato={DUMMY_CONTRATO as any}
          miembros={[]}
          tipoWorkflow="biblioteca"
          nombrePlantilla={editingNombre}
          workflowIdOverride={editingWorkflowId}
        />
      )}
    </>
  );
}
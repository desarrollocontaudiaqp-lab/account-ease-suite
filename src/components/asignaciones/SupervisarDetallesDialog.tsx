import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ShieldCheck,
  Loader2,
  Save,
  History,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  User,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Estado = "pendiente" | "en_proceso" | "cumplido" | "observado" | "no_cumplido";

export const ESTADOS_SUPERVISION: { value: Estado; label: string; className: string }[] = [
  { value: "pendiente", label: "Pendiente", className: "bg-muted text-muted-foreground" },
  { value: "en_proceso", label: "En proceso", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "cumplido", label: "Cumplido", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  { value: "observado", label: "Observado", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  { value: "no_cumplido", label: "No cumplido", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
];

const estadoMeta = (estado: string) =>
  ESTADOS_SUPERVISION.find((e) => e.value === estado) || ESTADOS_SUPERVISION[0];

const EstadoIcon = ({ estado }: { estado: string }) => {
  switch (estado) {
    case "cumplido":
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case "observado":
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    case "no_cumplido":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "en_proceso":
      return <Clock className="h-4 w-4 text-blue-600" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

interface Detalle {
  id: string;
  descripcion: string;
  asignado_a?: string | null;
  asignado_nombre?: string | null;
}

interface Projection {
  id: string;
  descripcion: string;
  detalles?: Detalle[];
}

interface SupervisionRow {
  id: string;
  detalle_id: string;
  estado: Estado;
  observaciones: string | null;
  supervisado_por: string | null;
  supervisado_en: string | null;
}

interface HistorialRow {
  id: string;
  supervision_id: string;
  estado_anterior: string | null;
  estado_nuevo: string;
  observaciones: string | null;
  user_id: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: { id: string; numero: string; descripcion: string } | null;
  canSupervise?: boolean;
}

interface DraftState {
  estado: Estado;
  observaciones: string;
}

// The supervision tables are created via SQL migration; cast to bypass generated types.
const db = supabase as unknown as {
  from: (table: string) => any;
};

export const SupervisarDetallesDialog = ({ open, onOpenChange, contrato, canSupervise = false }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projections, setProjections] = useState<Projection[]>([]);
  const [rows, setRows] = useState<Record<string, SupervisionRow>>({});
  const [historial, setHistorial] = useState<HistorialRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!contrato) return;
    setLoading(true);
    try {
      const [{ data: contratoData }, supRes, profRes] = await Promise.all([
        supabase.from("contratos").select("datos_plantilla").eq("id", contrato.id).maybeSingle(),
        db.from("detalle_supervisiones").select("*").eq("contrato_id", contrato.id),
        supabase.from("profiles").select("id, full_name, email"),
      ]);

      const dp = (contratoData?.datos_plantilla as Record<string, unknown>) || {};
      const raw = Array.isArray(dp.projections) ? (dp.projections as Projection[]) : [];
      const projs = raw.map((p) => ({ ...p, detalles: Array.isArray(p.detalles) ? p.detalles : [] }));
      setProjections(projs);

      const map: Record<string, SupervisionRow> = {};
      ((supRes?.data as SupervisionRow[]) || []).forEach((r) => {
        map[r.detalle_id] = r;
      });
      setRows(map);

      const draftMap: Record<string, DraftState> = {};
      projs.forEach((p) =>
        (p.detalles || []).forEach((d) => {
          draftMap[d.id] = {
            estado: (map[d.id]?.estado as Estado) || "pendiente",
            observaciones: map[d.id]?.observaciones || "",
          };
        })
      );
      setDrafts(draftMap);

      const pm: Record<string, string> = {};
      (profRes.data || []).forEach((p: any) => {
        pm[p.id] = p.full_name || p.email;
      });
      setProfiles(pm);

      const ids = Object.values(map).map((r) => r.id);
      if (ids.length) {
        const { data: hist } = await db
          .from("detalle_supervision_historial")
          .select("*")
          .in("supervision_id", ids)
          .order("created_at", { ascending: false });
        setHistorial((hist as HistorialRow[]) || []);
      } else {
        setHistorial([]);
      }
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cargar la supervisión del contrato");
    }
    setLoading(false);
  }, [contrato]);

  useEffect(() => {
    if (open && contrato) load();
  }, [open, contrato, load]);

  const allDetalles = useMemo(
    () =>
      projections.flatMap((p) =>
        (p.detalles || []).map((d) => ({ servicio: p, detalle: d }))
      ),
    [projections]
  );

  const stats = useMemo(() => {
    const total = allDetalles.length;
    const counts = { cumplido: 0, observado: 0, no_cumplido: 0, en_proceso: 0, pendiente: 0 } as Record<string, number>;
    allDetalles.forEach(({ detalle }) => {
      const estado = drafts[detalle.id]?.estado || "pendiente";
      counts[estado] = (counts[estado] || 0) + 1;
    });
    const progreso = total > 0 ? Math.round((counts.cumplido / total) * 100) : 0;
    return { total, counts, progreso };
  }, [allDetalles, drafts]);

  const dirty = useMemo(
    () =>
      allDetalles.some(({ detalle }) => {
        const d = drafts[detalle.id];
        const r = rows[detalle.id];
        if (!d) return false;
        return d.estado !== (r?.estado || "pendiente") || d.observaciones !== (r?.observaciones || "");
      }),
    [allDetalles, drafts, rows]
  );

  const setDraft = (detalleId: string, patch: Partial<DraftState>) =>
    setDrafts((prev) => ({
      ...prev,
      [detalleId]: { estado: prev[detalleId]?.estado || "pendiente", observaciones: prev[detalleId]?.observaciones || "", ...patch },
    }));

  const handleSave = async () => {
    if (!contrato || !user) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const changed = allDetalles.filter(({ detalle }) => {
        const d = drafts[detalle.id];
        const r = rows[detalle.id];
        return d && (d.estado !== (r?.estado || "pendiente") || d.observaciones !== (r?.observaciones || ""));
      });

      for (const { servicio, detalle } of changed) {
        const draft = drafts[detalle.id];
        const existing = rows[detalle.id];
        const payload = {
          contrato_id: contrato.id,
          servicio_id: String(servicio.id || ""),
          servicio_descripcion: servicio.descripcion || null,
          detalle_id: detalle.id,
          detalle_descripcion: detalle.descripcion || null,
          asignado_a: detalle.asignado_a || null,
          estado: draft.estado,
          observaciones: draft.observaciones || null,
          supervisado_por: user.id,
          supervisado_en: now,
        };

        let supervisionId = existing?.id;
        if (existing) {
          const { error } = await db.from("detalle_supervisiones").update(payload).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { data, error } = await db
            .from("detalle_supervisiones")
            .insert(payload)
            .select()
            .single();
          if (error) throw error;
          supervisionId = data.id;
        }

        await db.from("detalle_supervision_historial").insert({
          supervision_id: supervisionId,
          contrato_id: contrato.id,
          estado_anterior: existing?.estado || null,
          estado_nuevo: draft.estado,
          observaciones: draft.observaciones || null,
          user_id: user.id,
        });
      }

      toast.success(`Supervisión registrada (${changed.length} ${changed.length === 1 ? "detalle" : "detalles"})`);
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message?.includes("does not exist")
        ? "Falta ejecutar la migración de supervisión en la base de datos"
        : "Error al guardar la supervisión");
    }
    setSaving(false);
  };

  const marcarTodos = (servicio: Projection, estado: Estado) => {
    (servicio.detalles || []).forEach((d) => setDraft(d.id, { estado }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Supervisión de Detalles
          </DialogTitle>
          <DialogDescription>
            {contrato
              ? `Contrato ${contrato.numero} — verifica el cumplimiento de cada tarea asignada a los integrantes de la cartera.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : allDetalles.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            El contrato no tiene detalles registrados para supervisar.
          </p>
        ) : (
          <>
            {/* Resumen */}
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {ESTADOS_SUPERVISION.map((e) => (
                    <Badge key={e.value} className={cn("font-medium", e.className)} variant="secondary">
                      {e.label}: {stats.counts[e.value] || 0}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 min-w-[180px]">
                  <Progress value={stats.progreso} className="h-2 flex-1 [&>div]:bg-emerald-500" />
                  <span className="text-sm font-bold text-emerald-600 w-12 text-right">{stats.progreso}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.counts.cumplido || 0} de {stats.total} tareas verificadas como cumplidas
              </p>
            </div>

            <ScrollArea className="flex-1 -mx-2 px-2">
              <div className="space-y-4 py-2">
                {projections.map((servicio, idx) => {
                  const detalles = servicio.detalles || [];
                  if (detalles.length === 0) return null;
                  return (
                    <div key={servicio.id || idx} className="border border-border rounded-xl overflow-hidden">
                      <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold truncate">{servicio.descripcion}</p>
                        {canSupervise && (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground hidden sm:inline">Marcar todos:</span>
                            <Select onValueChange={(v) => marcarTodos(servicio, v as Estado)}>
                              <SelectTrigger className="h-8 w-[150px]">
                                <SelectValue placeholder="Estado" />
                              </SelectTrigger>
                              <SelectContent>
                                {ESTADOS_SUPERVISION.map((e) => (
                                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      <div className="divide-y divide-border">
                        {detalles.map((detalle) => {
                          const row = rows[detalle.id];
                          const draft = drafts[detalle.id] || { estado: "pendiente" as Estado, observaciones: "" };
                          const meta = estadoMeta(draft.estado);
                          const hist = historial.filter((h) => h.supervision_id === row?.id);
                          const isOpen = expanded === detalle.id;

                          return (
                            <div key={detalle.id} className="p-3 space-y-2">
                              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                  <EstadoIcon estado={draft.estado} />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium leading-snug">{detalle.descripcion}</p>
                                    <div className="flex flex-wrap items-center gap-3 mt-1">
                                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        {detalle.asignado_nombre ? (
                                          <>
                                            <Avatar className="h-4 w-4">
                                              <AvatarFallback className="text-[8px]">
                                                {getInitials(detalle.asignado_nombre)}
                                              </AvatarFallback>
                                            </Avatar>
                                            {detalle.asignado_nombre}
                                          </>
                                        ) : (
                                          <>
                                            <User className="h-3 w-3" /> Sin asignar
                                          </>
                                        )}
                                      </span>
                                      {row?.supervisado_en && (
                                        <span className="text-xs text-muted-foreground">
                                          Último registro:{" "}
                                          {format(new Date(row.supervisado_en), "dd MMM yyyy HH:mm", { locale: es })}
                                          {row.supervisado_por && profiles[row.supervisado_por]
                                            ? ` · ${profiles[row.supervisado_por]}`
                                            : ""}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {canSupervise ? (
                                    <Select
                                      value={draft.estado}
                                      onValueChange={(v) => setDraft(detalle.id, { estado: v as Estado })}
                                    >
                                      <SelectTrigger className="h-8 w-[160px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ESTADOS_SUPERVISION.map((e) => (
                                          <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Badge className={cn(meta.className)} variant="secondary">{meta.label}</Badge>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 gap-1 text-xs"
                                    onClick={() => setExpanded(isOpen ? null : detalle.id)}
                                  >
                                    <History className="h-3.5 w-3.5" />
                                    {hist.length}
                                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                                  </Button>
                                </div>
                              </div>

                              <Textarea
                                value={draft.observaciones}
                                onChange={(e) => setDraft(detalle.id, { observaciones: e.target.value })}
                                placeholder="Observaciones de la supervisión..."
                                className="min-h-[60px] text-sm"
                                readOnly={!canSupervise}
                              />

                              {isOpen && (
                                <div className="rounded-lg bg-muted/40 p-3 space-y-2">
                                  {hist.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">Sin registros de supervisión.</p>
                                  ) : (
                                    hist.map((h) => (
                                      <div key={h.id} className="text-xs border-l-2 border-primary/40 pl-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <Badge variant="secondary" className={cn("h-5", estadoMeta(h.estado_nuevo).className)}>
                                            {estadoMeta(h.estado_nuevo).label}
                                          </Badge>
                                          <span className="text-muted-foreground">
                                            {format(new Date(h.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                                          </span>
                                          {h.user_id && profiles[h.user_id] && (
                                            <span className="text-muted-foreground">· {profiles[h.user_id]}</span>
                                          )}
                                        </div>
                                        {h.observaciones && <p className="mt-1 text-muted-foreground">{h.observaciones}</p>}
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          {canSupervise && (
            <Button onClick={handleSave} disabled={saving || !dirty} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Registrar supervisión
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

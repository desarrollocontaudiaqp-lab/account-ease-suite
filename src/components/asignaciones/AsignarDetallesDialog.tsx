import { useState, useEffect } from "react";
import { Loader2, ListChecks, UserCheck, Save } from "lucide-react";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Miembro {
  user_id: string;
  rol_en_cartera?: string;
  profile: { full_name: string | null; email: string } | null;
}

interface Detalle {
  id: string;
  descripcion: string;
  asignado_a?: string | null;
  asignado_nombre?: string | null;
  [key: string]: unknown;
}

interface Projection {
  id: string;
  descripcion: string;
  color?: string;
  detalles?: Detalle[];
  [key: string]: unknown;
}

interface AsignarDetallesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: { id: string; numero: string; descripcion: string } | null;
  miembros: Miembro[];
  onSuccess?: () => void;
}

const UNASSIGNED = "__none__";

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export const AsignarDetallesDialog = ({
  open,
  onOpenChange,
  contrato,
  miembros,
  onSuccess,
}: AsignarDetallesDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [datosPlantilla, setDatosPlantilla] = useState<Record<string, unknown>>({});
  const [projections, setProjections] = useState<Projection[]>([]);

  useEffect(() => {
    if (!open || !contrato) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("contratos")
        .select("datos_plantilla")
        .eq("id", contrato.id)
        .maybeSingle();

      if (error) {
        toast.error("No se pudieron cargar los detalles del contrato");
        setLoading(false);
        return;
      }

      const dp = (data?.datos_plantilla as Record<string, unknown>) || {};
      const raw = Array.isArray(dp.projections) ? (dp.projections as Projection[]) : [];
      setDatosPlantilla(dp);
      setProjections(
        raw.map((p) => ({
          ...p,
          detalles: Array.isArray(p.detalles) ? p.detalles : [],
        }))
      );
      setLoading(false);
    };
    load();
  }, [open, contrato]);

  const assign = (serviceIndex: number, detalleId: string, userId: string) => {
    const miembro = miembros.find((m) => m.user_id === userId);
    setProjections((prev) =>
      prev.map((p, i) =>
        i !== serviceIndex
          ? p
          : {
              ...p,
              detalles: (p.detalles || []).map((d) =>
                d.id !== detalleId
                  ? d
                  : userId === UNASSIGNED
                    ? { ...d, asignado_a: null, asignado_nombre: null }
                    : {
                        ...d,
                        asignado_a: userId,
                        asignado_nombre: miembro?.profile?.full_name || miembro?.profile?.email || null,
                      }
              ),
            }
      )
    );
  };

  const assignAll = (serviceIndex: number, userId: string) => {
    const detalles = projections[serviceIndex]?.detalles || [];
    detalles.forEach((d) => assign(serviceIndex, d.id, userId));
  };

  const handleSave = async () => {
    if (!contrato) return;
    setSaving(true);
    const { error } = await supabase
      .from("contratos")
      .update({
        datos_plantilla: { ...datosPlantilla, projections } as never,
      })
      .eq("id", contrato.id);
    setSaving(false);

    if (error) {
      toast.error("Error al guardar las asignaciones");
      return;
    }
    toast.success("Detalles asignados correctamente");
    onSuccess?.();
    onOpenChange(false);
  };

  const totalDetalles = projections.reduce((s, p) => s + (p.detalles?.length || 0), 0);
  const asignados = projections.reduce(
    (s, p) => s + (p.detalles || []).filter((d) => d.asignado_a).length,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Asignar Detalles
          </DialogTitle>
          <DialogDescription>
            {contrato
              ? `Contrato ${contrato.numero} — asigna cada detalle del servicio a un miembro de la cartera.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : miembros.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Este contrato no tiene una cartera con miembros asignados.
          </p>
        ) : totalDetalles === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            El contrato no tiene detalles registrados. Agrégalos desde la edición del contrato.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">
                {asignados} de {totalDetalles} detalles asignados
              </Badge>
            </div>
            <ScrollArea className="flex-1 -mx-2 px-2">
              <div className="space-y-4 py-2">
                {projections.map((service, index) => {
                  const detalles = service.detalles || [];
                  return (
                    <div key={service.id || index} className="border border-border rounded-xl overflow-hidden">
                      <div className="bg-muted/40 px-4 py-2.5 flex items-center gap-2">
                        <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", service.color || "bg-primary")} />
                        <span className="text-sm font-medium truncate">
                          {service.descripcion || `Servicio ${index + 1}`}
                        </span>
                        <span className="ml-auto flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {detalles.length} {detalles.length === 1 ? "detalle" : "detalles"}
                          </span>
                          {detalles.length > 0 && (
                            <Select onValueChange={(v) => assignAll(index, v)}>
                              <SelectTrigger className="h-7 w-[150px] text-xs">
                                <SelectValue placeholder="Asignar todos" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={UNASSIGNED}>Sin asignar</SelectItem>
                                {miembros.map((m) => (
                                  <SelectItem key={m.user_id} value={m.user_id}>
                                    {m.profile?.full_name || m.profile?.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </span>
                      </div>
                      {detalles.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-muted-foreground">Sin detalles registrados.</p>
                      ) : (
                        <div className="divide-y divide-border/60">
                          {detalles.map((detalle, i) => (
                            <div key={detalle.id} className="flex items-center gap-3 px-4 py-2">
                              <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                              <span className="text-xs flex-1">{detalle.descripcion}</span>
                              {detalle.asignado_a && (
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-[10px]">
                                    {getInitials(detalle.asignado_nombre)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <Select
                                value={detalle.asignado_a || UNASSIGNED}
                                onValueChange={(v) => assign(index, detalle.id, v)}
                              >
                                <SelectTrigger className="h-8 w-[190px] text-xs">
                                  <SelectValue placeholder="Sin asignar" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={UNASSIGNED}>Sin asignar</SelectItem>
                                  {miembros.map((m) => (
                                    <SelectItem key={m.user_id} value={m.user_id}>
                                      {m.profile?.full_name || m.profile?.email}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || totalDetalles === 0} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar asignaciones
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const AsignarDetallesIcon = UserCheck;
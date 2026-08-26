import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

interface MotivoSuspension {
  id: string;
  nombre: string;
}

interface SuspendContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string | null;
  contractNumero: string;
  mode: "suspender" | "reactivar";
  onSuccess: () => void;
}

export function SuspendContractDialog({
  open,
  onOpenChange,
  contractId,
  contractNumero,
  mode,
  onSuccess,
}: SuspendContractDialogProps) {
  const [motivos, setMotivos] = useState<MotivoSuspension[]>([]);
  const [motivoId, setMotivoId] = useState("");
  const [observacion, setObservacion] = useState("");
  const [fecha, setFecha] = useState("");
  const [loading, setLoading] = useState(false);

  const todayYMD = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!open) return;
    setMotivoId("");
    setObservacion("");
    setFecha(todayYMD());
    if (mode === "suspender") {
      supabase
        .from("motivos_suspension")
        .select("id, nombre")
        .eq("activo", true)
        .order("orden")
        .then(({ data, error }) => {
          if (error) toast.error("Error al cargar motivos: " + error.message);
          else setMotivos(data || []);
        });
    }
  }, [open, mode]);

  const handleSubmit = async () => {
    if (!contractId) return;
    if (mode === "suspender" && !motivoId) {
      toast.error("Debe seleccionar un motivo de suspensión");
      return;
    }
    if (!fecha) {
      toast.error("Debe indicar la fecha");
      return;
    }
    setLoading(true);
    try {
      const { data: current, error: fetchError } = await supabase
        .from("contratos")
        .select("datos_plantilla")
        .eq("id", contractId)
        .maybeSingle();
      if (fetchError) throw fetchError;

      const datos = ((current?.datos_plantilla as Record<string, unknown>) || {}) as Record<string, unknown>;

      if (mode === "suspender") {
        const motivo = motivos.find((m) => m.id === motivoId);
        datos.suspension = {
          motivo_id: motivoId,
          motivo: motivo?.nombre ?? "",
          observacion: observacion.trim() || null,
          fecha,
          periodo: fecha.slice(0, 7),
          registrado_en: new Date().toISOString(),
        };
      } else {
        const previa = datos.suspension as Record<string, unknown> | undefined;
        delete datos.suspension;
        datos.suspension_historial = [
          ...(((datos.suspension_historial as unknown[]) || [])),
          ...(previa
            ? [{ ...previa, fecha_reactivacion: fecha, reactivado_en: new Date().toISOString() }]
            : []),
        ];
      }

      const { error } = await supabase
        .from("contratos")
        .update({
          condicion: mode === "suspender" ? "Suspendido" : "Vigente",
          datos_plantilla: datos as never,
        })
        .eq("id", contractId);
      if (error) throw error;

      if (mode === "suspender") {
        // Marcar las cuotas no pagadas desde la fecha de suspensión
        const { data: afectadas } = await supabase
          .from("pagos")
          .update({ status: "pendiente", notas: `Suspendido desde ${fecha}` })
          .eq("contrato_id", contractId)
          .gte("fecha_vencimiento", fecha)
          .in("status", ["pendiente", "vencido"])
          .select("id");
        toast.success(
          `Contrato suspendido — ${afectadas?.length ?? 0} cuota(s) del cronograma marcadas como suspendidas`
        );
      } else {
        // Reactivar cuotas suspendidas desde la fecha de reactivación
        const { data: pendientes } = await supabase
          .from("pagos")
          .select("id, notas")
          .eq("contrato_id", contractId)
          .in("status", ["pendiente", "vencido"]);
        const ids = (pendientes || [])
          .filter((p) => (p.notas || "").startsWith("Suspendido desde"))
          .map((p) => p.id);
        if (ids.length > 0) {
          await supabase.from("pagos").update({ notas: null }).in("id", ids);
        }
        toast.success(
          `Contrato reactivado — ${ids.length} cuota(s) del cronograma reactivadas`
        );
      }

      onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast.error(
        "Error al procesar: " + (e instanceof Error ? e.message : "desconocido")
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "suspender" ? "Suspender Contrato" : "Reactivar Contrato"}
          </DialogTitle>
          <DialogDescription>
            {mode === "suspender" ? (
              <>
                El contrato <strong>{contractNumero}</strong> pasará a condición
                Suspendido. Dejará de aparecer en alertas de vencimiento y
                supervisión.
              </>
            ) : (
              <>
                El contrato <strong>{contractNumero}</strong> volverá a la
                condición Vigente.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>
              {mode === "suspender" ? "Fecha de suspensión" : "Fecha de reactivación"}
            </Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              {mode === "suspender"
                ? "Las cuotas no pagadas con vencimiento desde esta fecha se marcarán como suspendidas en el cronograma."
                : "Las cuotas suspendidas del cronograma volverán a estar activas."}
            </p>
          </div>

          {mode === "suspender" && (
            <>
              <div className="space-y-2">
                <Label>Motivo de suspensión</Label>
                <Select value={motivoId} onValueChange={setMotivoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un motivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {motivos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Observaciones (opcional)</Label>
                <Textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Detalle del motivo, acuerdos con el cliente, etc."
                  rows={3}
                />
              </div>
            </>
          )}
        </div>


        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant={mode === "suspender" ? "destructive" : "default"}
            onClick={handleSubmit}
            disabled={loading || (mode === "suspender" && !motivoId)}
          >
            {loading
              ? "Procesando..."
              : mode === "suspender"
              ? "Suspender"
              : "Reactivar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

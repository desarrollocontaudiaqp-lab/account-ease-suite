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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMotivoId("");
    setObservacion("");
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
          fecha: new Date().toISOString(),
        };
      } else {
        const previa = datos.suspension as Record<string, unknown> | undefined;
        delete datos.suspension;
        datos.suspension_historial = [
          ...(((datos.suspension_historial as unknown[]) || [])),
          ...(previa ? [{ ...previa, reactivado_en: new Date().toISOString() }] : []),
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
        // Congelar cuotas pendientes futuras (no se tocan las ya pagadas)
        await supabase
          .from("pagos")
          .update({ status: "pendiente", notas: "Contrato suspendido" })
          .eq("contrato_id", contractId)
          .eq("status", "vencido");
      }

      toast.success(
        mode === "suspender" ? "Contrato suspendido" : "Contrato reactivado"
      );
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

        {mode === "suspender" && (
          <div className="space-y-4 py-2">
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
          </div>
        )}

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

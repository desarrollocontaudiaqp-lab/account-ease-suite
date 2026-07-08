import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSedes } from "@/hooks/useSedes";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ContractLite {
  id: string;
  numero: string;
  cliente_nombre: string;
  sede_id: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts: ContractLite[];
  onSuccess: () => void;
}

interface PreviewCounts {
  proformas: number;
  pagos: number;
  workflows: number;
}

export const MigrateContractsDialog = ({ open, onOpenChange, contracts, onSuccess }: Props) => {
  const { sedes } = useSedes();
  const { user } = useAuth();
  const [targetSedeId, setTargetSedeId] = useState<string>("");
  const [notas, setNotas] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<Record<string, PreviewCounts>>({});

  const activeSedes = useMemo(() => sedes.filter((s) => s.activa), [sedes]);
  const sedeNameById = useMemo(() => {
    const m = new Map<string, string>();
    sedes.forEach((s) => m.set(s.id, s.nombre));
    return m;
  }, [sedes]);

  useEffect(() => {
    if (!open) {
      setTargetSedeId("");
      setNotas("");
      setConfirmed(false);
      setPreview({});
      return;
    }
    // Load preview counts
    (async () => {
      setPreviewLoading(true);
      const result: Record<string, PreviewCounts> = {};
      for (const c of contracts) {
        const [{ count: pagosCount }, { count: workflowsCount }, contratoRow] = await Promise.all([
          supabase.from("pagos").select("id", { count: "exact", head: true }).eq("contrato_id", c.id),
          supabase.from("workflows").select("id", { count: "exact", head: true }).eq("contrato_id", c.id),
          supabase.from("contratos").select("proforma_id").eq("id", c.id).maybeSingle(),
        ]);
        const proformasCount = contratoRow.data?.proforma_id ? 1 : 0;
        result[c.id] = {
          proformas: proformasCount,
          pagos: pagosCount || 0,
          workflows: workflowsCount || 0,
        };
      }
      setPreview(result);
      setPreviewLoading(false);
    })();
  }, [open, contracts]);

  const totals = useMemo(() => {
    return Object.values(preview).reduce(
      (acc, p) => ({
        proformas: acc.proformas + p.proformas,
        pagos: acc.pagos + p.pagos,
        workflows: acc.workflows + p.workflows,
      }),
      { proformas: 0, pagos: 0, workflows: 0 }
    );
  }, [preview]);

  const handleMigrate = async () => {
    if (!targetSedeId) {
      toast.error("Selecciona la sede destino");
      return;
    }
    if (!confirmed) {
      toast.error("Debes confirmar la migración");
      return;
    }
    setLoading(true);
    let successCount = 0;
    const failures: string[] = [];

    for (const c of contracts) {
      try {
        // Get proforma_id and current sede
        const { data: contrato, error: fetchErr } = await supabase
          .from("contratos")
          .select("proforma_id, sede_id")
          .eq("id", c.id)
          .maybeSingle();
        if (fetchErr) throw fetchErr;
        const sedeOrigen = (contrato as any)?.sede_id ?? null;
        const proformaId = contrato?.proforma_id ?? null;

        // Update contract
        const { error: e1 } = await supabase
          .from("contratos")
          .update({ sede_id: targetSedeId } as any)
          .eq("id", c.id);
        if (e1) throw e1;

        // Update pagos
        const { error: e2 } = await supabase
          .from("pagos")
          .update({ sede_id: targetSedeId } as any)
          .eq("contrato_id", c.id);
        if (e2) throw e2;

        // Update workflows
        const { error: e3 } = await supabase
          .from("workflows")
          .update({ sede_id: targetSedeId } as any)
          .eq("contrato_id", c.id);
        if (e3) throw e3;

        // Update proforma
        if (proformaId) {
          const { error: e4 } = await supabase
            .from("proformas")
            .update({ sede_id: targetSedeId } as any)
            .eq("id", proformaId);
          if (e4) throw e4;
        }

        // Audit
        const counts = preview[c.id] || { proformas: 0, pagos: 0, workflows: 0 };
        await supabase.from("contrato_migraciones" as any).insert({
          contrato_id: c.id,
          sede_origen_id: sedeOrigen,
          sede_destino_id: targetSedeId,
          migrated_by: user?.id ?? null,
          entidades_afectadas: counts,
          notas: notas || null,
        });

        successCount++;
      } catch (err: any) {
        console.error("Migration error for", c.numero, err);
        failures.push(`${c.numero}: ${err?.message || "error"}`);
      }
    }

    setLoading(false);
    if (failures.length === 0) {
      toast.success(`${successCount} contrato(s) migrado(s) exitosamente`);
    } else {
      toast.error(`Migrados: ${successCount}. Fallos: ${failures.length}. ${failures.slice(0, 2).join(" | ")}`);
    }
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Migrar Contratos a Otra Sede</DialogTitle>
          <DialogDescription>
            Se actualizará la sede del contrato, sus proformas, pagos y workflows asociados. La operación queda registrada para trazabilidad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-2 block">Contratos seleccionados ({contracts.length})</Label>
            <div className="max-h-40 overflow-y-auto rounded-md border border-border divide-y divide-border text-sm">
              {contracts.map((c) => (
                <div key={c.id} className="p-2 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{c.numero}</span>
                    <span className="text-muted-foreground"> — {c.cliente_nombre}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {c.sede_id ? sedeNameById.get(c.sede_id) || "Sede" : "Sin sede"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="target-sede" className="mb-2 block">Sede destino *</Label>
            <Select value={targetSedeId} onValueChange={setTargetSedeId}>
              <SelectTrigger id="target-sede">
                <SelectValue placeholder="Selecciona la sede destino" />
              </SelectTrigger>
              <SelectContent>
                {activeSedes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nombre} ({s.codigo})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3">
            <p className="text-sm font-medium mb-2">Entidades a migrar</p>
            {previewLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Calculando...
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><span className="font-semibold">{totals.proformas}</span> proforma(s)</div>
                <div><span className="font-semibold">{totals.pagos}</span> pago(s)</div>
                <div><span className="font-semibold">{totals.workflows}</span> workflow(s)</div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="notas" className="mb-2 block">Notas (opcional)</Label>
            <Textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Motivo de la migración..." rows={2} />
          </div>

          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Checkbox id="confirm-migrate" checked={confirmed} onCheckedChange={(v) => setConfirmed(!!v)} />
                <Label htmlFor="confirm-migrate" className="text-sm cursor-pointer">
                  Confirmo que deseo migrar los contratos y sus entidades relacionadas
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleMigrate} disabled={loading || !targetSedeId || !confirmed} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Migrar {contracts.length} contrato(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { ContractStatus } from "./ContractActions";

interface EditContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string | null;
  onSuccess: () => void;
}

interface ContractData {
  descripcion: string;
  tipo_servicio: string;
  fecha_inicio: string;
  fecha_fin: string;
  monto_mensual: string;
  monto_total: string;
  moneda: string;
  notas: string;
}

export const EditContractDialog = ({
  open,
  onOpenChange,
  contractId,
  onSuccess,
}: EditContractDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contractData, setContractData] = useState<ContractData>({
    descripcion: "",
    tipo_servicio: "contabilidad",
    fecha_inicio: "",
    fecha_fin: "",
    monto_mensual: "",
    monto_total: "",
    moneda: "PEN",
    notas: "",
  });

  useEffect(() => {
    if (open && contractId) {
      fetchContract();
    }
  }, [open, contractId]);

  const fetchContract = async () => {
    if (!contractId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("contratos")
      .select("*")
      .eq("id", contractId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching contract:", error);
      toast.error("Error al cargar el contrato");
    } else if (data) {
      setContractData({
        descripcion: data.descripcion || "",
        tipo_servicio: data.tipo_servicio || "contabilidad",
        fecha_inicio: data.fecha_inicio || "",
        fecha_fin: data.fecha_fin || "",
        monto_mensual: data.monto_mensual?.toString() || "",
        monto_total: data.monto_total?.toString() || "",
        moneda: data.moneda || "PEN",
        notas: data.notas || "",
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!contractId || !contractData.descripcion || !contractData.fecha_inicio) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("contratos")
      .update({
        descripcion: contractData.descripcion,
        tipo_servicio: contractData.tipo_servicio,
        fecha_inicio: contractData.fecha_inicio,
        fecha_fin: contractData.fecha_fin || null,
        monto_mensual: contractData.monto_mensual ? parseFloat(contractData.monto_mensual) : null,
        monto_total: contractData.monto_total ? parseFloat(contractData.monto_total) : null,
        moneda: contractData.moneda,
        notas: contractData.notas || null,
      })
      .eq("id", contractId);

    if (error) {
      console.error("Error updating contract:", error);
      toast.error("Error al actualizar el contrato");
    } else {
      toast.success("Contrato actualizado");
      onSuccess();
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Contrato</DialogTitle>
          <DialogDescription>
            Modifica los datos del contrato
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Servicio</Label>
                <Select 
                  value={contractData.tipo_servicio} 
                  onValueChange={(value) => setContractData(prev => ({ ...prev, tipo_servicio: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contabilidad">Contabilidad</SelectItem>
                    <SelectItem value="tramites">Trámites</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select 
                  value={contractData.moneda} 
                  onValueChange={(value) => setContractData(prev => ({ ...prev, moneda: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PEN">Soles (S/)</SelectItem>
                    <SelectItem value="USD">Dólares ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción *</Label>
              <Textarea
                value={contractData.descripcion}
                onChange={(e) => setContractData(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Descripción del contrato..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio *</Label>
                <Input
                  type="date"
                  value={contractData.fecha_inicio}
                  onChange={(e) => setContractData(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={contractData.fecha_fin}
                  onChange={(e) => setContractData(prev => ({ ...prev, fecha_fin: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto Mensual</Label>
                <Input
                  type="number"
                  value={contractData.monto_mensual}
                  onChange={(e) => setContractData(prev => ({ ...prev, monto_mensual: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Monto Total</Label>
                <Input
                  type="number"
                  value={contractData.monto_total}
                  onChange={(e) => setContractData(prev => ({ ...prev, monto_total: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={contractData.notas}
                onChange={(e) => setContractData(prev => ({ ...prev, notas: e.target.value }))}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Cambios"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

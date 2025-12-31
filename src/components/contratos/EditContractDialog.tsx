import { useState, useEffect, useMemo } from "react";
import { Loader2, Calendar, CreditCard } from "lucide-react";
import { format, addMonths } from "date-fns";
import { es } from "date-fns/locale";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  numero_cuotas: number;
  dia_vencimiento: number;
}

interface PaymentScheduleItem {
  numero: number;
  fecha_vencimiento: Date;
  monto: number;
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
    numero_cuotas: 1,
    dia_vencimiento: 15,
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
        numero_cuotas: data.numero_cuotas || 1,
        dia_vencimiento: data.dia_vencimiento || 15,
      });
    }
    setLoading(false);
  };

  // Calculate payment schedule based on cuotas
  const paymentSchedule = useMemo((): PaymentScheduleItem[] => {
    if (!contractData.fecha_inicio || !contractData.numero_cuotas) return [];
    
    const startDate = new Date(contractData.fecha_inicio);
    const totalAmount = parseFloat(contractData.monto_total) || 0;
    const numCuotas = contractData.numero_cuotas;
    const cuotaAmount = numCuotas > 0 ? totalAmount / numCuotas : 0;
    
    const schedule: PaymentScheduleItem[] = [];
    
    for (let i = 0; i < numCuotas; i++) {
      const paymentDate = addMonths(startDate, i);
      // Set to the specified day of the month
      paymentDate.setDate(Math.min(contractData.dia_vencimiento, 28));
      
      schedule.push({
        numero: i + 1,
        fecha_vencimiento: paymentDate,
        monto: cuotaAmount,
      });
    }
    
    return schedule;
  }, [contractData.fecha_inicio, contractData.monto_total, contractData.numero_cuotas, contractData.dia_vencimiento]);

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
        numero_cuotas: contractData.numero_cuotas,
        dia_vencimiento: contractData.dia_vencimiento,
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

  const formatCurrency = (amount: number) => {
    return `${contractData.moneda === "PEN" ? "S/" : "$"} ${amount.toFixed(2)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Detalles del Contrato</DialogTitle>
          <DialogDescription>
            Modifica los datos del contrato y configura el calendario de pagos
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Contract Details */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Datos del Contrato</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Payment Schedule */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Calendario de Pagos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Número de Cuotas</Label>
                        <Input
                          type="number"
                          min={1}
                          max={60}
                          value={contractData.numero_cuotas}
                          onChange={(e) => setContractData(prev => ({ 
                            ...prev, 
                            numero_cuotas: Math.max(1, parseInt(e.target.value) || 1)
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Día de Vencimiento</Label>
                        <Input
                          type="number"
                          min={1}
                          max={28}
                          value={contractData.dia_vencimiento}
                          onChange={(e) => setContractData(prev => ({ 
                            ...prev, 
                            dia_vencimiento: Math.min(28, Math.max(1, parseInt(e.target.value) || 15))
                          }))}
                        />
                      </div>
                    </div>

                    {paymentSchedule.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Vista previa del cronograma</span>
                            <Badge variant="outline" className="gap-1">
                              <CreditCard className="h-3 w-3" />
                              {paymentSchedule.length} cuotas
                            </Badge>
                          </div>
                          
                          <div className="border rounded-md max-h-[300px] overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-16">#</TableHead>
                                  <TableHead>Vencimiento</TableHead>
                                  <TableHead className="text-right">Monto</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {paymentSchedule.map((payment) => (
                                  <TableRow key={payment.numero}>
                                    <TableCell className="font-medium">
                                      {payment.numero}
                                    </TableCell>
                                    <TableCell>
                                      {format(payment.fecha_vencimiento, "dd MMM yyyy", { locale: es })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(payment.monto)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-sm font-medium">Total</span>
                            <span className="font-bold">
                              {formatCurrency(paymentSchedule.reduce((sum, p) => sum + p.monto, 0))}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="mt-4">
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

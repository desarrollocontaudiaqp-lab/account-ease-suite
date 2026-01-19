import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  FileText,
  Calculator,
  CreditCard,
  Building2,
  Loader2,
  Receipt,
  Percent,
  DollarSign,
  Calendar,
  Hash,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UnifiedPayment {
  id: string;
  contrato_id: string;
  monto: number;
  fecha_vencimiento: string;
  fecha_pago: string | null;
  status: "pendiente" | "pagado" | "vencido" | "parcial" | "proyectado";
  metodo_pago: string | null;
  referencia: string | null;
  notas: string | null;
  servicio: string | null;
  cuota: number | null;
  isProjected: boolean;
  contrato: {
    numero: string;
    moneda: string;
    status: string;
    cliente: {
      razon_social: string;
      codigo: string;
    };
  };
}

interface RegisterPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: UnifiedPayment | null;
  onSuccess: () => void;
}

interface PaymentForm {
  // Estado y fechas
  status: string;
  fecha_pago: string;
  
  // Datos del comprobante
  tipo_comprobante: string;
  serie_comprobante: string;
  numero_comprobante: string;
  fecha_emision: string;
  
  // Montos e impuestos
  subtotal: number;
  tipo_igv: string;
  igv: number;
  monto: number;
  
  // Detracciones y retenciones
  detraccion_porcentaje: number;
  detraccion_monto: number;
  retencion_porcentaje: number;
  retencion_monto: number;
  monto_neto: number;
  
  // Datos de pago
  metodo_pago: string;
  banco: string;
  cuenta_bancaria: string;
  referencia: string;
  
  // Observaciones
  notas: string;
  observaciones_contables: string;
}

const tiposComprobante = [
  { value: "factura", label: "Factura" },
  { value: "boleta", label: "Boleta de Venta" },
  { value: "recibo", label: "Recibo por Honorarios" },
  { value: "nota_credito", label: "Nota de Crédito" },
  { value: "nota_debito", label: "Nota de Débito" },
];

const tiposIGV = [
  { value: "gravado", label: "Gravado (18%)" },
  { value: "exonerado", label: "Exonerado" },
  { value: "inafecto", label: "Inafecto" },
];

const metodosPago = [
  { value: "transferencia", label: "Transferencia Bancaria" },
  { value: "deposito", label: "Depósito Bancario" },
  { value: "efectivo", label: "Efectivo" },
  { value: "cheque", label: "Cheque" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "yape", label: "Yape" },
  { value: "plin", label: "Plin" },
];

const bancos = [
  { value: "bcp", label: "BCP" },
  { value: "bbva", label: "BBVA" },
  { value: "interbank", label: "Interbank" },
  { value: "scotiabank", label: "Scotiabank" },
  { value: "banbif", label: "BanBif" },
  { value: "pichincha", label: "Banco Pichincha" },
  { value: "nacion", label: "Banco de la Nación" },
  { value: "otro", label: "Otro" },
];

export function RegisterPaymentDialog({
  open,
  onOpenChange,
  payment,
  onSuccess,
}: RegisterPaymentDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PaymentForm>({
    status: "pagado",
    fecha_pago: format(new Date(), "yyyy-MM-dd"),
    tipo_comprobante: "factura",
    serie_comprobante: "",
    numero_comprobante: "",
    fecha_emision: format(new Date(), "yyyy-MM-dd"),
    subtotal: 0,
    tipo_igv: "gravado",
    igv: 0,
    monto: 0,
    detraccion_porcentaje: 0,
    detraccion_monto: 0,
    retencion_porcentaje: 0,
    retencion_monto: 0,
    monto_neto: 0,
    metodo_pago: "transferencia",
    banco: "",
    cuenta_bancaria: "",
    referencia: "",
    notas: "",
    observaciones_contables: "",
  });

  useEffect(() => {
    if (payment && open) {
      const subtotal = payment.monto / 1.18;
      const igv = payment.monto - subtotal;
      
      setForm({
        status: "pagado",
        fecha_pago: format(new Date(), "yyyy-MM-dd"),
        tipo_comprobante: "factura",
        serie_comprobante: "",
        numero_comprobante: "",
        fecha_emision: format(new Date(), "yyyy-MM-dd"),
        subtotal: parseFloat(subtotal.toFixed(2)),
        tipo_igv: "gravado",
        igv: parseFloat(igv.toFixed(2)),
        monto: payment.monto,
        detraccion_porcentaje: 0,
        detraccion_monto: 0,
        retencion_porcentaje: 0,
        retencion_monto: 0,
        monto_neto: payment.monto,
        metodo_pago: payment.metodo_pago || "transferencia",
        banco: "",
        cuenta_bancaria: "",
        referencia: payment.referencia || "",
        notas: payment.notas || "",
        observaciones_contables: "",
      });
    }
  }, [payment, open]);

  // Calcular IGV automáticamente
  const calculateIGV = (subtotal: number, tipoIgv: string) => {
    if (tipoIgv === "gravado") {
      return parseFloat((subtotal * 0.18).toFixed(2));
    }
    return 0;
  };

  // Calcular monto neto
  const calculateMontoNeto = () => {
    const montoTotal = form.monto;
    const detraccion = form.detraccion_monto;
    const retencion = form.retencion_monto;
    return parseFloat((montoTotal - detraccion - retencion).toFixed(2));
  };

  // Actualizar subtotal y recalcular
  const handleSubtotalChange = (value: string) => {
    const subtotal = parseFloat(value) || 0;
    const igv = calculateIGV(subtotal, form.tipo_igv);
    const monto = subtotal + igv;
    
    setForm(prev => ({
      ...prev,
      subtotal,
      igv,
      monto,
      monto_neto: monto - prev.detraccion_monto - prev.retencion_monto,
    }));
  };

  // Actualizar tipo IGV y recalcular
  const handleTipoIGVChange = (tipoIgv: string) => {
    const igv = calculateIGV(form.subtotal, tipoIgv);
    const monto = form.subtotal + igv;
    
    setForm(prev => ({
      ...prev,
      tipo_igv: tipoIgv,
      igv,
      monto,
      monto_neto: monto - prev.detraccion_monto - prev.retencion_monto,
    }));
  };

  // Actualizar porcentaje de detracción
  const handleDetraccionPorcentajeChange = (value: string) => {
    const porcentaje = parseFloat(value) || 0;
    const detraccionMonto = parseFloat((form.monto * porcentaje / 100).toFixed(2));
    
    setForm(prev => ({
      ...prev,
      detraccion_porcentaje: porcentaje,
      detraccion_monto: detraccionMonto,
      monto_neto: form.monto - detraccionMonto - prev.retencion_monto,
    }));
  };

  // Actualizar porcentaje de retención
  const handleRetencionPorcentajeChange = (value: string) => {
    const porcentaje = parseFloat(value) || 0;
    const retencionMonto = parseFloat((form.monto * porcentaje / 100).toFixed(2));
    
    setForm(prev => ({
      ...prev,
      retencion_porcentaje: porcentaje,
      retencion_monto: retencionMonto,
      monto_neto: form.monto - prev.detraccion_monto - retencionMonto,
    }));
  };

  const handleSave = async () => {
    if (!payment) return;

    // Validaciones
    if (!form.serie_comprobante.trim() || !form.numero_comprobante.trim()) {
      toast.error("Ingrese la serie y número del comprobante");
      return;
    }

    setSaving(true);

    const updateData: {
      status: "pagado" | "parcial" | "pendiente" | "vencido";
      fecha_pago: string;
      tipo_comprobante: string;
      serie_comprobante: string;
      numero_comprobante: string;
      fecha_emision: string;
      subtotal: number;
      tipo_igv: string;
      igv: number;
      monto: number;
      detraccion_porcentaje: number;
      detraccion_monto: number;
      retencion_porcentaje: number;
      retencion_monto: number;
      monto_neto: number;
      metodo_pago: string;
      banco: string | null;
      cuenta_bancaria: string | null;
      referencia: string | null;
      notas: string | null;
      observaciones_contables: string | null;
    } = {
      status: form.status as "pagado" | "parcial" | "pendiente" | "vencido",
      fecha_pago: form.fecha_pago,
      tipo_comprobante: form.tipo_comprobante,
      serie_comprobante: form.serie_comprobante.toUpperCase(),
      numero_comprobante: form.numero_comprobante,
      fecha_emision: form.fecha_emision,
      subtotal: form.subtotal,
      tipo_igv: form.tipo_igv,
      igv: form.igv,
      monto: form.monto,
      detraccion_porcentaje: form.detraccion_porcentaje,
      detraccion_monto: form.detraccion_monto,
      retencion_porcentaje: form.retencion_porcentaje,
      retencion_monto: form.retencion_monto,
      monto_neto: form.monto_neto,
      metodo_pago: form.metodo_pago,
      banco: form.banco || null,
      cuenta_bancaria: form.cuenta_bancaria || null,
      referencia: form.referencia || null,
      notas: form.notas || null,
      observaciones_contables: form.observaciones_contables || null,
    };

    const { error } = await supabase
      .from("pagos")
      .update(updateData)
      .eq("id", payment.id);

    if (error) {
      console.error("Error updating payment:", error);
      toast.error("Error al registrar el pago");
    } else {
      toast.success("Pago registrado correctamente");
      onOpenChange(false);
      onSuccess();
    }

    setSaving(false);
  };

  const formatCurrency = (amount: number, currency: string = "PEN") => {
    return `${currency === "PEN" ? "S/" : "$"} ${amount.toFixed(2)}`;
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Registrar Pago
          </DialogTitle>
          <DialogDescription>
            Complete los datos del comprobante y pago para generar el registro de ventas
          </DialogDescription>
        </DialogHeader>

        {/* Información del contexto */}
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Contrato</p>
                <p className="font-medium">{payment.contrato.numero}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cliente</p>
                <p className="font-medium">{payment.contrato.cliente.razon_social}</p>
              </div>
              <div>
                <p className="text-muted-foreground">RUC</p>
                <p className="font-medium">{payment.contrato.cliente.codigo}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Vencimiento</p>
                <p className="font-medium">
                  {format(new Date(payment.fecha_vencimiento), "dd MMM yyyy", { locale: es })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="comprobante" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="comprobante" className="gap-2">
              <FileText className="h-4 w-4" />
              Comprobante
            </TabsTrigger>
            <TabsTrigger value="montos" className="gap-2">
              <Calculator className="h-4 w-4" />
              Montos
            </TabsTrigger>
            <TabsTrigger value="pago" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Pago
            </TabsTrigger>
          </TabsList>

          {/* Tab Comprobante */}
          <TabsContent value="comprobante" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Comprobante</Label>
                <Select
                  value={form.tipo_comprobante}
                  onValueChange={(value) => setForm(prev => ({ ...prev, tipo_comprobante: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposComprobante.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha de Emisión</Label>
                <Input
                  type="date"
                  value={form.fecha_emision}
                  onChange={(e) => setForm(prev => ({ ...prev, fecha_emision: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Serie
                </Label>
                <Input
                  value={form.serie_comprobante}
                  onChange={(e) => setForm(prev => ({ ...prev, serie_comprobante: e.target.value.toUpperCase() }))}
                  placeholder="Ej: F001"
                  className="uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Número
                </Label>
                <Input
                  value={form.numero_comprobante}
                  onChange={(e) => setForm(prev => ({ ...prev, numero_comprobante: e.target.value }))}
                  placeholder="Ej: 00000123"
                />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-700">
                Asegúrese de ingresar correctamente la serie y número del comprobante para el registro de ventas.
              </p>
            </div>
          </TabsContent>

          {/* Tab Montos */}
          <TabsContent value="montos" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Montos Base
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Subtotal (Base Imponible)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.subtotal}
                      onChange={(e) => handleSubtotalChange(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo IGV</Label>
                    <Select
                      value={form.tipo_igv}
                      onValueChange={handleTipoIGVChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposIGV.map(tipo => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>IGV</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.igv}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-md">
                  <span className="font-medium">Total Comprobante</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(form.monto, payment.contrato.moneda)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Detracciones y Retenciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-muted-foreground">Detracción</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Porcentaje %</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={form.detraccion_porcentaje}
                          onChange={(e) => handleDetraccionPorcentajeChange(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Monto</Label>
                        <Input
                          type="number"
                          value={form.detraccion_monto}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-muted-foreground">Retención</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Porcentaje %</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={form.retencion_porcentaje}
                          onChange={(e) => handleRetencionPorcentajeChange(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Monto</Label>
                        <Input
                          type="number"
                          value={form.retencion_monto}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                  <span className="font-medium text-green-700">Monto Neto a Recibir</span>
                  <span className="text-xl font-bold text-green-700">
                    {formatCurrency(form.monto_neto, payment.contrato.moneda)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Pago */}
          <TabsContent value="pago" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado del Pago</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pagado">Pagado</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha de Pago
                </Label>
                <Input
                  type="date"
                  value={form.fecha_pago}
                  onChange={(e) => setForm(prev => ({ ...prev, fecha_pago: e.target.value }))}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select
                  value={form.metodo_pago}
                  onValueChange={(value) => setForm(prev => ({ ...prev, metodo_pago: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {metodosPago.map(metodo => (
                      <SelectItem key={metodo.value} value={metodo.value}>
                        {metodo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Banco
                </Label>
                <Select
                  value={form.banco}
                  onValueChange={(value) => setForm(prev => ({ ...prev, banco: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {bancos.map(banco => (
                      <SelectItem key={banco.value} value={banco.value}>
                        {banco.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cuenta Bancaria</Label>
                <Input
                  value={form.cuenta_bancaria}
                  onChange={(e) => setForm(prev => ({ ...prev, cuenta_bancaria: e.target.value }))}
                  placeholder="Número de cuenta"
                />
              </div>

              <div className="space-y-2">
                <Label>Referencia / Nro. Operación</Label>
                <Input
                  value={form.referencia}
                  onChange={(e) => setForm(prev => ({ ...prev, referencia: e.target.value }))}
                  placeholder="Número de operación, voucher, etc."
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={form.notas}
                onChange={(e) => setForm(prev => ({ ...prev, notas: e.target.value }))}
                placeholder="Notas adicionales del pago..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Observaciones Contables</Label>
              <Textarea
                value={form.observaciones_contables}
                onChange={(e) => setForm(prev => ({ ...prev, observaciones_contables: e.target.value }))}
                placeholder="Observaciones para el área contable..."
                rows={2}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Receipt className="h-4 w-4" />
                Registrar Pago
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

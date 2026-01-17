import { useState, useEffect, useMemo } from "react";
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { 
  FileCheck, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  List, 
  Grid3X3, 
  CalendarDays, 
  CalendarRange,
  Building2,
  Receipt,
  CreditCard,
  Loader2,
  FileText,
  Eye,
  Clock,
  DollarSign
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { ContractStatus } from "./ContractActions";

interface ContractDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string | null;
}

interface ServiceProjection {
  id: string;
  descripcion: string;
  color: string;
  fechaInicio: Date | undefined;
  fechaTermino: Date | undefined;
  fechaPago: number;
  cicloPago: string;
  nroCuotas: number;
  pago: number;
  total: number;
  dividirEnCuotas: boolean;
}

interface PaymentScheduleItem {
  cuota: number;
  fecha: Date;
  servicio: string;
  servicioId: string;
  color: string;
  monto: number;
}

interface ContractDetail {
  id: string;
  numero: string;
  descripcion: string;
  tipo_servicio: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  monto_mensual: number | null;
  monto_total: number | null;
  moneda: string;
  status: ContractStatus;
  notas: string | null;
  numero_cuotas: number | null;
  dia_vencimiento: number | null;
  created_at: string;
  datos_plantilla: any;
  cliente: {
    razon_social: string;
    codigo: string;
    direccion: string | null;
    email: string | null;
    telefono: string | null;
  } | null;
  proforma: {
    numero: string;
    total: number;
    subtotal: number;
    igv: number;
    moneda: string;
    tipo: string;
    items: { descripcion: string; cantidad: number; precio_unitario: number; subtotal: number }[];
  } | null;
}

const statusStyles: Record<ContractStatus, string> = {
  borrador: "bg-slate-100 text-slate-800 border-slate-200",
  en_gestion: "bg-blue-100 text-blue-800 border-blue-200",
  aprobado: "bg-green-100 text-green-800 border-green-200",
  anulado: "bg-red-100 text-red-800 border-red-200",
  activo: "bg-green-100 text-green-800 border-green-200",
  pausado: "bg-yellow-100 text-yellow-800 border-yellow-200",
  finalizado: "bg-blue-100 text-blue-800 border-blue-200",
  cancelado: "bg-gray-100 text-gray-800 border-gray-200",
};

const statusLabels: Record<ContractStatus, string> = {
  borrador: "Borrador",
  en_gestion: "En Gestión",
  aprobado: "Aprobado",
  anulado: "Anulado",
  activo: "Vigente",
  pausado: "Pausado",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const SERVICE_TYPES: Record<string, string> = {
  contabilidad: "Contabilidad",
  tramites: "Trámites",
  auditoria: "Auditoría",
};

type CalendarViewType = "month" | "quarter" | "year" | "summary";

export const ContractDetailModal = ({
  open,
  onOpenChange,
  contractId,
}: ContractDetailModalProps) => {
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"detalle" | "servicios" | "calendario">("detalle");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarViewType>("month");

  useEffect(() => {
    if (open && contractId) {
      fetchContractDetail();
      setActiveTab("detalle");
    }
  }, [open, contractId]);

  const fetchContractDetail = async () => {
    if (!contractId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("contratos")
      .select(`
        *,
        cliente:clientes(razon_social, codigo, direccion, email, telefono),
        proforma:proformas(numero, total, subtotal, igv, moneda, tipo, items:proforma_items(descripcion, cantidad, precio_unitario, subtotal))
      `)
      .eq("id", contractId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching contract:", error);
    } else if (data) {
      setContract({
        ...data,
        status: data.status as ContractStatus,
        cliente: data.cliente as ContractDetail["cliente"],
        proforma: data.proforma as ContractDetail["proforma"],
      });
      
      // Set current month to contract start date if available
      if (data.fecha_inicio) {
        setCurrentMonth(new Date(data.fecha_inicio));
      }
    }
    setLoading(false);
  };

  // Parse projections from datos_plantilla
  const projections: ServiceProjection[] = useMemo(() => {
    if (!contract?.datos_plantilla?.projections) return [];
    
    return contract.datos_plantilla.projections.map((p: any) => ({
      ...p,
      fechaInicio: p.fechaInicio ? new Date(p.fechaInicio) : undefined,
      fechaTermino: p.fechaTermino ? new Date(p.fechaTermino) : undefined,
    }));
  }, [contract]);

  // Parse payment schedule from datos_plantilla
  const paymentSchedule: PaymentScheduleItem[] = useMemo(() => {
    if (!contract?.datos_plantilla?.payment_schedule) return [];
    
    return contract.datos_plantilla.payment_schedule.map((s: any) => ({
      ...s,
      fecha: new Date(s.fecha),
    }));
  }, [contract]);

  // Group payments by date for calendar
  const paymentsByDate = useMemo(() => {
    const grouped: { [key: string]: PaymentScheduleItem[] } = {};
    paymentSchedule.forEach((item) => {
      const key = format(item.fecha, "yyyy-MM-dd");
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return grouped;
  }, [paymentSchedule]);

  const getMonthsToDisplay = () => {
    switch (calendarView) {
      case "quarter":
        return [currentMonth, addMonths(currentMonth, 1), addMonths(currentMonth, 2)];
      case "year":
        return Array.from({ length: 12 }, (_, i) => addMonths(startOfMonth(new Date(currentMonth.getFullYear(), 0, 1)), i));
      default:
        return [currentMonth];
    }
  };

  const currencySymbol = contract?.moneda === "PEN" ? "S/" : "$";
  const totalGeneral = projections.reduce((sum, p) => sum + (p.total || 0), 0);
  const hasProjections = projections.length > 0;

  const renderMonthCalendar = (month: Date, compact: boolean = false) => {
    const days = eachDayOfInterval({
      start: startOfMonth(month),
      end: endOfMonth(month),
    });

    return (
      <div className={cn("border border-border rounded-lg overflow-hidden bg-card", compact ? "text-[10px]" : "")}>
        <div className="bg-primary/5 p-2 text-center font-semibold capitalize border-b border-border">
          {format(month, "MMMM yyyy", { locale: es })}
        </div>
        <div className="p-1">
          <div className={cn("grid grid-cols-7 gap-0.5 text-center font-medium text-muted-foreground mb-1", compact ? "text-[9px]" : "text-xs")}>
            <div>D</div>
            <div>L</div>
            <div>M</div>
            <div>M</div>
            <div>J</div>
            <div>V</div>
            <div>S</div>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: days[0]?.getDay() || 0 }).map((_, i) => (
              <div key={`empty-${i}`} className={cn(compact ? "h-6" : "min-h-[50px]")} />
            ))}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const payments = paymentsByDate[key];
              const isToday = key === format(new Date(), "yyyy-MM-dd");

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border border-border/50 rounded p-0.5",
                    compact ? "h-6" : "min-h-[50px]",
                    isToday && "bg-primary/10 border-primary",
                    !isSameMonth(day, month) && "opacity-50"
                  )}
                >
                  <div className={cn("font-medium", isToday && "text-primary", compact ? "text-[9px]" : "text-xs")}>
                    {format(day, "d")}
                  </div>
                  {payments && !compact && (
                    <div className="space-y-0.5 mt-0.5">
                      {payments.slice(0, 2).map((p, idx) => (
                        <div
                          key={`${p.servicioId}-${idx}`}
                          className={cn("text-white px-0.5 rounded text-[8px] truncate", p.color)}
                          title={`${p.servicio} - Cuota ${p.cuota}: ${currencySymbol} ${p.monto.toFixed(2)}`}
                        >
                          C{p.cuota}: {currencySymbol}{p.monto.toFixed(0)}
                        </div>
                      ))}
                      {payments.length > 2 && (
                        <div className="text-[8px] text-muted-foreground">+{payments.length - 2} más</div>
                      )}
                    </div>
                  )}
                  {payments && compact && (
                    <div className="flex gap-0.5 flex-wrap">
                      {payments.map((p, idx) => (
                        <div
                          key={`${p.servicioId}-${idx}`}
                          className={cn("w-1.5 h-1.5 rounded-full", p.color)}
                          title={`${p.servicio} - Cuota ${p.cuota}: ${currencySymbol} ${p.monto.toFixed(2)}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderSummaryTable = () => (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="overflow-auto max-h-[300px]">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead className="w-[60px]">Cuota</TableHead>
              <TableHead className="w-[110px]">Fecha Pago</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead className="w-[100px] text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentSchedule.map((item, idx) => (
              <TableRow key={`${item.servicioId}-${item.cuota}-${idx}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", item.color)} />
                    {item.cuota}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{format(item.fecha, "dd/MM/yyyy")}</TableCell>
                <TableCell className="max-w-[200px] truncate text-sm" title={item.servicio}>
                  {item.servicio}
                </TableCell>
                <TableCell className="text-right font-medium">{currencySymbol} {item.monto.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="border-t border-border bg-muted/30 p-3 flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          Total de cuotas: {paymentSchedule.length}
        </span>
        <span className="font-bold text-primary">
          Total: {currencySymbol} {paymentSchedule.reduce((sum, p) => sum + p.monto, 0).toFixed(2)}
        </span>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Detalle del Contrato
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Contrato <span className="font-semibold text-foreground">{contract?.numero}</span>
                  {contract?.cliente && (
                    <> • Cliente: <span className="font-semibold text-foreground">{contract.cliente.razon_social}</span></>
                  )}
                </DialogDescription>
              </div>
            </div>
            {contract && (
              <Badge variant="outline" className={cn("text-sm px-3 py-1", statusStyles[contract.status])}>
                {statusLabels[contract.status]}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : contract ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-fit mb-4">
                <TabsTrigger value="detalle" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Información General
                </TabsTrigger>
                <TabsTrigger value="servicios" className="gap-2" disabled={!hasProjections}>
                  <Receipt className="h-4 w-4" />
                  Servicios
                </TabsTrigger>
                <TabsTrigger value="calendario" className="gap-2" disabled={!hasProjections}>
                  <CalendarIcon className="h-4 w-4" />
                  Calendario de Pagos
                </TabsTrigger>
              </TabsList>

              {/* Tab: Información General */}
              <TabsContent value="detalle" className="flex-1 overflow-auto mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-4">
                  {/* Column 1: Client Info */}
                  {contract.cliente && (
                    <div className="bg-muted/30 rounded-xl p-4 border border-border">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Cliente
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Razón Social</p>
                          <p className="font-medium">{contract.cliente.razon_social}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">RUC</p>
                          <p className="font-mono font-medium">{contract.cliente.codigo}</p>
                        </div>
                        {contract.cliente.direccion && (
                          <div>
                            <p className="text-sm text-muted-foreground">Dirección</p>
                            <p className="font-medium text-sm">{contract.cliente.direccion}</p>
                          </div>
                        )}
                        {contract.cliente.email && (
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium text-sm">{contract.cliente.email}</p>
                          </div>
                        )}
                        {contract.cliente.telefono && (
                          <div>
                            <p className="text-sm text-muted-foreground">Teléfono</p>
                            <p className="font-medium">{contract.cliente.telefono}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Column 2: Contract Info */}
                  <div className="bg-muted/30 rounded-xl p-4 border border-border">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Datos del Contrato
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Tipo de Servicio</p>
                        <Badge variant="outline" className="bg-primary/10 text-primary mt-1">
                          {SERVICE_TYPES[contract.tipo_servicio] || contract.tipo_servicio}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Descripción</p>
                        <p className="font-medium text-sm">{contract.descripcion}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Fecha Inicio</p>
                          <p className="font-medium">{format(new Date(contract.fecha_inicio), "dd/MM/yyyy")}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Fecha Fin</p>
                          <p className="font-medium">{contract.fecha_fin ? format(new Date(contract.fecha_fin), "dd/MM/yyyy") : "Sin definir"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Día de Pago</p>
                          <p className="font-medium">{contract.dia_vencimiento || 15}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">N° Cuotas</p>
                          <p className="font-medium">{contract.numero_cuotas || "-"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Financial Info */}
                  <div className="space-y-4">
                    <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                      <h3 className="font-semibold text-sm text-primary uppercase tracking-wide mb-3 flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Información Financiera
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Moneda:</span>
                          <Badge variant="secondary">{contract.moneda === "PEN" ? "Soles (S/)" : "Dólares ($)"}</Badge>
                        </div>
                        {contract.monto_mensual && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Monto Mensual:</span>
                            <span className="font-medium">{currencySymbol} {Number(contract.monto_mensual).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-primary/20">
                          <span className="font-medium">Monto Total:</span>
                          <span className="font-bold text-lg text-primary">
                            {currencySymbol} {(Number(contract.monto_total) || totalGeneral).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Proforma Origin */}
                    {contract.proforma && (
                      <div className="bg-muted/30 rounded-xl p-4 border border-border">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                          <Receipt className="h-4 w-4" />
                          Proforma Origen
                        </h3>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{contract.proforma.numero}</Badge>
                          <span className="font-medium">
                            {contract.proforma.moneda === "PEN" ? "S/" : "$"} {Number(contract.proforma.total).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {contract.notas && (
                      <div className="bg-muted/30 rounded-xl p-4 border border-border">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">Notas</h3>
                        <p className="text-sm">{contract.notas}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metadata */}
                <div className="text-xs text-muted-foreground flex items-center gap-1 pt-2 border-t border-border">
                  <Clock className="h-3 w-3" />
                  Creado: {format(new Date(contract.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                </div>
              </TabsContent>

              {/* Tab: Servicios */}
              <TabsContent value="servicios" className="flex-1 overflow-auto mt-0">
                {hasProjections ? (
                  <div className="space-y-4">
                    <div className="border border-border rounded-xl overflow-hidden bg-card">
                      <div className="bg-muted/30 px-4 py-3 border-b border-border">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-primary" />
                          Servicios Contratados
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Servicio</TableHead>
                              <TableHead className="w-[110px]">Fecha Inicio</TableHead>
                              <TableHead className="w-[110px]">Fecha Fin</TableHead>
                              <TableHead className="w-[80px] text-center">Día Pago</TableHead>
                              <TableHead className="w-[90px]">Ciclo</TableHead>
                              <TableHead className="w-[80px] text-center">Cuotas</TableHead>
                              <TableHead className="w-[100px] text-right">Monto</TableHead>
                              <TableHead className="w-[100px] text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {projections.map((proj) => (
                              <TableRow key={proj.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className={cn("w-3 h-3 rounded-full flex-shrink-0", proj.color)} />
                                    <span className="font-medium">{proj.descripcion}</span>
                                  </div>
                                </TableCell>
                                <TableCell>{proj.fechaInicio ? format(proj.fechaInicio, "dd/MM/yyyy") : "-"}</TableCell>
                                <TableCell>{proj.fechaTermino ? format(proj.fechaTermino, "dd/MM/yyyy") : "-"}</TableCell>
                                <TableCell className="text-center">{proj.fechaPago}</TableCell>
                                <TableCell className="capitalize">{proj.cicloPago}</TableCell>
                                <TableCell className="text-center">{proj.nroCuotas}</TableCell>
                                <TableCell className="text-right">{currencySymbol} {(proj.pago || 0).toFixed(2)}</TableCell>
                                <TableCell className="text-right font-semibold text-primary">{currencySymbol} {(proj.total || 0).toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                          <tfoot className="bg-muted/50 border-t-2 border-border">
                            <tr>
                              <td colSpan={7} className="p-3 text-right font-semibold">Total General:</td>
                              <td className="p-3 text-right font-bold text-lg text-primary">{currencySymbol} {totalGeneral.toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        </Table>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="bg-muted/20 rounded-lg p-3 border border-border">
                      <h4 className="text-sm font-medium mb-2">Leyenda de Servicios</h4>
                      <div className="flex flex-wrap gap-4">
                        {projections.map((proj) => (
                          <div key={proj.id} className="flex items-center gap-2 text-sm">
                            <div className={cn("w-4 h-4 rounded-full", proj.color)} />
                            <span>{proj.descripcion}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No hay información de servicios disponible</p>
                    <p className="text-sm text-muted-foreground">Edita el contrato para agregar servicios</p>
                  </div>
                )}
              </TabsContent>

              {/* Tab: Calendario */}
              <TabsContent value="calendario" className="flex-1 overflow-hidden mt-0 flex flex-col">
                {hasProjections ? (
                  <div className="border border-border rounded-xl flex-1 overflow-hidden flex flex-col bg-card">
                    <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
                      <div className="flex items-center gap-2">
                        {calendarView !== "summary" && calendarView !== "year" && (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setCurrentMonth(addMonths(currentMonth, calendarView === "quarter" ? -3 : -1))}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="font-semibold capitalize min-w-[140px] text-center text-sm">
                              {format(currentMonth, "MMMM yyyy", { locale: es })}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setCurrentMonth(addMonths(currentMonth, calendarView === "quarter" ? 3 : 1))}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                      
                      <Tabs value={calendarView} onValueChange={(v) => setCalendarView(v as CalendarViewType)}>
                        <TabsList className="h-8">
                          <TabsTrigger value="month" className="gap-1 text-xs h-7 px-2">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Mes
                          </TabsTrigger>
                          <TabsTrigger value="quarter" className="gap-1 text-xs h-7 px-2">
                            <Grid3X3 className="h-3.5 w-3.5" />
                            3 Meses
                          </TabsTrigger>
                          <TabsTrigger value="year" className="gap-1 text-xs h-7 px-2">
                            <CalendarRange className="h-3.5 w-3.5" />
                            Anual
                          </TabsTrigger>
                          <TabsTrigger value="summary" className="gap-1 text-xs h-7 px-2">
                            <List className="h-3.5 w-3.5" />
                            Resumen
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    <div className="flex-1 overflow-auto p-3">
                      {calendarView === "summary" ? (
                        renderSummaryTable()
                      ) : calendarView === "year" ? (
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                          {getMonthsToDisplay().map((month, idx) => (
                            <div key={idx}>{renderMonthCalendar(month, true)}</div>
                          ))}
                        </div>
                      ) : calendarView === "quarter" ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {getMonthsToDisplay().map((month, idx) => (
                            <div key={idx}>{renderMonthCalendar(month, false)}</div>
                          ))}
                        </div>
                      ) : (
                        renderMonthCalendar(currentMonth, false)
                      )}
                    </div>

                    {/* Legend */}
                    {calendarView !== "summary" && (
                      <div className="border-t border-border p-3 bg-muted/20">
                        <div className="flex flex-wrap gap-3">
                          {projections.map((proj) => (
                            <div key={proj.id} className="flex items-center gap-1.5 text-xs">
                              <div className={cn("w-3 h-3 rounded-full", proj.color)} />
                              <span className="truncate max-w-[120px]">{proj.descripcion}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No hay calendario de pagos disponible</p>
                    <p className="text-sm text-muted-foreground">Edita el contrato para configurar el calendario</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            No se encontró el contrato
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X, CheckCircle, Clock, AlertTriangle, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

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
  glosa: string | null;
  isProjected: boolean;
  contrato: {
    numero: string;
    moneda: string;
    status: string;
    descripcion: string;
    cliente: {
      razon_social: string;
      codigo: string;
    };
  };
}

interface ContractCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractPayments: UnifiedPayment[];
  formatCurrency: (amount: number, currency: string) => string;
}

const statusConfig: Record<string, { label: string; bgColor: string; textColor: string; icon: typeof CheckCircle }> = {
  pendiente: { label: "Pendiente", bgColor: "bg-amber-500", textColor: "text-amber-800", icon: Clock },
  pagado: { label: "Pagado", bgColor: "bg-green-500", textColor: "text-green-800", icon: CheckCircle },
  vencido: { label: "Vencido", bgColor: "bg-red-500", textColor: "text-red-800", icon: AlertTriangle },
  parcial: { label: "Parcial", bgColor: "bg-blue-500", textColor: "text-blue-800", icon: Clock },
  proyectado: { label: "Proyectado", bgColor: "bg-purple-500", textColor: "text-purple-800", icon: FileText },
};

export function ContractCalendarModal({
  open,
  onOpenChange,
  contractPayments,
  formatCurrency,
}: ContractCalendarModalProps) {
  const contractInfo = contractPayments[0]?.contrato;
  
  // Find the month range from all payments
  const paymentDates = contractPayments.map(p => new Date(p.fecha_vencimiento));
  const firstPaymentDate = paymentDates.length > 0 
    ? new Date(Math.min(...paymentDates.map(d => d.getTime())))
    : new Date();
  
  const [currentMonth, setCurrentMonth] = useState(firstPaymentDate);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const paymentsByDate = useMemo(() => {
    const map: Record<string, UnifiedPayment[]> = {};
    contractPayments.forEach((payment) => {
      const dateKey = payment.fecha_vencimiento.split('T')[0];
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(payment);
    });
    return map;
  }, [contractPayments]);

  const getDayPayment = (date: Date): UnifiedPayment | null => {
    const dateKey = format(date, "yyyy-MM-dd");
    const payments = paymentsByDate[dateKey];
    return payments && payments.length > 0 ? payments[0] : null;
  };

  // Summary statistics
  const stats = useMemo(() => {
    const total = contractPayments.length;
    const pagados = contractPayments.filter(p => p.status === "pagado").length;
    const pendientes = contractPayments.filter(p => p.status === "pendiente").length;
    const vencidos = contractPayments.filter(p => p.status === "vencido").length;
    const proyectados = contractPayments.filter(p => p.status === "proyectado").length;
    
    const montoTotal = contractPayments.reduce((sum, p) => sum + p.monto, 0);
    const montoPagado = contractPayments.filter(p => p.status === "pagado").reduce((sum, p) => sum + p.monto, 0);
    const montoPendiente = contractPayments.filter(p => p.status === "pendiente" || p.status === "vencido").reduce((sum, p) => sum + p.monto, 0);
    
    return { total, pagados, pendientes, vencidos, proyectados, montoTotal, montoPagado, montoPendiente };
  }, [contractPayments]);

  const currency = contractInfo?.moneda || "PEN";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <span>Calendario de Pagos</span>
              <span className="text-muted-foreground font-normal ml-2">
                {contractInfo?.numero}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Contract Info Header */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <p className="font-semibold text-lg">{contractInfo?.cliente?.razon_social}</p>
              <p className="text-sm text-muted-foreground">{contractInfo?.cliente?.codigo}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Servicio</p>
              <p className="font-medium">{contractInfo?.descripcion || "-"}</p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.pagados}</p>
            <p className="text-xs text-green-600 dark:text-green-500">Pagados</p>
            <p className="text-sm font-medium text-green-700 dark:text-green-400 mt-1">
              {formatCurrency(stats.montoPagado, currency)}
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.pendientes}</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">Pendientes</p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.vencidos}</p>
            <p className="text-xs text-red-600 dark:text-red-500">Vencidos</p>
            <p className="text-sm font-medium text-red-700 dark:text-red-400 mt-1">
              {formatCurrency(stats.montoPendiente, currency)}
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.proyectados}</p>
            <p className="text-xs text-purple-600 dark:text-purple-500">Proyectados</p>
          </div>
        </div>

        <Separator />

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </h3>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-muted/50">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
              <div
                key={day}
                className="py-2 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {/* Empty cells for days before start of month */}
            {Array.from({ length: calendarDays[0].getDay() }).map((_, i) => (
              <div key={`empty-start-${i}`} className="h-24 border-t border-r bg-muted/20" />
            ))}

            {/* Days of month */}
            {calendarDays.map((date) => {
              const payment = getDayPayment(date);
              const isToday = isSameDay(date, new Date());
              const config = payment ? statusConfig[payment.status] : null;
              const StatusIcon = config?.icon || Clock;

              return (
                <div
                  key={date.toISOString()}
                  className={cn(
                    "h-24 border-t border-r p-1 transition-colors relative",
                    isToday && "bg-primary/5",
                    !isSameMonth(date, currentMonth) && "bg-muted/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full",
                        isToday && "bg-primary text-primary-foreground"
                      )}
                    >
                      {format(date, "d")}
                    </span>
                  </div>

                  {/* Payment indicator */}
                  {payment && config && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "absolute inset-1 top-8 rounded-md p-2 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md",
                              "flex flex-col items-center justify-center text-center",
                              payment.status === "pagado" && "bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700",
                              payment.status === "pendiente" && "bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700",
                              payment.status === "vencido" && "bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700",
                              payment.status === "parcial" && "bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700",
                              payment.status === "proyectado" && "bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700"
                            )}
                          >
                            <StatusIcon className={cn("h-4 w-4 mb-0.5", config.textColor)} />
                            <span className={cn("text-[10px] font-semibold", config.textColor)}>
                              {formatCurrency(payment.monto, currency)}
                            </span>
                            <span className={cn("text-[9px]", config.textColor)}>
                              Cuota {payment.cuota}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold">{config.label}</p>
                            <p className="text-sm">
                              {formatCurrency(payment.monto, currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payment.glosa || `Cuota ${payment.cuota}`}
                            </p>
                            {payment.fecha_pago && (
                              <p className="text-xs text-green-600">
                                Pagado: {format(new Date(payment.fecha_pago), "dd MMM yyyy", { locale: es })}
                              </p>
                            )}
                            {payment.isProjected && (
                              <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700">
                                Proyectado
                              </Badge>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              );
            })}

            {/* Empty cells for days after end of month */}
            {Array.from({ length: 6 - calendarDays[calendarDays.length - 1].getDay() }).map(
              (_, i) => (
                <div key={`empty-end-${i}`} className="h-24 border-t border-r bg-muted/20" />
              )
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm justify-center pt-2">
          {Object.entries(statusConfig).map(([key, value]) => {
            const Icon = value.icon;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <div className={cn("h-3 w-3 rounded", value.bgColor)} />
                <Icon className={cn("h-3 w-3", value.textColor)} />
                <span className="text-muted-foreground">{value.label}</span>
              </div>
            );
          })}
        </div>

        {/* Payment Timeline List */}
        <Separator />
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">Cronograma de Pagos</h4>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {contractPayments
              .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())
              .map((payment, index) => {
                const config = statusConfig[payment.status];
                const StatusIcon = config?.icon || Clock;
                const dateParts = payment.fecha_vencimiento.split('T')[0].split('-');
                const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                
                return (
                  <div
                    key={payment.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      payment.status === "pagado" && "bg-green-50 dark:bg-green-950/20 border-green-200",
                      payment.status === "pendiente" && "bg-amber-50 dark:bg-amber-950/20 border-amber-200",
                      payment.status === "vencido" && "bg-red-50 dark:bg-red-950/20 border-red-200",
                      payment.status === "parcial" && "bg-blue-50 dark:bg-blue-950/20 border-blue-200",
                      payment.status === "proyectado" && "bg-purple-50 dark:bg-purple-950/20 border-purple-200"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center",
                        config.bgColor
                      )}>
                        <StatusIcon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          Cuota {payment.cuota || index + 1}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(date, "dd 'de' MMMM, yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(payment.monto, currency)}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", config.textColor, 
                          payment.status === "pagado" && "border-green-300 bg-green-100",
                          payment.status === "pendiente" && "border-amber-300 bg-amber-100",
                          payment.status === "vencido" && "border-red-300 bg-red-100",
                          payment.status === "parcial" && "border-blue-300 bg-blue-100",
                          payment.status === "proyectado" && "border-purple-300 bg-purple-100"
                        )}
                      >
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

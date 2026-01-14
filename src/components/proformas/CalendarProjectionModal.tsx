import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isWithinInterval, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProformaItem {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface ServiceProjection {
  id: string;
  descripcion: string;
  color: string;
  fechaInicio: Date | undefined;
  fechaTermino: Date | undefined;
  dias: number;
  meses: number;
  anos: number;
  fechaPago: number; // Día del mes
  cicloPago: "unico" | "mensual" | "anual";
  nroCuotas: number;
  documentoPagoId: string;
  metodoPagoId: string;
  pago: number;
  total: number;
}

interface CalendarProjectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ProformaItem[];
  onSave: (projection: ServiceProjection[]) => void;
  initialProjection?: ServiceProjection[];
}

interface DocumentoPago {
  id: string;
  nombre: string;
  activo: boolean;
}

interface MetodoPago {
  id: string;
  nombre: string;
  activo: boolean;
}

const SERVICE_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-indigo-500",
  "bg-teal-500",
];

export function CalendarProjectionModal({
  open,
  onOpenChange,
  items,
  onSave,
  initialProjection,
}: CalendarProjectionModalProps) {
  const [projections, setProjections] = useState<ServiceProjection[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: documentosPago = [] } = useQuery({
    queryKey: ["documentos_pago_activos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_pago")
        .select("*")
        .eq("activo", true)
        .order("orden");
      if (error) throw error;
      return data as DocumentoPago[];
    },
  });

  const { data: metodosPago = [] } = useQuery({
    queryKey: ["metodos_pago_activos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metodos_pago")
        .select("*")
        .eq("activo", true)
        .order("orden");
      if (error) throw error;
      return data as MetodoPago[];
    },
  });

  // Initialize projections from items
  useEffect(() => {
    if (open && items.length > 0) {
      if (initialProjection && initialProjection.length > 0) {
        setProjections(initialProjection.map(p => ({
          ...p,
          fechaInicio: p.fechaInicio ? new Date(p.fechaInicio) : undefined,
          fechaTermino: p.fechaTermino ? new Date(p.fechaTermino) : undefined,
        })));
      } else {
        const validItems = items.filter(item => item.descripcion.trim() !== "");
        const newProjections = validItems.map((item, index) => ({
          id: `service-${index}`,
          descripcion: item.descripcion,
          color: SERVICE_COLORS[index % SERVICE_COLORS.length],
          fechaInicio: undefined,
          fechaTermino: undefined,
          dias: 0,
          meses: 0,
          anos: 0,
          fechaPago: 1,
          cicloPago: "mensual" as const,
          nroCuotas: 1,
          documentoPagoId: documentosPago[0]?.id || "",
          metodoPagoId: metodosPago[0]?.id || "",
          pago: item.subtotal,
          total: item.subtotal,
        }));
        setProjections(newProjections);
      }
    }
  }, [open, items, initialProjection, documentosPago, metodosPago]);

  const calculateDaysMonthsYears = (fechaInicio: Date | undefined, fechaTermino: Date | undefined) => {
    if (!fechaInicio || !fechaTermino) return { dias: 0, meses: 0, anos: 0 };
    const dias = differenceInDays(fechaTermino, fechaInicio);
    const meses = dias / 30;
    const anos = dias / 365;
    return { dias, meses: Math.round(meses * 100) / 100, anos: Math.round(anos * 100) / 100 };
  };

  const handleProjectionChange = (
    index: number,
    field: keyof ServiceProjection,
    value: any
  ) => {
    setProjections((prev) => {
      const newProjections = [...prev];
      newProjections[index] = { ...newProjections[index], [field]: value };

      // Recalculate days, months, years
      if (field === "fechaInicio" || field === "fechaTermino") {
        const { dias, meses, anos } = calculateDaysMonthsYears(
          newProjections[index].fechaInicio,
          newProjections[index].fechaTermino
        );
        newProjections[index].dias = dias;
        newProjections[index].meses = meses;
        newProjections[index].anos = anos;

        // Recalculate cuotas based on cycle
        if (newProjections[index].cicloPago === "mensual") {
          newProjections[index].nroCuotas = Math.max(1, Math.ceil(meses));
        } else if (newProjections[index].cicloPago === "anual") {
          newProjections[index].nroCuotas = Math.max(1, Math.ceil(anos));
        } else {
          newProjections[index].nroCuotas = 1;
        }

        // Recalculate total based on pago and cuotas
        newProjections[index].total = newProjections[index].pago * newProjections[index].nroCuotas;
      }

      // Recalculate cuotas when cycle changes
      if (field === "cicloPago") {
        const { meses, anos } = newProjections[index];
        if (value === "mensual") {
          newProjections[index].nroCuotas = Math.max(1, Math.ceil(meses));
        } else if (value === "anual") {
          newProjections[index].nroCuotas = Math.max(1, Math.ceil(anos));
        } else {
          newProjections[index].nroCuotas = 1;
        }
        newProjections[index].total = newProjections[index].pago * newProjections[index].nroCuotas;
      }

      // Recalculate total when cuotas or pago changes
      if (field === "nroCuotas" || field === "pago") {
        newProjections[index].total = newProjections[index].pago * newProjections[index].nroCuotas;
      }

      return newProjections;
    });
  };

  // Generate payment schedule for calendar
  const paymentSchedule = useMemo(() => {
    const schedule: { date: Date; services: { id: string; descripcion: string; color: string; pago: number }[] }[] = [];

    projections.forEach((proj) => {
      if (!proj.fechaInicio || !proj.fechaTermino) return;

      if (proj.cicloPago === "unico") {
        const existingDate = schedule.find(
          (s) => format(s.date, "yyyy-MM-dd") === format(proj.fechaInicio!, "yyyy-MM-dd")
        );
        if (existingDate) {
          existingDate.services.push({ id: proj.id, descripcion: proj.descripcion, color: proj.color, pago: proj.pago });
        } else {
          schedule.push({
            date: proj.fechaInicio,
            services: [{ id: proj.id, descripcion: proj.descripcion, color: proj.color, pago: proj.pago }],
          });
        }
      } else if (proj.cicloPago === "mensual") {
        let currentDate = new Date(proj.fechaInicio);
        currentDate.setDate(proj.fechaPago);
        for (let i = 0; i < proj.nroCuotas; i++) {
          const paymentDate = addMonths(currentDate, i);
          if (paymentDate <= proj.fechaTermino) {
            const existingDate = schedule.find(
              (s) => format(s.date, "yyyy-MM-dd") === format(paymentDate, "yyyy-MM-dd")
            );
            if (existingDate) {
              existingDate.services.push({ id: proj.id, descripcion: proj.descripcion, color: proj.color, pago: proj.pago });
            } else {
              schedule.push({
                date: paymentDate,
                services: [{ id: proj.id, descripcion: proj.descripcion, color: proj.color, pago: proj.pago }],
              });
            }
          }
        }
      } else if (proj.cicloPago === "anual") {
        let currentDate = new Date(proj.fechaInicio);
        currentDate.setDate(proj.fechaPago);
        for (let i = 0; i < proj.nroCuotas; i++) {
          const paymentDate = addMonths(currentDate, i * 12);
          if (paymentDate <= proj.fechaTermino) {
            const existingDate = schedule.find(
              (s) => format(s.date, "yyyy-MM-dd") === format(paymentDate, "yyyy-MM-dd")
            );
            if (existingDate) {
              existingDate.services.push({ id: proj.id, descripcion: proj.descripcion, color: proj.color, pago: proj.pago });
            } else {
              schedule.push({
                date: paymentDate,
                services: [{ id: proj.id, descripcion: proj.descripcion, color: proj.color, pago: proj.pago }],
              });
            }
          }
        }
      }
    });

    return schedule.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [projections]);

  // Calendar days for the current month
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getPaymentsForDay = (day: Date) => {
    return paymentSchedule.find(
      (p) => format(p.date, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
    );
  };

  const handleSave = () => {
    onSave(projections);
    onOpenChange(false);
  };

  const totalGeneral = projections.reduce((sum, p) => sum + p.total, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Proyección de Calendario
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Services Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[35vh]">
              <table className="w-full min-w-[1400px] text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Servicio</th>
                    <th className="text-left p-2 font-medium w-[130px]">Fecha Inicio</th>
                    <th className="text-left p-2 font-medium w-[130px]">Fecha Término</th>
                    <th className="text-center p-2 font-medium w-[60px]">Días</th>
                    <th className="text-center p-2 font-medium w-[60px]">Meses</th>
                    <th className="text-center p-2 font-medium w-[60px]">Años</th>
                    <th className="text-center p-2 font-medium w-[80px]">Día Pago</th>
                    <th className="text-left p-2 font-medium w-[120px]">Ciclo</th>
                    <th className="text-center p-2 font-medium w-[80px]">Cuotas</th>
                    <th className="text-left p-2 font-medium w-[150px]">Doc. Pago</th>
                    <th className="text-left p-2 font-medium w-[130px]">Método Pago</th>
                    <th className="text-right p-2 font-medium w-[100px]">Pago</th>
                    <th className="text-right p-2 font-medium w-[100px]">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {projections.map((proj, index) => (
                    <tr key={proj.id} className="hover:bg-muted/30">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded-full", proj.color)} />
                          <span className="truncate max-w-[200px]" title={proj.descripcion}>
                            {proj.descripcion}
                          </span>
                        </div>
                      </td>
                      <td className="p-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "w-full justify-start text-left font-normal h-8 text-xs",
                                !proj.fechaInicio && "text-muted-foreground"
                              )}
                            >
                              {proj.fechaInicio ? format(proj.fechaInicio, "dd/MM/yyyy") : "Seleccionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={proj.fechaInicio}
                              onSelect={(date) => handleProjectionChange(index, "fechaInicio", date)}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </td>
                      <td className="p-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "w-full justify-start text-left font-normal h-8 text-xs",
                                !proj.fechaTermino && "text-muted-foreground"
                              )}
                            >
                              {proj.fechaTermino ? format(proj.fechaTermino, "dd/MM/yyyy") : "Seleccionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={proj.fechaTermino}
                              onSelect={(date) => handleProjectionChange(index, "fechaTermino", date)}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </td>
                      <td className="p-2 text-center text-muted-foreground">{proj.dias}</td>
                      <td className="p-2 text-center text-muted-foreground">{proj.meses}</td>
                      <td className="p-2 text-center text-muted-foreground">{proj.anos}</td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={1}
                          max={28}
                          value={proj.fechaPago}
                          onChange={(e) => handleProjectionChange(index, "fechaPago", parseInt(e.target.value) || 1)}
                          className="h-8 text-xs text-center w-full"
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          value={proj.cicloPago}
                          onValueChange={(v) => handleProjectionChange(index, "cicloPago", v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unico">Único Pago</SelectItem>
                            <SelectItem value="mensual">Mensual</SelectItem>
                            <SelectItem value="anual">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={1}
                          value={proj.nroCuotas}
                          onChange={(e) => handleProjectionChange(index, "nroCuotas", parseInt(e.target.value) || 1)}
                          className="h-8 text-xs text-center w-full"
                          disabled={proj.cicloPago === "unico"}
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          value={proj.documentoPagoId}
                          onValueChange={(v) => handleProjectionChange(index, "documentoPagoId", v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {documentosPago.map((doc) => (
                              <SelectItem key={doc.id} value={doc.id}>
                                {doc.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Select
                          value={proj.metodoPagoId}
                          onValueChange={(v) => handleProjectionChange(index, "metodoPagoId", v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {metodosPago.map((met) => (
                              <SelectItem key={met.id} value={met.id}>
                                {met.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={proj.pago}
                          onChange={(e) => handleProjectionChange(index, "pago", parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right w-full"
                        />
                      </td>
                      <td className="p-2 text-right font-medium">
                        S/ {proj.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/50 border-t-2">
                  <tr>
                    <td colSpan={12} className="p-2 text-right font-semibold">Total General:</td>
                    <td className="p-2 text-right font-bold text-lg">S/ {totalGeneral.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Calendar View */}
          <div className="border rounded-lg flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-3 border-b bg-muted/30">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-semibold capitalize">
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

            <div className="flex-1 overflow-auto p-3">
              <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-muted-foreground mb-2">
                <div>Dom</div>
                <div>Lun</div>
                <div>Mar</div>
                <div>Mié</div>
                <div>Jue</div>
                <div>Vie</div>
                <div>Sáb</div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before the first of the month */}
                {Array.from({ length: calendarDays[0]?.getDay() || 0 }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[80px]" />
                ))}

                {calendarDays.map((day) => {
                  const payments = getPaymentsForDay(day);
                  const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "min-h-[80px] border rounded-md p-1 text-xs",
                        isToday && "bg-primary/10 border-primary",
                        !isSameMonth(day, currentMonth) && "opacity-50"
                      )}
                    >
                      <div className={cn("font-medium mb-1", isToday && "text-primary")}>
                        {format(day, "d")}
                      </div>
                      {payments && (
                        <div className="space-y-0.5">
                          {payments.services.map((service, idx) => (
                            <div
                              key={`${service.id}-${idx}`}
                              className={cn(
                                "text-white px-1 py-0.5 rounded text-[10px] truncate",
                                service.color
                              )}
                              title={`${service.descripcion}: S/ ${service.pago.toFixed(2)}`}
                            >
                              S/ {service.pago.toFixed(0)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="border-t p-3 bg-muted/20">
              <div className="flex flex-wrap gap-3">
                {projections.map((proj) => (
                  <div key={proj.id} className="flex items-center gap-1.5 text-xs">
                    <div className={cn("w-3 h-3 rounded-full", proj.color)} />
                    <span className="truncate max-w-[150px]">{proj.descripcion}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Guardar Proyección
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

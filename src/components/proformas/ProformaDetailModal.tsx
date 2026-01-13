import { format } from "date-fns";
import { es } from "date-fns/locale";
import { X, Download, Send, FileText, Building2, Calendar, DollarSign, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface ProformaItem {
  id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface Proforma {
  id: string;
  numero: string;
  cliente: {
    razon_social: string;
    codigo: string;
    direccion: string | null;
    email: string | null;
    telefono: string | null;
  } | null;
  tipo: string;
  subtotal: number;
  igv: number;
  total: number;
  status: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  notas: string | null;
  moneda: string;
}

interface ProformaDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proforma: Proforma | null;
  items: ProformaItem[];
  loading: boolean;
  onDownloadPDF: () => void;
  onSendEmail: () => void;
  downloadingPDF: boolean;
}

const typeStyles: Record<string, string> = {
  "Contabilidad": "bg-primary/10 text-primary",
  "Trámites": "bg-secondary/20 text-secondary-foreground",
  "Auditoría y Control Interno": "bg-purple-100 text-purple-700",
  contabilidad: "bg-primary/10 text-primary",
  tramites: "bg-secondary/20 text-secondary-foreground",
};

const typeLabels: Record<string, string> = {
  "Contabilidad": "Contabilidad",
  "Trámites": "Trámites",
  "Auditoría y Control Interno": "Auditoría",
  contabilidad: "Contabilidad",
  tramites: "Trámites",
};

export function ProformaDetailModal({
  open,
  onOpenChange,
  proforma,
  items,
  loading,
  onDownloadPDF,
  onSendEmail,
  downloadingPDF,
}: ProformaDetailModalProps) {
  const { data: estados = [] } = useQuery({
    queryKey: ["proforma-estados-modal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proforma_estados")
        .select("*")
        .order("orden");
      if (error) throw error;
      return data;
    },
  });

  const getStatusInfo = (statusName: string) => {
    const estado = estados.find((e) => e.nombre === statusName);
    return {
      label: estado?.nombre_display || statusName,
      color: estado?.color || "#6B7280",
    };
  };

  if (!proforma) return null;

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd 'de' MMMM, yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: proforma.moneda === "USD" ? "USD" : "PEN",
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              Proforma {proforma.numero}
            </DialogTitle>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className={typeStyles[proforma.tipo]}>
                {typeLabels[proforma.tipo]}
              </Badge>
              <Badge 
                variant="outline" 
                style={{ 
                  backgroundColor: `${getStatusInfo(proforma.status).color}15`,
                  color: getStatusInfo(proforma.status).color,
                  borderColor: `${getStatusInfo(proforma.status).color}50`
                }}
              >
                {getStatusInfo(proforma.status).label}
              </Badge>
            </div>

            {/* Client and Dates */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Client Info */}
              <div className="bg-muted/50 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  CLIENTE
                </div>
                <div>
                  <p className="font-semibold text-lg">{proforma.cliente?.razon_social || "Sin cliente"}</p>
                  <p className="text-sm text-muted-foreground">{proforma.cliente?.codigo}</p>
                </div>
                {proforma.cliente?.direccion && (
                  <p className="text-sm">{proforma.cliente.direccion}</p>
                )}
                <div className="flex flex-col gap-1 text-sm">
                  {proforma.cliente?.email && (
                    <span className="text-muted-foreground">{proforma.cliente.email}</span>
                  )}
                  {proforma.cliente?.telefono && (
                    <span className="text-muted-foreground">{proforma.cliente.telefono}</span>
                  )}
                </div>
              </div>

              {/* Dates Info */}
              <div className="bg-muted/50 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  FECHAS
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Emisión</p>
                    <p className="font-medium">{formatDate(proforma.fecha_emision)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Válida hasta</p>
                    <p className="font-medium">{formatDate(proforma.fecha_vencimiento)}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Items Table */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Detalle de Servicios</h3>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">
                        Descripción
                      </th>
                      <th className="text-center text-xs font-medium text-muted-foreground uppercase px-4 py-3 w-20">
                        Cant.
                      </th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3 w-32">
                        P. Unit.
                      </th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3 w-32">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">{item.descripcion}</td>
                        <td className="px-4 py-3 text-center">{item.cantidad}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(Number(item.precio_unitario))}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(Number(item.subtotal))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="bg-muted/50 rounded-xl p-5 w-full md:w-80 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  RESUMEN
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(Number(proforma.subtotal))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IGV (18%)</span>
                    <span>{formatCurrency(Number(proforma.igv))}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(Number(proforma.total))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {proforma.notas && (
              <div className="bg-muted/30 rounded-xl p-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Notas</p>
                <p className="text-sm">{proforma.notas}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <Button variant="outline" className="gap-2" onClick={onDownloadPDF} disabled={downloadingPDF}>
                {downloadingPDF ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Descargar PDF
              </Button>
              <Button className="gap-2 btn-gradient" onClick={onSendEmail}>
                <Send className="h-4 w-4" />
                Enviar al Cliente
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

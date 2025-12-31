import { useState, useEffect } from "react";
import { FileCheck, Calendar, User, DollarSign, FileText, Building, Clock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import type { ContractStatus } from "./ContractActions";

interface ContractDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string | null;
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
  created_at: string;
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

export const ContractDetailModal = ({
  open,
  onOpenChange,
  contractId,
}: ContractDetailModalProps) => {
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && contractId) {
      fetchContractDetail();
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
        proforma:proformas(numero, total)
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
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Detalle del Contrato
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : contract ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold">{contract.numero}</h3>
                <p className="text-muted-foreground">{contract.descripcion}</p>
              </div>
              <Badge variant="outline" className={statusStyles[contract.status]}>
                {statusLabels[contract.status]}
              </Badge>
            </div>

            <Separator />

            {/* Client Info */}
            {contract.cliente && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Cliente
                </h4>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="font-medium">{contract.cliente.razon_social}</p>
                  <p className="text-sm text-muted-foreground">RUC: {contract.cliente.codigo}</p>
                  {contract.cliente.direccion && (
                    <p className="text-sm text-muted-foreground">{contract.cliente.direccion}</p>
                  )}
                  {contract.cliente.email && (
                    <p className="text-sm text-muted-foreground">{contract.cliente.email}</p>
                  )}
                </div>
              </div>
            )}

            {/* Contract Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Tipo de Servicio
                </label>
                <p className="font-medium capitalize">{contract.tipo_servicio}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Moneda
                </label>
                <p className="font-medium">{contract.moneda === "PEN" ? "Soles (S/)" : "Dólares ($)"}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha Inicio
                </label>
                <p className="font-medium">{contract.fecha_inicio}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha Fin
                </label>
                <p className="font-medium">{contract.fecha_fin || "Sin definir"}</p>
              </div>

              {contract.monto_mensual && (
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Cuota Mensual</label>
                  <p className="font-medium text-lg">
                    {contract.moneda === "PEN" ? "S/" : "$"} {Number(contract.monto_mensual).toLocaleString()}
                  </p>
                </div>
              )}

              {contract.monto_total && (
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Monto Total</label>
                  <p className="font-medium text-lg">
                    {contract.moneda === "PEN" ? "S/" : "$"} {Number(contract.monto_total).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Proforma Reference */}
            {contract.proforma && (
              <>
                <Separator />
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Proforma Origen</label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{contract.proforma.numero}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Total: {contract.moneda === "PEN" ? "S/" : "$"} {Number(contract.proforma.total).toLocaleString()}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {contract.notas && (
              <>
                <Separator />
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Notas</label>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{contract.notas}</p>
                </div>
              </>
            )}

            {/* Metadata */}
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Creado: {new Date(contract.created_at).toLocaleString("es-PE")}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No se encontró el contrato
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

import { useState, useEffect, useMemo } from "react";
import { FileCheck, Calendar, DollarSign, FileText, Building, Clock, Loader2, Eye, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  plantilla_id: string | null;
  datos_plantilla: DatosPlantilla | null;
  cliente: {
    razon_social: string;
    codigo: string;
    direccion: string | null;
    email: string | null;
    telefono: string | null;
    contacto_nombre: string | null;
  } | null;
  proforma: {
    numero: string;
    total: number;
    subtotal: number;
    igv: number;
    moneda: string;
    items: { descripcion: string; cantidad: number; precio_unitario: number; subtotal: number }[];
  } | null;
  plantilla: {
    nombre: string;
    tipo: string;
  } | null;
}

interface DatosPlantilla {
  plantilla_id: string;
  partes: Record<string, Record<string, string>>;
  clausulas: {
    id: string;
    numero: number;
    titulo: string;
    contenido: string;
    contenido_procesado: string;
  }[];
  variables: Record<string, string>;
  fecha_aplicacion: string;
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
  const [activeTab, setActiveTab] = useState<"detalle" | "contrato">("detalle");

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
        cliente:clientes(razon_social, codigo, direccion, email, telefono, contacto_nombre),
        proforma:proformas(numero, total, subtotal, igv, moneda, items:proforma_items(descripcion, cantidad, precio_unitario, subtotal)),
        plantilla:contrato_plantillas(nombre, tipo)
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
        plantilla: data.plantilla as ContractDetail["plantilla"],
        datos_plantilla: data.datos_plantilla as unknown as DatosPlantilla | null,
      });
    }
    setLoading(false);
  };

  const hasContractData = useMemo(() => {
    return contract?.datos_plantilla && 
           contract.datos_plantilla.clausulas && 
           contract.datos_plantilla.clausulas.length > 0;
  }, [contract]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Detalle del Contrato
          </DialogTitle>
          {contract && (
            <DialogDescription>
              {contract.numero} - {contract.cliente?.razon_social}
            </DialogDescription>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : contract ? (
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="detalle" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Datos del Contrato
                  </TabsTrigger>
                  <TabsTrigger value="contrato" className="gap-2" disabled={!hasContractData}>
                    <Eye className="h-4 w-4" />
                    Ver Contrato
                  </TabsTrigger>
                </TabsList>
                <Badge variant="outline" className={statusStyles[contract.status]}>
                  {statusLabels[contract.status]}
                </Badge>
              </div>

              <TabsContent value="detalle" className="flex-1 overflow-auto mt-0">
                <div className="space-y-6 pr-2">
                  {/* Contract Info Form-like view */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Tipo de Servicio</Label>
                      <Input 
                        value={contract.tipo_servicio === "contabilidad" ? "Contabilidad" : "Trámites"} 
                        readOnly 
                        className="bg-muted/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Moneda</Label>
                      <Input 
                        value={contract.moneda === "PEN" ? "Soles (S/)" : "Dólares ($)"} 
                        readOnly 
                        className="bg-muted/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Descripción</Label>
                    <Textarea 
                      value={contract.descripcion} 
                      readOnly 
                      className="bg-muted/50 resize-none"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Fecha Inicio</Label>
                      <Input 
                        value={new Date(contract.fecha_inicio).toLocaleDateString("es-PE")} 
                        readOnly 
                        className="bg-muted/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Fecha Fin</Label>
                      <Input 
                        value={contract.fecha_fin ? new Date(contract.fecha_fin).toLocaleDateString("es-PE") : "Sin definir"} 
                        readOnly 
                        className="bg-muted/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Monto Mensual</Label>
                      <Input 
                        value={contract.monto_mensual ? `${contract.moneda === "PEN" ? "S/" : "$"} ${Number(contract.monto_mensual).toLocaleString()}` : "-"} 
                        readOnly 
                        className="bg-muted/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Monto Total</Label>
                      <Input 
                        value={contract.monto_total ? `${contract.moneda === "PEN" ? "S/" : "$"} ${Number(contract.monto_total).toLocaleString()}` : "-"} 
                        readOnly 
                        className="bg-muted/50"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Cliente */}
                  {contract.cliente && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Cliente
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Razón Social</p>
                            <p className="font-medium">{contract.cliente.razon_social}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">RUC</p>
                            <p className="font-medium">{contract.cliente.codigo}</p>
                          </div>
                          {contract.cliente.direccion && (
                            <div className="col-span-2">
                              <p className="text-sm text-muted-foreground">Dirección</p>
                              <p className="font-medium">{contract.cliente.direccion}</p>
                            </div>
                          )}
                          {contract.cliente.contacto_nombre && (
                            <div>
                              <p className="text-sm text-muted-foreground">Contacto</p>
                              <p className="font-medium">{contract.cliente.contacto_nombre}</p>
                            </div>
                          )}
                          {contract.cliente.email && (
                            <div>
                              <p className="text-sm text-muted-foreground">Email</p>
                              <p className="font-medium">{contract.cliente.email}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Proforma */}
                  {contract.proforma && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Proforma Origen
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{contract.proforma.numero}</Badge>
                          <span className="font-medium">
                            {contract.proforma.moneda === "PEN" ? "S/" : "$"} {Number(contract.proforma.total).toLocaleString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Plantilla aplicada */}
                  {contract.plantilla && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileCheck className="h-4 w-4" />
                          Plantilla Aplicada
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{contract.plantilla.nombre}</p>
                            <p className="text-sm text-muted-foreground capitalize">{contract.plantilla.tipo}</p>
                          </div>
                          {contract.datos_plantilla?.fecha_aplicacion && (
                            <span className="text-xs text-muted-foreground">
                              Aplicada: {new Date(contract.datos_plantilla.fecha_aplicacion).toLocaleDateString("es-PE")}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Notas */}
                  {contract.notas && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Notas</Label>
                      <Textarea 
                        value={contract.notas} 
                        readOnly 
                        className="bg-muted/50 resize-none"
                        rows={3}
                      />
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Creado: {new Date(contract.created_at).toLocaleString("es-PE")}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contrato" className="flex-1 overflow-hidden mt-0">
                {hasContractData ? (
                  <Card className="h-full overflow-hidden">
                    <CardHeader className="py-3 border-b">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Vista Previa del Contrato</span>
                        {contract.plantilla && (
                          <Badge variant="secondary">{contract.plantilla.nombre}</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[55vh]">
                        <div className="p-6 space-y-6">
                          {/* Header */}
                          <div className="text-center space-y-2">
                            <h2 className="text-xl font-bold uppercase">
                              CONTRATO DE {contract.plantilla?.tipo?.toUpperCase() || "SERVICIOS"}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                              N° {contract.numero}
                            </p>
                          </div>

                          <Separator />

                          {/* Partes */}
                          {contract.datos_plantilla?.partes && Object.keys(contract.datos_plantilla.partes).length > 0 && (
                            <div className="space-y-4">
                              <h3 className="font-semibold text-sm uppercase">PARTES CONTRATANTES</h3>
                              {Object.entries(contract.datos_plantilla.partes).map(([parteNombre, campos]) => (
                                <div key={parteNombre} className="text-sm">
                                  <p className="font-medium">{parteNombre}:</p>
                                  <div className="ml-4 text-muted-foreground">
                                    {Object.entries(campos).map(([campoId, valor]) => {
                                      if (!valor) return null;
                                      const label = campoId.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                                      return (
                                        <p key={campoId}>
                                          {label}: {valor}
                                        </p>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <Separator />

                          {/* Servicios from proforma */}
                          {contract.proforma && contract.proforma.items && contract.proforma.items.length > 0 && (
                            <>
                              <div className="space-y-2">
                                <h3 className="font-semibold text-sm uppercase">SERVICIOS CONTRATADOS</h3>
                                <ul className="list-disc list-inside text-sm space-y-1">
                                  {contract.proforma.items.map((item, idx) => (
                                    <li key={idx}>{item.descripcion}</li>
                                  ))}
                                </ul>
                                <p className="text-sm font-medium mt-2">
                                  Monto Total: {contract.proforma.moneda === "PEN" ? "S/" : "$"}{" "}
                                  {Number(contract.proforma.total).toLocaleString()}
                                </p>
                              </div>
                              <Separator />
                            </>
                          )}

                          {/* Cláusulas */}
                          {contract.datos_plantilla?.clausulas && contract.datos_plantilla.clausulas.length > 0 && (
                            <div className="space-y-4">
                              {contract.datos_plantilla.clausulas.map((clausula) => (
                                <div key={clausula.id} className="space-y-1">
                                  <h4 className="font-semibold text-sm">
                                    CLÁUSULA {clausula.numero.toString().padStart(2, "0")}: {clausula.titulo}
                                  </h4>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {clausula.contenido_procesado || clausula.contenido}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          <Separator />

                          {/* Firma */}
                          {contract.datos_plantilla?.partes && (
                            <div className="pt-8">
                              <div className="grid grid-cols-2 gap-8">
                                {Object.entries(contract.datos_plantilla.partes).map(([parteNombre, campos]) => (
                                  <div key={parteNombre} className="text-center space-y-4">
                                    <div className="border-t border-foreground w-48 mx-auto" />
                                    <p className="text-sm font-medium">{parteNombre}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {campos.razon_social || campos.nombres || ""}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No se ha aplicado una plantilla a este contrato</p>
                    <p className="text-sm text-muted-foreground">Inicia la gestión del contrato para aplicar una plantilla</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
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

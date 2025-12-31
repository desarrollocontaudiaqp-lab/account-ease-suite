import { useState, useEffect, useMemo } from "react";
import { Check, ChevronDown, ChevronUp, Edit, FileText, Loader2, Save, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Plantilla {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string | null;
}

interface Parte {
  id: string;
  denominacion: string;
  tipo_persona: "natural" | "juridica";
  campos: { id: string; label: string; tipo: string; requerido: boolean }[];
  orden: number;
}

interface Clausula {
  id: string;
  numero: number;
  titulo: string;
  contenido: string;
  es_obligatoria: boolean;
  es_editable: boolean;
  orden: number;
}

interface ContractData {
  id: string;
  numero: string;
  descripcion: string;
  tipo_servicio: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  monto_mensual: number | null;
  monto_total: number | null;
  moneda: string;
  proforma_id: string | null;
}

interface ClienteData {
  id: string;
  razon_social: string;
  nombre_comercial: string | null;
  codigo: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  contacto_nombre: string | null;
}

interface ProformaData {
  id: string;
  numero: string;
  tipo: string;
  total: number;
  subtotal: number;
  igv: number;
  moneda: string;
  items: { descripcion: string; cantidad: number; precio_unitario: number; subtotal: number }[];
}

interface ApplyTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  onSuccess: () => void;
}

// Helper to replace template variables with actual data
const replaceTemplateVariables = (
  text: string,
  variables: Record<string, string>
): string => {
  let result = text;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\[${key}\\]`, "gi");
    result = result.replace(regex, value || `[${key}]`);
  });
  return result;
};

export function ApplyTemplateModal({
  open,
  onOpenChange,
  contractId,
  onSuccess,
}: ApplyTemplateModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [selectedPlantillaId, setSelectedPlantillaId] = useState<string>("");
  const [partes, setPartes] = useState<Parte[]>([]);
  const [clausulas, setClausulas] = useState<Clausula[]>([]);
  const [editedClausulas, setEditedClausulas] = useState<Record<string, string>>({});
  const [partesData, setPartesData] = useState<Record<string, Record<string, string>>>({});
  
  // Contract and related data
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [clienteData, setClienteData] = useState<ClienteData | null>(null);
  const [proformaData, setProformaData] = useState<ProformaData | null>(null);
  
  const [editingClausulaId, setEditingClausulaId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"plantilla" | "preview">("plantilla");

  // Fetch all initial data
  useEffect(() => {
    if (open && contractId) {
      fetchData();
    }
  }, [open, contractId]);

  // When plantilla is selected, fetch its details
  useEffect(() => {
    if (selectedPlantillaId) {
      fetchPlantillaDetails(selectedPlantillaId);
    }
  }, [selectedPlantillaId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch available templates
    const { data: plantillasData } = await supabase
      .from("contrato_plantillas")
      .select("id, nombre, tipo, descripcion")
      .eq("activa", true)
      .order("nombre");

    if (plantillasData) {
      setPlantillas(plantillasData);
    }

    // Fetch contract data with existing template data
    const { data: contrato } = await supabase
      .from("contratos")
      .select(`
        id, numero, descripcion, tipo_servicio, fecha_inicio, fecha_fin,
        monto_mensual, monto_total, moneda, proforma_id, plantilla_id, datos_plantilla,
        cliente:clientes(id, razon_social, nombre_comercial, codigo, direccion, telefono, email, contacto_nombre)
      `)
      .eq("id", contractId)
      .maybeSingle();

    if (contrato) {
      setContractData({
        id: contrato.id,
        numero: contrato.numero,
        descripcion: contrato.descripcion,
        tipo_servicio: contrato.tipo_servicio,
        fecha_inicio: contrato.fecha_inicio,
        fecha_fin: contrato.fecha_fin,
        monto_mensual: contrato.monto_mensual,
        monto_total: contrato.monto_total,
        moneda: contrato.moneda,
        proforma_id: contrato.proforma_id,
      });

      const cliente = contrato.cliente as unknown as ClienteData;
      if (cliente) {
        setClienteData(cliente);
      }

      // Check if there's already saved template data
      const savedData = contrato.datos_plantilla as {
        plantilla_id?: string;
        partes?: Record<string, Record<string, string>>;
        clausulas?: { id: string; contenido: string }[];
      } | null;

      if (savedData && savedData.plantilla_id) {
        // Load previously saved template data
        setSelectedPlantillaId(savedData.plantilla_id);
        
        if (savedData.partes) {
          setPartesData(savedData.partes);
        }
        
        if (savedData.clausulas) {
          const editedMap: Record<string, string> = {};
          savedData.clausulas.forEach((c) => {
            editedMap[c.id] = c.contenido;
          });
          setEditedClausulas(editedMap);
        }
      } else if (cliente) {
        // Pre-fill "LA SEGUNDA PARTE" with client data only if no saved data
        setPartesData((prev) => ({
          ...prev,
          "LA SEGUNDA PARTE": {
            razon_social: cliente.razon_social || "",
            ruc: cliente.codigo || "",
            domicilio: cliente.direccion || "",
            representante_nombre: cliente.contacto_nombre || "",
            representante_dni: "",
            representante_poder: "",
          },
        }));
      }

      // Fetch proforma data if linked
      if (contrato.proforma_id) {
        const { data: proforma } = await supabase
          .from("proformas")
          .select(`
            id, numero, tipo, total, subtotal, igv, moneda,
            items:proforma_items(descripcion, cantidad, precio_unitario, subtotal)
          `)
          .eq("id", contrato.proforma_id)
          .maybeSingle();

        if (proforma) {
          setProformaData({
            id: proforma.id,
            numero: proforma.numero,
            tipo: proforma.tipo,
            total: proforma.total,
            subtotal: proforma.subtotal,
            igv: proforma.igv,
            moneda: proforma.moneda,
            items: proforma.items as ProformaData["items"],
          });
        }
      }
    }

    setLoading(false);
  };

  const fetchPlantillaDetails = async (plantillaId: string) => {
    const [partesRes, clausulasRes] = await Promise.all([
      supabase
        .from("contrato_plantilla_partes")
        .select("*")
        .eq("plantilla_id", plantillaId)
        .order("orden"),
      supabase
        .from("contrato_plantilla_clausulas")
        .select("*")
        .eq("plantilla_id", plantillaId)
        .order("orden"),
    ]);

    if (partesRes.data) {
      const partesFormatted = partesRes.data.map((p) => ({
        id: p.id,
        denominacion: p.denominacion,
        tipo_persona: p.tipo_persona as "natural" | "juridica",
        campos: Array.isArray(p.campos) ? (p.campos as Parte["campos"]) : [],
        orden: p.orden,
      }));
      setPartes(partesFormatted);

      // Initialize partes data if not already set
      partesFormatted.forEach((parte) => {
        if (!partesData[parte.denominacion]) {
          const initialData: Record<string, string> = {};
          parte.campos.forEach((campo) => {
            initialData[campo.id] = "";
          });
          
          // Pre-fill client data for "LA SEGUNDA PARTE"
          if (parte.denominacion.includes("SEGUNDA") && clienteData) {
            initialData.razon_social = clienteData.razon_social || "";
            initialData.ruc = clienteData.codigo || "";
            initialData.domicilio = clienteData.direccion || "";
            initialData.representante_nombre = clienteData.contacto_nombre || "";
          }
          
          setPartesData((prev) => ({
            ...prev,
            [parte.denominacion]: initialData,
          }));
        }
      });
    }

    if (clausulasRes.data) {
      setClausulas(
        clausulasRes.data.map((c) => ({
          id: c.id,
          numero: c.numero,
          titulo: c.titulo,
          contenido: c.contenido,
          es_obligatoria: c.es_obligatoria || false,
          es_editable: c.es_editable !== false,
          orden: c.orden,
        }))
      );
    }
  };

  // Build template variables from all data
  const templateVariables = useMemo(() => {
    const vars: Record<string, string> = {};

    // Contract data
    if (contractData) {
      vars["FECHA_INICIO"] = new Date(contractData.fecha_inicio).toLocaleDateString("es-PE");
      vars["FECHA_FIN"] = contractData.fecha_fin
        ? new Date(contractData.fecha_fin).toLocaleDateString("es-PE")
        : "";
      vars["MONTO"] = contractData.monto_total
        ? `${contractData.moneda === "PEN" ? "S/" : "$"} ${contractData.monto_total.toLocaleString()}`
        : "";
      vars["MONTO_MENSUAL"] = contractData.monto_mensual
        ? `${contractData.moneda === "PEN" ? "S/" : "$"} ${contractData.monto_mensual.toLocaleString()}`
        : "";
      vars["DESCRIPCION_SERVICIO"] = contractData.descripcion;
    }

    // Client data
    if (clienteData) {
      vars["CLIENTE_RAZON_SOCIAL"] = clienteData.razon_social;
      vars["CLIENTE_RUC"] = clienteData.codigo;
      vars["CLIENTE_DIRECCION"] = clienteData.direccion || "";
      vars["CLIENTE_EMAIL"] = clienteData.email || "";
      vars["CLIENTE_TELEFONO"] = clienteData.telefono || "";
    }

    // Proforma data
    if (proformaData) {
      vars["PROFORMA_NUMERO"] = proformaData.numero;
      vars["PROFORMA_TOTAL"] = `${proformaData.moneda === "PEN" ? "S/" : "$"} ${proformaData.total.toLocaleString()}`;
      
      // List of services
      const serviciosTexto = proformaData.items
        .map((item) => `- ${item.descripcion}`)
        .join("\n");
      vars["SERVICIOS"] = serviciosTexto;
    }

    // Partes data
    Object.entries(partesData).forEach(([parteNombre, campos]) => {
      Object.entries(campos).forEach(([campoId, valor]) => {
        const key = `${parteNombre.replace(/\s+/g, "_")}_${campoId}`.toUpperCase();
        vars[key] = valor;
      });
    });

    return vars;
  }, [contractData, clienteData, proformaData, partesData]);

  // Get processed clausula content (with variables replaced)
  const getProcessedClausulaContent = (clausula: Clausula): string => {
    const content = editedClausulas[clausula.id] ?? clausula.contenido;
    return replaceTemplateVariables(content, templateVariables);
  };

  const handleParteFieldChange = (
    parteNombre: string,
    fieldId: string,
    value: string
  ) => {
    setPartesData((prev) => ({
      ...prev,
      [parteNombre]: {
        ...(prev[parteNombre] || {}),
        [fieldId]: value,
      },
    }));
  };

  const handleClausulaEdit = (clausulaId: string, newContent: string) => {
    setEditedClausulas((prev) => ({
      ...prev,
      [clausulaId]: newContent,
    }));
  };

  const handleSaveAndApply = async () => {
    if (!selectedPlantillaId) {
      toast.error("Por favor selecciona una plantilla");
      return;
    }

    setSaving(true);

    // Build the complete template data to save
    const datosPlantilla = {
      plantilla_id: selectedPlantillaId,
      partes: partesData,
      clausulas: clausulas.map((c) => ({
        id: c.id,
        numero: c.numero,
        titulo: c.titulo,
        contenido: editedClausulas[c.id] ?? c.contenido,
        contenido_procesado: getProcessedClausulaContent(c),
      })),
      variables: templateVariables,
      fecha_aplicacion: new Date().toISOString(),
    };

    // Update contract with template data and change status to "en_gestion"
    const { error } = await supabase
      .from("contratos")
      .update({
        plantilla_id: selectedPlantillaId,
        datos_plantilla: datosPlantilla,
        status: "en_gestion",
      })
      .eq("id", contractId);

    if (error) {
      console.error("Error applying template:", error);
      toast.error("Error al aplicar la plantilla");
    } else {
      toast.success("Plantilla aplicada. Contrato en gestión.");
      onSuccess();
      onOpenChange(false);
    }

    setSaving(false);
  };

  const selectedPlantilla = plantillas.find((p) => p.id === selectedPlantillaId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Aplicar Plantilla al Contrato
          </DialogTitle>
          <DialogDescription>
            Selecciona una plantilla y completa los datos para generar el contrato.
            {contractData && (
              <span className="font-medium ml-1">
                Contrato: {contractData.numero}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="plantilla" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Configurar
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2" disabled={!selectedPlantillaId}>
                  <Eye className="h-4 w-4" />
                  Vista Previa
                </TabsTrigger>
              </TabsList>

              <TabsContent value="plantilla" className="flex-1 overflow-hidden mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                  {/* Left column: Template selection and parties */}
                  <div className="space-y-4 overflow-auto max-h-[60vh]">
                    {/* Template selection */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">Seleccionar Plantilla</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <Select value={selectedPlantillaId} onValueChange={setSelectedPlantillaId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una plantilla" />
                          </SelectTrigger>
                          <SelectContent>
                            {plantillas.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <div className="flex flex-col">
                                  <span>{p.nombre}</span>
                                  <span className="text-xs text-muted-foreground">{p.tipo}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedPlantilla?.descripcion && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {selectedPlantilla.descripcion}
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Contract & Client info summary */}
                    {(contractData || clienteData || proformaData) && (
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-base">Datos Aplicados</CardTitle>
                        </CardHeader>
                        <CardContent className="py-2 space-y-3">
                          {clienteData && (
                            <div>
                              <p className="text-sm font-medium">Cliente</p>
                              <p className="text-sm text-muted-foreground">{clienteData.razon_social}</p>
                              <p className="text-xs text-muted-foreground">{clienteData.codigo}</p>
                            </div>
                          )}
                          {proformaData && (
                            <div>
                              <p className="text-sm font-medium">Proforma</p>
                              <p className="text-sm text-muted-foreground">{proformaData.numero}</p>
                              <p className="text-xs text-muted-foreground">
                                Total: {proformaData.moneda === "PEN" ? "S/" : "$"} {proformaData.total.toLocaleString()}
                              </p>
                            </div>
                          )}
                          {contractData && (
                            <div>
                              <p className="text-sm font-medium">Montos</p>
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                {contractData.monto_mensual && (
                                  <span>Mensual: S/ {contractData.monto_mensual.toLocaleString()}</span>
                                )}
                                {contractData.monto_total && (
                                  <span>Total: S/ {contractData.monto_total.toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Partes contratantes */}
                    {selectedPlantillaId && partes.length > 0 && (
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-base">Partes Contratantes</CardTitle>
                        </CardHeader>
                        <CardContent className="py-2">
                          <Accordion type="single" collapsible className="space-y-2">
                            {partes.map((parte) => (
                              <AccordionItem key={parte.id} value={parte.id} className="border rounded-lg px-3">
                                <AccordionTrigger className="hover:no-underline py-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{parte.orden}</Badge>
                                    <span className="font-medium text-sm">{parte.denominacion}</span>
                                    <Badge variant="secondary" className="text-xs">
                                      {parte.tipo_persona === "juridica" ? "Jurídica" : "Natural"}
                                    </Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-4">
                                  <div className="grid grid-cols-1 gap-3">
                                    {parte.campos.map((campo) => (
                                      <div key={campo.id}>
                                        <Label className="text-xs">
                                          {campo.label}
                                          {campo.requerido && <span className="text-destructive ml-1">*</span>}
                                        </Label>
                                        <Input
                                          value={partesData[parte.denominacion]?.[campo.id] || ""}
                                          onChange={(e) =>
                                            handleParteFieldChange(parte.denominacion, campo.id, e.target.value)
                                          }
                                          className="h-8 text-sm"
                                          placeholder={campo.label}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Right column: Clauses */}
                  {selectedPlantillaId && (
                    <div className="overflow-auto max-h-[60vh]">
                      <Card className="h-full">
                        <CardHeader className="py-3">
                          <CardTitle className="text-base flex items-center justify-between">
                            <span>Cláusulas ({clausulas.length})</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="py-2">
                          <ScrollArea className="h-[50vh]">
                            <Accordion type="multiple" className="space-y-2">
                              {clausulas.map((clausula) => (
                                <AccordionItem
                                  key={clausula.id}
                                  value={clausula.id}
                                  className="border rounded-lg px-3"
                                >
                                  <AccordionTrigger className="hover:no-underline py-2">
                                    <div className="flex items-center gap-2 text-left">
                                      <Badge variant="secondary" className="shrink-0">
                                        {clausula.numero.toString().padStart(2, "0")}
                                      </Badge>
                                      <span className="text-sm font-medium">{clausula.titulo}</span>
                                      {clausula.es_obligatoria && (
                                        <Badge className="bg-primary/10 text-primary text-xs">Obligatoria</Badge>
                                      )}
                                      {editedClausulas[clausula.id] !== undefined && (
                                        <Badge className="bg-amber-100 text-amber-800 text-xs">Editada</Badge>
                                      )}
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="pt-2 pb-4">
                                    {editingClausulaId === clausula.id ? (
                                      <div className="space-y-2">
                                        <Textarea
                                          value={editedClausulas[clausula.id] ?? clausula.contenido}
                                          onChange={(e) => handleClausulaEdit(clausula.id, e.target.value)}
                                          rows={6}
                                          className="text-sm"
                                        />
                                        <div className="flex justify-end gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setEditingClausulaId(null)}
                                          >
                                            <X className="h-3 w-3 mr-1" />
                                            Cerrar
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                                          {clausula.contenido}
                                        </div>
                                        {clausula.es_editable && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setEditingClausulaId(clausula.id)}
                                          >
                                            <Edit className="h-3 w-3 mr-1" />
                                            Editar
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 overflow-hidden mt-4">
                <Card className="h-full overflow-hidden">
                  <CardHeader className="py-3 border-b">
                    <CardTitle className="text-base">Vista Previa del Contrato</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[60vh]">
                      <div className="p-6 space-y-6">
                        {/* Header */}
                        <div className="text-center space-y-2">
                          <h2 className="text-xl font-bold uppercase">
                            CONTRATO DE {selectedPlantilla?.tipo?.toUpperCase() || "SERVICIOS"}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            N° {contractData?.numero}
                          </p>
                        </div>

                        <Separator />

                        {/* Partes */}
                        <div className="space-y-4">
                          <h3 className="font-semibold text-sm uppercase">PARTES CONTRATANTES</h3>
                          {partes.map((parte) => (
                            <div key={parte.id} className="text-sm">
                              <p className="font-medium">{parte.denominacion}:</p>
                              <div className="ml-4 text-muted-foreground">
                                {parte.campos.map((campo) => {
                                  const value = partesData[parte.denominacion]?.[campo.id];
                                  if (!value) return null;
                                  return (
                                    <p key={campo.id}>
                                      {campo.label}: {value}
                                    </p>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        <Separator />

                        {/* Servicios from proforma */}
                        {proformaData && proformaData.items.length > 0 && (
                          <>
                            <div className="space-y-2">
                              <h3 className="font-semibold text-sm uppercase">SERVICIOS CONTRATADOS</h3>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {proformaData.items.map((item, idx) => (
                                  <li key={idx}>{item.descripcion}</li>
                                ))}
                              </ul>
                              <p className="text-sm font-medium mt-2">
                                Monto Total: {proformaData.moneda === "PEN" ? "S/" : "$"}{" "}
                                {proformaData.total.toLocaleString()}
                              </p>
                            </div>
                            <Separator />
                          </>
                        )}

                        {/* Cláusulas */}
                        <div className="space-y-4">
                          {clausulas.map((clausula) => (
                            <div key={clausula.id} className="space-y-1">
                              <h4 className="font-semibold text-sm">
                                CLÁUSULA {clausula.numero.toString().padStart(2, "0")}: {clausula.titulo}
                              </h4>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                {getProcessedClausulaContent(clausula)}
                              </p>
                            </div>
                          ))}
                        </div>

                        <Separator />

                        {/* Firma */}
                        <div className="pt-8">
                          <div className="grid grid-cols-2 gap-8">
                            {partes.map((parte) => (
                              <div key={parte.id} className="text-center space-y-4">
                                <div className="border-t border-foreground w-48 mx-auto" />
                                <p className="text-sm font-medium">{parte.denominacion}</p>
                                <p className="text-xs text-muted-foreground">
                                  {partesData[parte.denominacion]?.razon_social ||
                                    partesData[parte.denominacion]?.nombres ||
                                    ""}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveAndApply}
            disabled={!selectedPlantillaId || saving}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Aplicando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Aplicar y Continuar Gestión
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

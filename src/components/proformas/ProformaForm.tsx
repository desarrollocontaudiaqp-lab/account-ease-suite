import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Search, ChevronDown, ChevronUp, User, Building2, Copy, Eye, EyeOff, X, CalendarDays, Save, FileText, Loader2 } from "lucide-react";
import { CalendarProjectionModal, ServiceProjection, PaymentScheduleItem } from "./CalendarProjectionModal";
import {
  Dialog,
  DialogContent,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useSystemConfig } from "@/hooks/useSystemConfig";

interface Campo {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "date";
  options?: string[];
  required: boolean;
}

interface ServicioPlantilla {
  id: string;
  label: string;
  precio: number;
  categoria: string;
}

interface Plantilla {
  id: string;
  nombre: string;
  tipo: string;
  campos: Campo[];
  servicios: ServicioPlantilla[];
}

type GrupoServicio = "Contabilidad" | "Trámites" | "Auditoría y Control Interno";

interface Cliente {
  id: string;
  razon_social: string;
  codigo: string;
  direccion: string | null;
  email: string | null;
  telefono: string | null;
  tipo_cliente: string;
  nombre_persona_natural: string | null;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  contacto_email: string | null;
  actividad_economica: string | null;
  usuario_sunat: string | null;
  clave_sunat: string | null;
  regimen_tributario: string | null;
  regimen_laboral: string | null;
}

interface ProformaItem {
  id?: string;
  descripcion: string;
  cantidad: number;
  base_imponible?: number;
  igv_monto?: number;
  precio_unitario: number;
  subtotal: number;
}

interface Proforma {
  id: string;
  numero: string;
  tipo: string;
  subtotal: number;
  igv: number;
  total: number;
  status: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  notas: string | null;
  moneda: string;
  cliente_id: string;
  campos_personalizados?: Record<string, string> | null;
}

interface ProformaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tipo: GrupoServicio;
  plantillaId?: string | null;
  mode: "create" | "edit";
  proforma?: Proforma | null;
  initialItems?: ProformaItem[];
}

export function ProformaForm({
  open,
  onOpenChange,
  onSuccess,
  tipo,
  plantillaId,
  mode,
  proforma,
  initialItems = [],
}: ProformaFormProps) {
  const { config, calculateIGV, formatCurrency, deduceIGVFromTotal } = useSystemConfig();
  
  const createEmptyItem = (): ProformaItem => ({
    descripcion: "",
    cantidad: 1,
    base_imponible: 0,
    igv_monto: 0,
    precio_unitario: 0,
    subtotal: 0,
  });

  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [selectedPlantilla, setSelectedPlantilla] = useState<Plantilla | null>(null);
  const [camposValues, setCamposValues] = useState<Record<string, string>>({});
  const [activeCampos, setActiveCampos] = useState<string[]>([]);
  const [items, setItems] = useState<ProformaItem[]>([createEmptyItem()]);
  const [notas, setNotas] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [openServicePopovers, setOpenServicePopovers] = useState<Record<number, boolean>>({});
  const [clienteSearch, setClienteSearch] = useState("");
  const [openClientePopover, setOpenClientePopover] = useState(false);
  const [showClienteDetails, setShowClienteDetails] = useState(true);
  const [showClaveSol, setShowClaveSol] = useState(false);
  const [openAddCampoPopover, setOpenAddCampoPopover] = useState(false);
  const [showCalendarProjection, setShowCalendarProjection] = useState(false);
  const [calendarProjection, setCalendarProjection] = useState<ServiceProjection[]>([]);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleItem[]>([]);

  // Fetch dynamic statuses
  const { data: estados = [] } = useQuery({
    queryKey: ["proforma-estados-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proforma_estados")
        .select("*")
        .eq("activo", true)
        .order("orden");
      if (error) throw error;
      return data;
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

  // Set default expiration date on open
  useEffect(() => {
    if (open) {
      fetchData();
      
      // Set default expiration date if creating new
      if (mode === "create" && !fechaVencimiento) {
        const defaultExpiration = addDays(new Date(), config.proforma_expiration_days);
        setFechaVencimiento(format(defaultExpiration, "yyyy-MM-dd"));
      }
      
      // If editing, load proforma data
      if (mode === "edit" && proforma) {
        setSelectedCliente(proforma.cliente_id);
        setNotas(proforma.notas || "");
        setFechaVencimiento(proforma.fecha_vencimiento);
        setCamposValues((proforma.campos_personalizados as Record<string, string>) || {});
        // Convert initialItems to include base_imponible and igv_monto
        const convertedItems = initialItems.length > 0 
          ? initialItems.map(item => ({
              ...item,
              base_imponible: item.base_imponible ?? item.precio_unitario / (1 + config.igv_percentage / 100),
              igv_monto: item.igv_monto ?? item.precio_unitario - (item.precio_unitario / (1 + config.igv_percentage / 100)),
            }))
          : [createEmptyItem()];
        setItems(convertedItems);
      }
    }
  }, [open, tipo, plantillaId, mode, proforma, initialItems, config.proforma_expiration_days]);

  const fetchData = async () => {
    const { data: clientesData } = await supabase
      .from("clientes")
      .select("id, razon_social, codigo, direccion, email, telefono, tipo_cliente, nombre_persona_natural, contacto_nombre, contacto_telefono, contacto_email, actividad_economica, usuario_sunat, clave_sunat, regimen_tributario, regimen_laboral")
      .eq("activo", true)
      .order("razon_social");

    if (clientesData) {
      setClientes(clientesData);
      
      // If editing, set the client search text
      if (mode === "edit" && proforma) {
        const cliente = clientesData.find(c => c.id === proforma.cliente_id);
        if (cliente) {
          setClienteSearch(`${getClienteDisplayName(cliente)} - ${cliente.codigo}`);
        }
      }
    }

    const { data: plantillasData } = await supabase
      .from("proforma_plantillas")
      .select("*")
      .eq("tipo", tipo as any)
      .eq("activa", true);

    if (plantillasData) {
      const parsed = plantillasData.map((p) => ({
        ...p,
        tipo: p.tipo as string,
        campos: (Array.isArray(p.campos) ? p.campos : []) as unknown as Campo[],
        servicios: (Array.isArray(p.servicios) ? p.servicios : []) as unknown as ServicioPlantilla[],
      }));
      setPlantillas(parsed);
      
      const targetPlantilla = plantillaId 
        ? parsed.find(p => p.id === plantillaId) 
        : parsed[0];
      
      if (targetPlantilla) {
        setSelectedPlantilla(targetPlantilla);
        if (mode === "create") {
          setActiveCampos(targetPlantilla.campos.map((c) => c.id));
        }
      }
    }
  };

  const handlePlantillaChange = (plantillaId: string) => {
    const plantilla = plantillas.find((p) => p.id === plantillaId);
    setSelectedPlantilla(plantilla || null);
    setCamposValues({});
    if (plantilla) {
      setActiveCampos(plantilla.campos.map((c) => c.id));
    } else {
      setActiveCampos([]);
    }
  };

  const handleCampoChange = (campoId: string, value: string) => {
    setCamposValues((prev) => ({ ...prev, [campoId]: value }));
  };

  const handleRemoveCampo = (campoId: string) => {
    setActiveCampos((prev) => prev.filter((id) => id !== campoId));
    setCamposValues((prev) => {
      const newValues = { ...prev };
      delete newValues[campoId];
      return newValues;
    });
  };

  const handleAddCampo = (campoId: string) => {
    if (!activeCampos.includes(campoId)) {
      setActiveCampos((prev) => [...prev, campoId]);
    }
    setOpenAddCampoPopover(false);
  };

  const availableCampos = useMemo(() => {
    if (!selectedPlantilla) return [];
    return selectedPlantilla.campos.filter((campo) => !activeCampos.includes(campo.id));
  }, [selectedPlantilla, activeCampos]);

  const activeCampoObjects = useMemo(() => {
    if (!selectedPlantilla) return [];
    return activeCampos
      .map((id) => selectedPlantilla.campos.find((c) => c.id === id))
      .filter((c): c is Campo => c !== undefined);
  }, [selectedPlantilla, activeCampos]);

  const plantillaServicios = useMemo(() => {
    if (!selectedPlantilla) return [];
    return selectedPlantilla.servicios;
  }, [selectedPlantilla]);

  const handleItemChange = (
    index: number,
    field: keyof ProformaItem,
    value: string | number
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === "cantidad" || field === "precio_unitario") {
      newItems[index].subtotal =
        Number(newItems[index].cantidad) * Number(newItems[index].precio_unitario);
    }
    
    setItems(newItems);
    
    // Limpiar proyección de calendario cuando cambian los servicios
    if (field === "descripcion" || field === "precio_unitario" || field === "cantidad") {
      setCalendarProjection([]);
      setPaymentSchedule([]);
    }
  };

  const handleSelectService = (index: number, service: ServicioPlantilla) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      descripcion: service.label,
      precio_unitario: service.precio,
      subtotal: Number(newItems[index].cantidad) * service.precio,
    };
    setItems(newItems);
    setOpenServicePopovers((prev) => ({ ...prev, [index]: false }));
    
    // Limpiar proyección de calendario cuando cambia el servicio
    setCalendarProjection([]);
    setPaymentSchedule([]);
  };

  const addItem = () => {
    setItems([...items, createEmptyItem()]);
    // Limpiar proyección cuando se agrega un nuevo item
    setCalendarProjection([]);
    setPaymentSchedule([]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
      // Limpiar proyección cuando se elimina un item
      setCalendarProjection([]);
      setPaymentSchedule([]);
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
    const igv = subtotal * 0.18;
    const total = subtotal + igv;
    return { subtotal, igv, total };
  };

  const generateProformaNumber = () => {
    let prefix = "PC";
    if (tipo === "Trámites") prefix = "PT";
    else if (tipo === "Auditoría y Control Interno") prefix = "PA";
    const date = new Date();
    const year = date.getFullYear();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `${prefix}-${year}-${random}`;
  };

  const handleSave = async (asDraft: boolean = false) => {
    if (!selectedCliente) {
      toast.error("Seleccione un cliente");
      return;
    }

    if (!fechaVencimiento) {
      toast.error("Ingrese la fecha de vencimiento");
      return;
    }

    if (selectedPlantilla && !asDraft) {
      for (const campo of activeCampoObjects) {
        if (campo.required && !camposValues[campo.id]) {
          toast.error(`El campo "${campo.label}" es requerido`);
          return;
        }
      }
    }

    const validItems = items.filter((item) => item.descripcion.trim() !== "");
    if (validItems.length === 0) {
      toast.error("Agregue al menos un servicio");
      return;
    }

    if (asDraft) {
      setSavingDraft(true);
    } else {
      setLoading(true);
    }

    const { subtotal, igv, total } = calculateTotals();
    const status = asDraft ? "borrador" : "enviada";

    try {
      // Serialize dates for JSON storage
      const serializableProjection = calendarProjection.map(p => ({
        ...p,
        fechaInicio: p.fechaInicio?.toISOString() || null,
        fechaTermino: p.fechaTermino?.toISOString() || null,
      }));
      const serializableSchedule = paymentSchedule.map(s => ({
        ...s,
        fecha: s.fecha instanceof Date ? s.fecha.toISOString() : s.fecha,
      }));

      if (mode === "create") {
        const { data: newProforma, error: proformaError } = await supabase
          .from("proformas")
          .insert({
            numero: generateProformaNumber(),
            cliente_id: selectedCliente,
            tipo: tipo as any,
            fecha_vencimiento: fechaVencimiento,
            subtotal,
            igv,
            total,
            notas,
            campos_personalizados: {
              ...camposValues,
              calendar_projection: serializableProjection,
              payment_schedule: serializableSchedule,
            } as any,
            status,
          })
          .select()
          .single();

        if (proformaError) throw proformaError;

        const proformaItems = validItems.map((item) => ({
          proforma_id: newProforma.id,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
        }));

        const { error: itemsError } = await supabase
          .from("proforma_items")
          .insert(proformaItems);

        if (itemsError) throw itemsError;

        toast.success(asDraft ? "Borrador guardado correctamente" : "Proforma creada correctamente");
      } else {
        // Edit mode
        const { error: proformaError } = await supabase
          .from("proformas")
          .update({
            fecha_vencimiento: fechaVencimiento,
            subtotal,
            igv,
            total,
            notas,
            campos_personalizados: {
              ...camposValues,
              calendar_projection: serializableProjection,
              payment_schedule: serializableSchedule,
            } as any,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", proforma!.id);

        if (proformaError) throw proformaError;

        // Delete existing items
        await supabase.from("proforma_items").delete().eq("proforma_id", proforma!.id);

        // Insert new items
        const proformaItems = validItems.map((item) => ({
          proforma_id: proforma!.id,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
        }));

        const { error: itemsError } = await supabase
          .from("proforma_items")
          .insert(proformaItems);

        if (itemsError) throw itemsError;

        toast.success("Proforma actualizada correctamente");
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving proforma:", error);
      toast.error("Error al guardar la proforma");
    } finally {
      setLoading(false);
      setSavingDraft(false);
    }
  };

  const resetForm = () => {
    setSelectedCliente("");
    setClienteSearch("");
    setCamposValues({});
    setActiveCampos([]);
    setItems([createEmptyItem()]);
    setNotas("");
    setFechaVencimiento("");
    setCalendarProjection([]);
    setPaymentSchedule([]);
  };

  const handleSaveCalendarProjection = (projection: ServiceProjection[], schedule: PaymentScheduleItem[]) => {
    setCalendarProjection(projection);
    setPaymentSchedule(schedule);
  };

  const filteredClientes = useMemo(() => {
    if (!clienteSearch.trim()) return clientes;
    const searchLower = clienteSearch.toLowerCase();
    return clientes.filter((cliente) => {
      const nombre = cliente.tipo_cliente === "persona_natural" 
        ? cliente.nombre_persona_natural || cliente.razon_social
        : cliente.razon_social;
      return (
        nombre.toLowerCase().includes(searchLower) ||
        cliente.codigo.toLowerCase().includes(searchLower)
      );
    });
  }, [clientes, clienteSearch]);

  const getClienteDisplayName = (cliente: Cliente) => {
    if (cliente.tipo_cliente === "persona_natural") {
      return cliente.nombre_persona_natural || cliente.razon_social;
    }
    return cliente.razon_social;
  };

  const handleSelectCliente = (clienteId: string) => {
    setSelectedCliente(clienteId);
    const cliente = clientes.find((c) => c.id === clienteId);
    if (cliente) {
      setClienteSearch(`${getClienteDisplayName(cliente)} - ${cliente.codigo}`);
    }
    setOpenClientePopover(false);
    setShowClienteDetails(true);
  };

  const selectedClienteData = clientes.find((c) => c.id === selectedCliente);
  const { subtotal, igv, total } = calculateTotals();

  // Corporate color styles
  const sectionStyles = {
    cliente: "border-l-4 border-l-[#CA9348] bg-[#CA9348]/5",
    campos: "border-l-4 border-l-[#E3AE98] bg-[#E3AE98]/5",
    servicios: "border-l-4 border-l-[#D91A22] bg-[#D91A22]/5",
    totales: "border-l-4 border-l-[#B4B4B4] bg-[#B4B4B4]/10",
    calendario: "border-l-4 border-l-[#CA9348] bg-[#CA9348]/5",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#D91A22]" />
            {mode === "create" ? `Nueva Proforma de ${tipo}` : `Editar Proforma ${proforma?.numero}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Datos del cliente */}
          <div className={cn("rounded-lg p-4 space-y-4", sectionStyles.cliente)}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-[#CA9348]" />
                Datos del Cliente
              </h3>
              {selectedClienteData && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowClienteDetails(!showClienteDetails)}
                  className="gap-1 text-muted-foreground"
                >
                  {showClienteDetails ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Ocultar detalles
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Mostrar detalles
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Buscar cliente por RUC/DNI o Nombre</Label>
              <Popover open={openClientePopover} onOpenChange={setOpenClientePopover}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Escriba RUC, DNI o nombre del cliente..."
                      value={clienteSearch}
                      onChange={(e) => {
                        setClienteSearch(e.target.value);
                        setOpenClientePopover(true);
                        if (!e.target.value.trim()) {
                          setSelectedCliente("");
                        }
                      }}
                      onFocus={() => setOpenClientePopover(true)}
                      className="pl-9 bg-white"
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 w-[var(--radix-popover-trigger-width)]"
                  align="start"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>No se encontraron clientes</CommandEmpty>
                      <CommandGroup heading="Clientes">
                        {filteredClientes.slice(0, 10).map((cliente) => (
                          <CommandItem
                            key={cliente.id}
                            onSelect={() => handleSelectCliente(cliente.id)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2 w-full">
                              {cliente.tipo_cliente === "persona_natural" ? (
                                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {getClienteDisplayName(cliente)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {cliente.codigo}
                                </p>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedClienteData && showClienteDetails && (
              <div className="bg-white/80 rounded-lg p-4 space-y-4 animate-in slide-in-from-top-2 duration-200 border">
                <div className="flex items-center gap-2 pb-2 border-b">
                  {selectedClienteData.tipo_cliente === "persona_natural" ? (
                    <User className="h-5 w-5 text-[#CA9348]" />
                  ) : (
                    <Building2 className="h-5 w-5 text-[#CA9348]" />
                  )}
                  <span className="font-semibold text-lg">
                    {getClienteDisplayName(selectedClienteData)}
                  </span>
                  <span className="text-xs bg-[#CA9348]/20 text-[#CA9348] px-2 py-0.5 rounded-full">
                    {selectedClienteData.tipo_cliente === "persona_natural" ? "Persona Natural" : "Empresa"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">RUC/DNI</Label>
                    <p className="font-medium">{selectedClienteData.codigo}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Dirección</Label>
                    <p className="font-medium text-sm">{selectedClienteData.direccion || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Email</Label>
                    <p className="font-medium">{selectedClienteData.email || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Teléfono</Label>
                    <p className="font-medium">{selectedClienteData.telefono || "-"}</p>
                  </div>
                  {selectedClienteData.contacto_nombre && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Contacto</Label>
                      <p className="font-medium">{selectedClienteData.contacto_nombre}</p>
                      {selectedClienteData.contacto_telefono && (
                        <p className="text-xs text-muted-foreground">{selectedClienteData.contacto_telefono}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground text-xs">Actividad Económica</Label>
                    <p className="font-medium text-sm">{selectedClienteData.actividad_economica || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Régimen Tributario</Label>
                    <p className="font-medium text-sm">{selectedClienteData.regimen_tributario || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Régimen Laboral</Label>
                    <p className="font-medium text-sm">{selectedClienteData.regimen_laboral || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Usuario SUNAT</Label>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{selectedClienteData.usuario_sunat || "-"}</p>
                      {selectedClienteData.usuario_sunat && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(selectedClienteData.usuario_sunat!, "Usuario SUNAT")}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Clave SOL</Label>
                    <div className="flex items-center gap-2">
                      <p className="font-medium font-mono">
                        {selectedClienteData.clave_sunat 
                          ? (showClaveSol ? selectedClienteData.clave_sunat : "••••••••")
                          : "-"
                        }
                      </p>
                      {selectedClienteData.clave_sunat && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setShowClaveSol(!showClaveSol)}
                          >
                            {showClaveSol ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(selectedClienteData.clave_sunat!, "Clave SOL")}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Plantilla y Campos Específicos - Solo mostrar si la plantilla tiene campos */}
          {selectedPlantilla && selectedPlantilla.campos && selectedPlantilla.campos.length > 0 && (
            <div className={cn("rounded-lg p-4 space-y-4", sectionStyles.campos)}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#E3AE98]" />
                  Campos Específicos
                  {selectedPlantilla && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      — {selectedPlantilla.nombre}
                    </span>
                  )}
                </h3>
              </div>

              {availableCampos.length > 0 && (
                <Popover open={openAddCampoPopover} onOpenChange={setOpenAddCampoPopover}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Agregar campo
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[300px]" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar campo..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>No hay campos disponibles</CommandEmpty>
                        <CommandGroup heading="Campos disponibles">
                          {availableCampos.map((campo) => (
                            <CommandItem
                              key={campo.id}
                              onSelect={() => handleAddCampo(campo.id)}
                              className="cursor-pointer"
                            >
                              {campo.label}
                              {campo.required && <span className="text-destructive ml-1">*</span>}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}

              {activeCampoObjects.length > 0 && (
                <div className="border rounded-md overflow-hidden bg-white">
                  <table className="w-full">
                    <tbody className="divide-y divide-border">
                      {activeCampoObjects.map((campo) => (
                        <tr key={campo.id} className="hover:bg-muted/50">
                          <td className="px-3 py-2 w-1/3">
                            <Label className="text-sm font-medium">
                              {campo.label}
                              {campo.required && <span className="text-destructive ml-1">*</span>}
                            </Label>
                          </td>
                          <td className="px-3 py-2">
                            {campo.type === "select" ? (
                              <Select
                                value={camposValues[campo.id] || ""}
                                onValueChange={(v) => handleCampoChange(campo.id, v)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {campo.options?.map((opt) => (
                                    <SelectItem key={opt} value={opt}>
                                      {opt}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : campo.type === "textarea" ? (
                              <Textarea
                                value={camposValues[campo.id] || ""}
                                onChange={(e) => handleCampoChange(campo.id, e.target.value)}
                                className="min-h-[32px] resize-none"
                                rows={1}
                              />
                            ) : (
                              <Input
                                type={campo.type}
                                value={camposValues[campo.id] || ""}
                                onChange={(e) => handleCampoChange(campo.id, e.target.value)}
                                className="h-8"
                              />
                            )}
                          </td>
                          <td className="px-2 py-2 w-10">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveCampo(campo.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeCampoObjects.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay campos activos. Use el botón "Agregar campo" para añadir campos.
                </p>
              )}
            </div>
          )}

          {/* Items / Servicios */}
          <div className={cn("rounded-lg p-4 space-y-4", sectionStyles.servicios)}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#D91A22]" />
                Servicios
              </h3>
              <Button onClick={addItem} size="sm" variant="outline" className="gap-2 bg-white">
                <Plus className="h-4 w-4" />
                Agregar servicio
              </Button>
            </div>

            {plantillaServicios.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Esta plantilla no tiene servicios configurados. Puede escribir los servicios manualmente.
              </p>
            )}

            <div className="space-y-3">
              <div className="hidden lg:grid lg:grid-cols-12 gap-3 text-xs font-medium text-muted-foreground px-1">
                <div className="col-span-6">Descripción del servicio</div>
                <div className="col-span-1 text-center">Cant.</div>
                <div className="col-span-2 text-center">Precio</div>
                <div className="col-span-2 text-center">Subtotal</div>
                <div className="col-span-1"></div>
              </div>

              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                  <div className="lg:col-span-6">
                    <Popover
                      open={openServicePopovers[index] || false}
                      onOpenChange={(isOpen) =>
                        setOpenServicePopovers((prev) => ({ ...prev, [index]: isOpen }))
                      }
                    >
                      <PopoverTrigger asChild>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder={plantillaServicios.length > 0 ? "Buscar en servicios de la plantilla..." : "Escribir servicio..."}
                            value={item.descripcion}
                            onChange={(e) => {
                              handleItemChange(index, "descripcion", e.target.value);
                              if (plantillaServicios.length > 0) {
                                setOpenServicePopovers((prev) => ({ ...prev, [index]: true }));
                              }
                            }}
                            onFocus={() => {
                              if (plantillaServicios.length > 0) {
                                setOpenServicePopovers((prev) => ({ ...prev, [index]: true }));
                              }
                            }}
                            className="pl-9 bg-white"
                          />
                        </div>
                      </PopoverTrigger>
                      {plantillaServicios.length > 0 && (
                        <PopoverContent 
                          className="p-0 w-[var(--radix-popover-trigger-width)]" 
                          align="start"
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          <Command>
                            <CommandInput placeholder="Buscar servicio..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>No se encontraron servicios</CommandEmpty>
                              <CommandGroup heading="Servicios de la plantilla">
                                {plantillaServicios
                                  .filter((s) =>
                                    s.label.toLowerCase().includes(item.descripcion.toLowerCase())
                                  )
                                  .map((service) => (
                                    <CommandItem
                                      key={service.id}
                                      onSelect={() => handleSelectService(index, service)}
                                      className="cursor-pointer"
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <span>{service.label}</span>
                                        <span className="text-xs text-muted-foreground">
                                          S/ {service.precio.toLocaleString()}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      )}
                    </Popover>
                  </div>
                  <div className="lg:col-span-1">
                    <Input
                      type="number"
                      placeholder="Cant."
                      value={item.cantidad}
                      onChange={(e) => handleItemChange(index, "cantidad", Number(e.target.value))}
                      min={1}
                      className="text-center bg-white"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Input
                      type="number"
                      placeholder="Precio"
                      value={item.precio_unitario}
                      onChange={(e) =>
                        handleItemChange(index, "precio_unitario", Number(e.target.value))
                      }
                      min={0}
                      step="0.01"
                      className="text-center bg-white"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Input
                      type="number"
                      value={item.subtotal.toFixed(2)}
                      readOnly
                      className="text-center bg-muted/50"
                    />
                  </div>
                  <div className="lg:col-span-1 flex justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Schedule Summary */}
          {paymentSchedule.length > 0 && (
            <div className={cn("rounded-lg p-4 space-y-4", sectionStyles.calendario)}>
              <h3 className="font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#CA9348]" />
                Resumen de Proyección de Calendario
              </h3>
              <div className="border rounded-lg overflow-hidden bg-white">
                <div className="overflow-auto max-h-[200px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[60px]">Cuota</TableHead>
                        <TableHead className="w-[120px]">Fecha Pago</TableHead>
                        <TableHead>Servicio</TableHead>
                        <TableHead className="w-[120px]">Doc. Pago</TableHead>
                        <TableHead className="w-[100px]">Método</TableHead>
                        <TableHead className="w-[100px] text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentSchedule.map((item, idx) => (
                        <TableRow key={`${item.servicioId}-${item.cuota}-${idx}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2.5 h-2.5 rounded-full", item.color)} />
                              {item.cuota}
                            </div>
                          </TableCell>
                          <TableCell>{format(new Date(item.fecha), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={item.servicio}>
                            {item.servicio}
                          </TableCell>
                          <TableCell>{item.documentoPago}</TableCell>
                          <TableCell>{item.metodoPago}</TableCell>
                          <TableCell className="text-right font-medium">S/ {item.monto.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="border-t bg-muted/30 p-3 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Total de cuotas: {paymentSchedule.length}
                  </span>
                  <span className="font-bold">
                    Total: S/ {paymentSchedule.reduce((sum, p) => sum + p.monto, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Totales y Fecha */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Fecha de Vencimiento</Label>
                <Input
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  className="mt-1 bg-white"
                />
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas adicionales..."
                  className="mt-1 bg-white"
                  rows={3}
                />
              </div>
            </div>

            <div className={cn("rounded-lg p-4 space-y-3", sectionStyles.totales)}>
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">S/ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>IGV (18%):</span>
                <span className="font-medium">S/ {igv.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>Total:</span>
                <span className="text-[#D91A22]">S/ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCalendarProjection(true)}
              disabled={items.filter(i => i.descripcion.trim() !== "").length === 0}
              className="gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              Proyección de Calendario
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              {mode === "create" && (
                <Button 
                  variant="secondary"
                  onClick={() => handleSave(true)} 
                  disabled={loading || savingDraft}
                  className="gap-2"
                >
                  {savingDraft ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Guardar Borrador
                </Button>
              )}
              <Button 
                onClick={() => handleSave(false)} 
                disabled={loading || savingDraft}
                className="gap-2 bg-[#D91A22] hover:bg-[#D91A22]/90"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar Cambios
              </Button>
            </div>
          </div>
        </div>

        <CalendarProjectionModal
          open={showCalendarProjection}
          onOpenChange={setShowCalendarProjection}
          items={items}
          onSave={handleSaveCalendarProjection}
          initialProjection={calendarProjection}
        />
      </DialogContent>
    </Dialog>
  );
}

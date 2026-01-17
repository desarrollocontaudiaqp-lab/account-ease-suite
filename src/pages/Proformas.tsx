import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Eye, Download, Send, MoreHorizontal, FileText, Calculator, LayoutGrid, List, Palette, FileSpreadsheet, Loader2, FileCheck, Pencil, Ban, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ProformaDesigner } from "@/components/proformas/ProformaDesigner";
import { ProformaForm } from "@/components/proformas/ProformaForm";
import { ProformaDetailModal } from "@/components/proformas/ProformaDetailModal";
import { SendEmailDialog } from "@/components/proformas/SendEmailDialog";
import { ServiceFilterDropdown } from "@/components/proformas/ServiceFilterDropdown";
import { generateProformaPDF, downloadPDF } from "@/lib/generateProformaPDF";
import { getPDFStylesForType } from "@/hooks/usePDFStyles";
import { toast } from "sonner";

type GrupoServicio = "Contabilidad" | "Trámites" | "Auditoría y Control Interno";

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
  cliente_id: string;
  tipo: string;
  subtotal: number;
  igv: number;
  total: number;
  status: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  notas: string | null;
  moneda: string;
  campos_personalizados?: Record<string, any> | null;
  incluir_proyeccion_pdf?: boolean;
}

interface ProformaItem {
  id: string;
  descripcion: string;
  cantidad: number;
  base_imponible?: number;
  igv_monto?: number;
  precio_unitario: number;
  subtotal: number;
}

interface ProformaWithItems extends Proforma {
  items?: ProformaItem[];
}

interface ProformaEstado {
  id: string;
  nombre: string;
  nombre_display: string;
  color: string;
  orden: number;
  activo: boolean;
}

const typeStyles: Record<string, string> = {
  "Contabilidad": "bg-primary/10 text-primary",
  "Trámites": "bg-secondary/20 text-secondary-foreground",
  "Auditoría y Control Interno": "bg-purple-100 text-purple-700",
  // Legacy support
  contabilidad: "bg-primary/10 text-primary",
  tramites: "bg-secondary/20 text-secondary-foreground",
};

const typeLabels: Record<string, string> = {
  "Contabilidad": "Contabilidad",
  "Trámites": "Trámites",
  "Auditoría y Control Interno": "Auditoría",
  // Legacy support
  contabilidad: "Contabilidad",
  tramites: "Trámites",
};

const Proformas = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"todas" | GrupoServicio>("todas");
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  const [proformas, setProformas] = useState<ProformaWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogType, setCreateDialogType] = useState<GrupoServicio>("Contabilidad");
  const [selectedPlantillaId, setSelectedPlantillaId] = useState<string | null>(null);
  
  // Fetch plantillas for the dropdown
  const { data: plantillas = [] } = useQuery({
    queryKey: ["proforma-plantillas-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proforma_plantillas")
        .select("id, nombre, tipo")
        .eq("activa", true)
        .order("nombre");
      if (error) throw error;
      return data as { id: string; nombre: string; tipo: string }[];
    },
  });
  
  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProforma, setSelectedProforma] = useState<Proforma | null>(null);
  const [selectedProformaItems, setSelectedProformaItems] = useState<ProformaItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  
  // Email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailProforma, setEmailProforma] = useState<Proforma | null>(null);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editProforma, setEditProforma] = useState<Proforma | null>(null);
  const [editProformaItems, setEditProformaItems] = useState<ProformaItem[]>([]);
  
  // Service filter state
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  // Anular/Eliminar states
  const [anularDialogOpen, setAnularDialogOpen] = useState(false);
  const [eliminarDialogOpen, setEliminarDialogOpen] = useState(false);
  const [actionProforma, setActionProforma] = useState<Proforma | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch dynamic statuses
  const { data: estados = [] } = useQuery({
    queryKey: ["proforma-estados-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proforma_estados")
        .select("*")
        .order("orden");
      if (error) throw error;
      return data as ProformaEstado[];
    },
  });

  // Helper functions for dynamic status display
  const getStatusStyle = (statusName: string) => {
    const estado = estados.find((e) => e.nombre === statusName);
    if (!estado) return "bg-gray-100 text-gray-800 border-gray-200";
    return `border-[${estado.color}]/30`;
  };

  const getStatusLabel = (statusName: string) => {
    const estado = estados.find((e) => e.nombre === statusName);
    return estado?.nombre_display || statusName;
  };

  const getStatusColor = (statusName: string) => {
    const estado = estados.find((e) => e.nombre === statusName);
    return estado?.color || "#6B7280";
  };

  useEffect(() => {
    fetchProformas();
  }, []);

  const fetchProformas = async () => {
    setLoading(true);
    
    // Fetch proformas with items for filtering
    const { data, error } = await supabase
      .from("proformas")
      .select(`
        id,
        numero,
        tipo,
        subtotal,
        igv,
        total,
        status,
        fecha_emision,
        fecha_vencimiento,
        notas,
        moneda,
        cliente_id,
        campos_personalizados,
        incluir_proyeccion_pdf,
        cliente:clientes(razon_social, codigo, direccion, email, telefono)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching proformas:", error);
    } else {
      // Fetch items for all proformas to enable filtering
      const proformaIds = (data || []).map(p => p.id);
      const { data: allItems } = await supabase
        .from("proforma_items")
        .select("*")
        .in("proforma_id", proformaIds);
      
      const itemsByProforma = (allItems || []).reduce((acc, item) => {
        if (!acc[item.proforma_id]) acc[item.proforma_id] = [];
        acc[item.proforma_id].push(item);
        return acc;
      }, {} as Record<string, ProformaItem[]>);
      
      const parsed = (data || []).map((p) => ({
        ...p,
        tipo: p.tipo as string,
        status: p.status as Proforma["status"],
        cliente: p.cliente as Proforma["cliente"],
        cliente_id: p.cliente_id as string,
        campos_personalizados: p.campos_personalizados as Record<string, any> | null,
        items: itemsByProforma[p.id] || [],
      }));
      setProformas(parsed);
    }
    setLoading(false);
  };

  const fetchProformaItems = async (proformaId: string) => {
    const { data, error } = await supabase
      .from("proforma_items")
      .select("*")
      .eq("proforma_id", proformaId);
    
    if (error) {
      console.error("Error fetching items:", error);
      return [];
    }
    return data || [];
  };

  const handleViewDetail = async (proforma: Proforma) => {
    setSelectedProforma(proforma);
    setDetailModalOpen(true);
    setLoadingItems(true);
    
    const items = await fetchProformaItems(proforma.id);
    setSelectedProformaItems(items);
    setLoadingItems(false);
  };

  const handleEdit = async (proforma: Proforma) => {
    setEditProforma(proforma);
    const items = await fetchProformaItems(proforma.id);
    setEditProformaItems(items);
    setEditDialogOpen(true);
  };

  const handleSendEmail = (proforma: Proforma) => {
    setEmailProforma(proforma);
    setEmailDialogOpen(true);
  };

  const handleDownloadPDF = async (proforma: Proforma) => {
    if (!proforma.cliente) {
      toast.error("No se puede generar PDF sin datos del cliente");
      return;
    }

    setDownloadingId(proforma.id);
    
    try {
      const items = await fetchProformaItems(proforma.id);
      
      // Load PDF styles for this proforma type from database
      const pdfStyles = await getPDFStylesForType(proforma.tipo);

      // Prepare calendar projection data if enabled
      let calendarProjectionData: { numero: number; fecha_pago: string; servicio: string; monto: number }[] | undefined;
      
      if (proforma.incluir_proyeccion_pdf && proforma.campos_personalizados?.payment_schedule) {
        const schedule = proforma.campos_personalizados.payment_schedule as any[];
        calendarProjectionData = schedule.map((s: any) => ({
          numero: s.cuota,
          fecha_pago: typeof s.fecha === 'string' ? s.fecha : new Date(s.fecha).toISOString(),
          servicio: s.servicio,
          monto: s.monto,
        }));
      }

      const pdfBlob = await generateProformaPDF({
        numero: proforma.numero,
        tipo: proforma.tipo,
        fecha_emision: proforma.fecha_emision,
        fecha_vencimiento: proforma.fecha_vencimiento,
        cliente: {
          razon_social: proforma.cliente.razon_social,
          codigo: proforma.cliente.codigo,
          direccion: proforma.cliente.direccion,
          email: proforma.cliente.email,
          telefono: proforma.cliente.telefono,
        },
        items: items.map(item => ({
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
        })),
        subtotal: proforma.subtotal,
        igv: proforma.igv,
        total: proforma.total,
        notas: proforma.notas,
        moneda: proforma.moneda,
        calendarProjection: calendarProjectionData,
      }, pdfStyles);

      downloadPDF(pdfBlob, `Proforma_${proforma.numero}.pdf`);
      toast.success("PDF descargado correctamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleConfirmContract = (proforma: Proforma) => {
    navigate("/contratos", {
      state: {
        fromProforma: true,
        proformaId: proforma.id,
        proformaNumero: proforma.numero,
        clienteId: proforma.cliente ? undefined : undefined,
        clienteNombre: proforma.cliente?.razon_social,
        tipo: proforma.tipo,
        total: proforma.total,
        moneda: proforma.moneda,
      }
    });
    toast.info(`Creando contrato desde proforma ${proforma.numero}`);
  };

  const handleOpenCreateDialog = (plantillaId: string, tipo: string) => {
    setSelectedPlantillaId(plantillaId);
    setCreateDialogType(tipo as GrupoServicio);
    setCreateDialogOpen(true);
  };

  const handleAnular = (proforma: Proforma) => {
    setActionProforma(proforma);
    setAnularDialogOpen(true);
  };

  const handleEliminar = (proforma: Proforma) => {
    setActionProforma(proforma);
    setEliminarDialogOpen(true);
  };

  const confirmAnular = async () => {
    if (!actionProforma) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("proformas")
        .update({ 
          status: "rechazada" as any,
          updated_at: new Date().toISOString()
        })
        .eq("id", actionProforma.id);

      if (error) throw error;

      toast.success(`Proforma ${actionProforma.numero} anulada correctamente`);
      fetchProformas();
    } catch (error: any) {
      console.error("Error anulando proforma:", error);
      toast.error("Error al anular la proforma");
    } finally {
      setActionLoading(false);
      setAnularDialogOpen(false);
      setActionProforma(null);
    }
  };

  const confirmEliminar = async () => {
    if (!actionProforma) return;
    
    setActionLoading(true);
    try {
      // First delete proforma items
      const { error: itemsError } = await supabase
        .from("proforma_items")
        .delete()
        .eq("proforma_id", actionProforma.id);

      if (itemsError) throw itemsError;

      // Then delete the proforma
      const { error: proformaError } = await supabase
        .from("proformas")
        .delete()
        .eq("id", actionProforma.id);

      if (proformaError) throw proformaError;

      toast.success(`Proforma ${actionProforma.numero} eliminada correctamente`);
      fetchProformas();
    } catch (error: any) {
      console.error("Error eliminando proforma:", error);
      toast.error("Error al eliminar la proforma");
    } finally {
      setActionLoading(false);
      setEliminarDialogOpen(false);
      setActionProforma(null);
    }
  };

  // Filter proformas with dynamic search and service filter
  const filteredProformas = useMemo(() => {
    return proformas.filter((proforma) => {
      // Search filter - by client name, proforma number, or item descriptions
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === "" ||
        proforma.numero.toLowerCase().includes(searchLower) ||
        proforma.cliente?.razon_social.toLowerCase().includes(searchLower) ||
        proforma.items?.some(item => 
          item.descripcion.toLowerCase().includes(searchLower)
        );
      
      // Tab filter by grupo_servicio
      const matchesTab = 
        activeTab === "todas" ||
        proforma.tipo === activeTab ||
        // Legacy support for old lowercase values
        (activeTab === "Contabilidad" && proforma.tipo === "contabilidad") ||
        (activeTab === "Trámites" && proforma.tipo === "tramites");
      
      // Service filter - check if any selected service matches any item description
      const matchesService = selectedServices.length === 0 ||
        proforma.items?.some(item =>
          selectedServices.some(service =>
            item.descripcion.toLowerCase().includes(service.toLowerCase())
          )
        );
      
      return matchesSearch && matchesTab && matchesService;
    });
  }, [proformas, searchTerm, activeTab, selectedServices]);
  
  // Count proformas by group
  const countByGroup = useMemo(() => {
    return {
      contabilidad: proformas.filter(p => p.tipo === "Contabilidad" || p.tipo === "contabilidad").length,
      tramites: proformas.filter(p => p.tipo === "Trámites" || p.tipo === "tramites").length,
      auditoria: proformas.filter(p => p.tipo === "Auditoría y Control Interno").length,
    };
  }, [proformas]);

  const stats = {
    total: proformas.length,
    pendientes: proformas.filter((p) => p.status === "enviada").length,
    aprobadas: proformas.filter((p) => p.status === "aprobada").length,
    valorTotal: proformas.reduce((acc, p) => acc + Number(p.total), 0),
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Proformas
          </h1>
          <p className="text-muted-foreground mt-1">
            Cotizaciones de servicios contables y trámites
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setDesignerOpen(true)}>
            <Palette className="h-4 w-4" />
            Diseñador
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="btn-gradient gap-2">
                <Plus className="h-4 w-4" />
                Nueva Proforma
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {plantillas.length === 0 ? (
                <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                  No hay plantillas creadas.
                  <br />
                  <span className="text-xs">Usa el Diseñador para crear plantillas.</span>
                </div>
              ) : (
                plantillas.map((plantilla) => (
                  <DropdownMenuItem 
                    key={plantilla.id}
                    onClick={() => handleOpenCreateDialog(plantilla.id, plantilla.tipo)}
                  >
                    {plantilla.tipo === "Contabilidad" || plantilla.tipo === "contabilidad" ? (
                      <Calculator className="h-4 w-4 mr-2" />
                    ) : plantilla.tipo === "Auditoría y Control Interno" ? (
                      <FileText className="h-4 w-4 mr-2" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                    )}
                    {plantilla.nombre}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Proformas</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Pendientes</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.pendientes}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Aprobadas</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.aprobadas}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Valor Total</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            S/ {stats.valorTotal.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Tabs & Filters */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "todas" | GrupoServicio)}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="todas" className="gap-2">
              Todas
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {proformas.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="Contabilidad" className="gap-2">
              <Calculator className="h-4 w-4" />
              Contabilidad
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {countByGroup.contabilidad}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="Trámites" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Trámites
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {countByGroup.tramites}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="Auditoría y Control Interno" className="gap-2">
              <FileText className="h-4 w-4" />
              Auditoría
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {countByGroup.auditoria}
              </Badge>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, N° proforma, descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-[300px]"
              />
            </div>
            <ServiceFilterDropdown
              selectedServices={selectedServices}
              onServicesChange={setSelectedServices}
            />
            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "cards" | "table")}>
              <ToggleGroupItem value="cards" aria-label="Vista tarjetas">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Vista tabla">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Cargando proformas...</p>
            </div>
          ) : filteredProformas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No hay proformas</p>
              <p className="text-sm text-muted-foreground">Crea tu primera proforma para comenzar</p>
            </div>
          ) : (
            <>
              {/* Cards View */}
              {viewMode === "cards" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredProformas.map((proforma) => (
                    <div
                      key={proforma.id}
                      className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{proforma.numero}</p>
                            <p className="text-sm text-muted-foreground">
                              {proforma.cliente?.razon_social || "Sin cliente"}
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetail(proforma)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(proforma)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDownloadPDF(proforma)}
                              disabled={downloadingId === proforma.id}
                            >
                              {downloadingId === proforma.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4 mr-2" />
                              )}
                              Descargar PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendEmail(proforma)}>
                              <Send className="h-4 w-4 mr-2" />
                              Enviar al cliente
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {proforma.status !== "rechazada" && (
                              <DropdownMenuItem 
                                onClick={() => handleAnular(proforma)}
                                className="text-orange-600 focus:text-orange-600"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Anular
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleEliminar(proforma)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="outline" className={typeStyles[proforma.tipo]}>
                          {typeLabels[proforma.tipo]}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          style={{ 
                            backgroundColor: `${getStatusColor(proforma.status)}15`,
                            color: getStatusColor(proforma.status),
                            borderColor: `${getStatusColor(proforma.status)}50`
                          }}
                        >
                          {getStatusLabel(proforma.status)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-semibold text-foreground">
                            S/ {Number(proforma.total).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Emisión</p>
                          <p className="font-medium text-foreground">{proforma.fecha_emision}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Vencimiento</p>
                          <p className="font-medium text-foreground">{proforma.fecha_vencimiento}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Table View */}
              {viewMode === "table" && (
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                            Proforma
                          </th>
                          <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                            Cliente
                          </th>
                          <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                            Tipo
                          </th>
                          <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                            Total
                          </th>
                          <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                            Estado
                          </th>
                          <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                            Válida hasta
                          </th>
                          <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredProformas.map((proforma) => (
                          <tr key={proforma.id} className="table-row-hover">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-muted">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <span className="font-medium text-foreground">
                                  {proforma.numero}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-foreground">
                                {proforma.cliente?.razon_social || "Sin cliente"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className={typeStyles[proforma.tipo]}>
                                {typeLabels[proforma.tipo]}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-foreground">
                                S/ {Number(proforma.total).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <Badge 
                                variant="outline" 
                                style={{ 
                                  backgroundColor: `${getStatusColor(proforma.status)}15`,
                                  color: getStatusColor(proforma.status),
                                  borderColor: `${getStatusColor(proforma.status)}50`
                                }}
                              >
                                {getStatusLabel(proforma.status)}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-muted-foreground">
                                {proforma.fecha_vencimiento}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Ver detalle"
                                  onClick={() => handleViewDetail(proforma)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Editar"
                                  onClick={() => handleEdit(proforma)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDownloadPDF(proforma)}
                                  disabled={downloadingId === proforma.id}
                                  title="Descargar PDF"
                                >
                                  {downloadingId === proforma.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Enviar al cliente"
                                  onClick={() => handleSendEmail(proforma)}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                                {proforma.status === "aprobada" && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="h-8 gap-1 ml-1"
                                    onClick={() => handleConfirmContract(proforma)}
                                    title="Confirmar Contrato"
                                  >
                                    <FileCheck className="h-4 w-4" />
                                    <span className="hidden xl:inline">Confirmar Contrato</span>
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {proforma.status !== "aprobada" && (
                                      <DropdownMenuItem onClick={() => handleConfirmContract(proforma)}>
                                        <FileCheck className="h-4 w-4 mr-2" />
                                        Confirmar Contrato
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleViewDetail(proforma)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver detalle
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEdit(proforma)}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDownloadPDF(proforma)}
                                      disabled={downloadingId === proforma.id}
                                    >
                                      {downloadingId === proforma.id ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      ) : (
                                        <Download className="h-4 w-4 mr-2" />
                                      )}
                                      Descargar PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSendEmail(proforma)}>
                                      <Send className="h-4 w-4 mr-2" />
                                      Enviar al cliente
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {proforma.status !== "rechazada" && (
                                      <DropdownMenuItem 
                                        onClick={() => handleAnular(proforma)}
                                        className="text-orange-600 focus:text-orange-600"
                                      >
                                        <Ban className="h-4 w-4 mr-2" />
                                        Anular
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem 
                                      onClick={() => handleEliminar(proforma)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ProformaDesigner open={designerOpen} onOpenChange={setDesignerOpen} />
      <ProformaForm
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setSelectedPlantillaId(null);
        }}
        onSuccess={fetchProformas}
        tipo={createDialogType}
        plantillaId={selectedPlantillaId}
        mode="create"
      />
      <ProformaDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        proforma={selectedProforma}
        items={selectedProformaItems}
        loading={loadingItems}
        onDownloadPDF={() => selectedProforma && handleDownloadPDF(selectedProforma)}
        onSendEmail={() => {
          if (selectedProforma) {
            setDetailModalOpen(false);
            handleSendEmail(selectedProforma);
          }
        }}
        downloadingPDF={downloadingId === selectedProforma?.id}
      />
      <SendEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        proformaNumero={emailProforma?.numero || ""}
        proformaId={emailProforma?.id || ""}
        clienteEmail={emailProforma?.cliente?.email || null}
        clienteNombre={emailProforma?.cliente?.razon_social || ""}
        onSuccess={fetchProformas}
      />
      <ProformaForm
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={fetchProformas}
        tipo={(editProforma?.tipo as GrupoServicio) || "Contabilidad"}
        mode="edit"
        proforma={editProforma as any}
        initialItems={editProformaItems}
      />

      {/* Anular Dialog */}
      <AlertDialog open={anularDialogOpen} onOpenChange={setAnularDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular proforma?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cambiará el estado de la proforma <strong>{actionProforma?.numero}</strong> a "Rechazada". 
              La proforma no será eliminada y podrá ser consultada posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAnular}
              disabled={actionLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Anular Proforma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Eliminar Dialog */}
      <AlertDialog open={eliminarDialogOpen} onOpenChange={setEliminarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proforma?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la proforma <strong>{actionProforma?.numero}</strong> y todos sus items. 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmEliminar}
              disabled={actionLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Eliminar Proforma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Proformas;

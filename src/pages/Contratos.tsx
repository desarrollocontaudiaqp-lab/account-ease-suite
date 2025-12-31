import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Search, Eye, MoreHorizontal, FileCheck, Calendar, User, LayoutGrid, List, Edit, Trash2, FileText, Loader2, Settings2, ArrowRight, CheckCircle, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ContratoDesigner } from "@/components/contratos/ContratoDesigner";
import { ContractActions, type ContractStatus } from "@/components/contratos/ContractActions";
import { ContractDetailModal } from "@/components/contratos/ContractDetailModal";
import { EditContractDialog } from "@/components/contratos/EditContractDialog";

interface Contract {
  id: string;
  numero: string;
  cliente: {
    id: string;
    razon_social: string;
    codigo: string;
  } | null;
  tipo_servicio: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  monto_mensual: number | null;
  monto_total: number | null;
  moneda: string;
  status: ContractStatus;
  notas: string | null;
  proforma_id: string | null;
}

interface ProformaState {
  fromProforma: boolean;
  proformaId: string;
  proformaNumero: string;
  clienteNombre: string;
  tipo: "contabilidad" | "tramites";
  total: number;
  moneda: string;
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

const typeStyles: Record<string, string> = {
  contabilidad: "bg-primary/10 text-primary",
  tramites: "bg-secondary/20 text-secondary-foreground",
  mixto: "bg-purple-100 text-purple-800",
};

const Contratos = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [proformaData, setProformaData] = useState<ProformaState | null>(null);
  
  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editContractId, setEditContractId] = useState<string | null>(null);
  
  // Form state for new contract
  const [newContract, setNewContract] = useState({
    numero: "",
    descripcion: "",
    tipo_servicio: "contabilidad",
    fecha_inicio: new Date().toISOString().split("T")[0],
    fecha_fin: "",
    monto_mensual: "",
    monto_total: "",
    moneda: "PEN",
    notas: "",
    cliente_id: "",
    proforma_id: "",
  });

  useEffect(() => {
    fetchContracts();
    
    // Check if we came from proforma confirmation
    const state = location.state as ProformaState | null;
    if (state?.fromProforma) {
      setProformaData(state);
      setNewContract(prev => ({
        ...prev,
        tipo_servicio: state.tipo,
        monto_total: state.total?.toString() || "",
        moneda: state.moneda || "PEN",
        descripcion: `Contrato generado desde Proforma ${state.proformaNumero}`,
        proforma_id: state.proformaId,
      }));
      setCreateDialogOpen(true);
      // Clear the state so refreshing doesn't reopen the dialog
      navigate(location.pathname, { replace: true });
    }
  }, [location.state]);

  const fetchContracts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contratos")
      .select(`
        id,
        numero,
        tipo_servicio,
        descripcion,
        fecha_inicio,
        fecha_fin,
        monto_mensual,
        monto_total,
        moneda,
        status,
        notas,
        proforma_id,
        cliente:clientes(id, razon_social, codigo)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching contracts:", error);
      toast.error("Error al cargar contratos");
    } else {
      const parsed = (data || []).map((c) => ({
        ...c,
        status: c.status as ContractStatus,
        cliente: c.cliente as Contract["cliente"],
      }));
      setContracts(parsed);
    }
    setLoading(false);
  };

  const handleCreateContract = async () => {
    if (!newContract.descripcion || !newContract.fecha_inicio) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    // Generate contract number
    const year = new Date().getFullYear();
    const count = contracts.length + 1;
    const numero = `CTR-${year}-${count.toString().padStart(3, "0")}`;

    // First, we need to get the client_id from the proforma if coming from proforma flow
    let clienteId = newContract.cliente_id;
    
    if (proformaData?.proformaId && !clienteId) {
      const { data: proformaDetails } = await supabase
        .from("proformas")
        .select("cliente_id")
        .eq("id", proformaData.proformaId)
        .maybeSingle();
      
      if (proformaDetails) {
        clienteId = proformaDetails.cliente_id;
      }
    }

    if (!clienteId) {
      toast.error("Por favor selecciona un cliente");
      return;
    }

    // Create contract in BORRADOR status (from proforma flow)
    const { error } = await supabase.from("contratos").insert({
      numero,
      descripcion: newContract.descripcion,
      tipo_servicio: newContract.tipo_servicio,
      fecha_inicio: newContract.fecha_inicio,
      fecha_fin: newContract.fecha_fin || null,
      monto_mensual: newContract.monto_mensual ? parseFloat(newContract.monto_mensual) : null,
      monto_total: newContract.monto_total ? parseFloat(newContract.monto_total) : null,
      moneda: newContract.moneda,
      notas: newContract.notas || null,
      cliente_id: clienteId,
      status: proformaData ? "borrador" : "borrador", // Always start in borrador
      proforma_id: proformaData?.proformaId || null,
    });

    if (error) {
      console.error("Error creating contract:", error);
      toast.error("Error al crear el contrato");
    } else {
      // If created from proforma, update proforma status to "aprobada"
      if (proformaData?.proformaId) {
        await supabase
          .from("proformas")
          .update({ status: "aprobada" })
          .eq("id", proformaData.proformaId);
      }
      
      toast.success("Contrato creado en estado Borrador");
      setCreateDialogOpen(false);
      setProformaData(null);
      resetForm();
      fetchContracts();
    }
  };

  const resetForm = () => {
    setNewContract({
      numero: "",
      descripcion: "",
      tipo_servicio: "contabilidad",
      fecha_inicio: new Date().toISOString().split("T")[0],
      fecha_fin: "",
      monto_mensual: "",
      monto_total: "",
      moneda: "PEN",
      notas: "",
      cliente_id: "",
      proforma_id: "",
    });
  };

  const handleViewDetail = (contractId: string) => {
    setSelectedContractId(contractId);
    setDetailModalOpen(true);
  };

  const handleEdit = (contractId: string) => {
    setEditContractId(contractId);
    setEditDialogOpen(true);
  };

  const filteredContracts = contracts.filter(
    (contract) =>
      contract.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.cliente?.razon_social.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    borradores: contracts.filter((c) => c.status === "borrador").length,
    enGestion: contracts.filter((c) => c.status === "en_gestion").length,
    aprobados: contracts.filter((c) => c.status === "aprobado").length,
    total: contracts.length,
    ingresosMensuales: contracts
      .filter((c) => c.status === "aprobado" || c.status === "activo")
      .reduce((acc, c) => acc + (Number(c.monto_mensual) || 0), 0),
  };

  // Calculate progress based on date range
  const calculateProgress = (fechaInicio: string, fechaFin: string | null): number => {
    if (!fechaFin) return 0;
    const start = new Date(fechaInicio).getTime();
    const end = new Date(fechaFin).getTime();
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Contratos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de contratos de servicios activos
          </p>
        </div>
      </div>

      <Tabs defaultValue="contratos" className="w-full">
        <TabsList>
          <TabsTrigger value="contratos" className="gap-2">
            <FileCheck className="h-4 w-4" />
            Contratos
          </TabsTrigger>
          <TabsTrigger value="plantillas" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Diseñador de Plantillas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contratos" className="space-y-6 mt-4">
          <div className="flex justify-end">
            <Button className="btn-gradient gap-2" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Nuevo Contrato
            </Button>
          </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-slate-100">
            <FileText className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.borradores}</p>
            <p className="text-sm text-muted-foreground">Borradores</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-100">
            <ArrowRight className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.enGestion}</p>
            <p className="text-sm text-muted-foreground">En Gestión</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-green-100">
            <CheckCircle className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.aprobados}</p>
            <p className="text-sm text-muted-foreground">Aprobados</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Ingresos Mensuales</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            S/ {stats.ingresosMensuales.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contrato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "cards" | "table")}>
          <ToggleGroupItem value="cards" aria-label="Vista tarjetas">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Vista tabla">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No hay contratos</p>
          <p className="text-sm text-muted-foreground">Crea tu primer contrato o confirma una proforma</p>
        </div>
      ) : (
        <>
          {/* Cards View */}
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredContracts.map((contract) => {
                const progress = calculateProgress(contract.fecha_inicio, contract.fecha_fin);
                return (
                  <div
                    key={contract.id}
                    className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{contract.numero}</p>
                          <p className="text-sm text-muted-foreground">
                            {contract.cliente?.razon_social || "Sin cliente"}
                          </p>
                        </div>
                      </div>
                      <ContractActions
                        contractId={contract.id}
                        contractNumero={contract.numero}
                        currentStatus={contract.status}
                        onStatusChange={fetchContracts}
                        onViewDetail={() => handleViewDetail(contract.id)}
                        onEdit={() => handleEdit(contract.id)}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline" className={typeStyles[contract.tipo_servicio] || typeStyles.contabilidad}>
                        {contract.tipo_servicio === "contabilidad" ? "Contabilidad" : "Trámites"}
                      </Badge>
                      <Badge variant="outline" className={statusStyles[contract.status]}>
                        {statusLabels[contract.status]}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-muted-foreground">Cuota Mensual</p>
                        <p className="font-medium text-foreground">
                          {contract.monto_mensual 
                            ? `S/ ${Number(contract.monto_mensual).toLocaleString()}`
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-medium text-foreground">
                          {contract.monto_total
                            ? `S/ ${Number(contract.monto_total).toLocaleString()}`
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Inicio</p>
                        <p className="font-medium text-foreground">{contract.fecha_inicio}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fin</p>
                        <p className="font-medium text-foreground">{contract.fecha_fin || "Sin definir"}</p>
                      </div>
                    </div>

                    {contract.fecha_fin && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-muted-foreground">Progreso</span>
                          <span className="text-sm font-medium text-foreground">
                            {progress}%
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}
                  </div>
                );
              })}
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
                        Contrato
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                        Cliente
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                        Tipo
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                        Cuota Mensual
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                        Estado
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                        Progreso
                      </th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredContracts.map((contract) => {
                      const progress = calculateProgress(contract.fecha_inicio, contract.fecha_fin);
                      return (
                        <tr key={contract.id} className="table-row-hover">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <FileCheck className="h-4 w-4 text-primary" />
                              </div>
                              <span className="font-medium text-foreground">
                                {contract.numero}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-foreground">
                              {contract.cliente?.razon_social || "Sin cliente"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={typeStyles[contract.tipo_servicio] || typeStyles.contabilidad}>
                              {contract.tipo_servicio === "contabilidad" ? "Contabilidad" : "Trámites"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-foreground">
                              {contract.monto_mensual
                                ? `S/ ${Number(contract.monto_mensual).toLocaleString()}`
                                : "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={statusStyles[contract.status]}>
                              {statusLabels[contract.status]}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            {contract.fecha_fin ? (
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <Progress value={progress} className="h-2 flex-1" />
                                <span className="text-sm text-muted-foreground w-10 text-right">
                                  {progress}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8" 
                                title="Ver detalle"
                                onClick={() => handleViewDetail(contract.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8" 
                                title="Editar"
                                onClick={() => handleEdit(contract.id)}
                                disabled={contract.status === "aprobado" || contract.status === "anulado"}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <ContractActions
                                contractId={contract.id}
                                contractNumero={contract.numero}
                                currentStatus={contract.status}
                                onStatusChange={fetchContracts}
                                onViewDetail={() => handleViewDetail(contract.id)}
                                onEdit={() => handleEdit(contract.id)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Contract Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          setProformaData(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {proformaData ? "Confirmar Contrato desde Proforma" : "Nuevo Contrato"}
            </DialogTitle>
            <DialogDescription>
              {proformaData 
                ? `Creando contrato desde la proforma ${proformaData.proformaNumero} para ${proformaData.clienteNombre}. El contrato iniciará en estado Borrador.`
                : "Completa los datos para crear un nuevo contrato en estado Borrador"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Servicio</Label>
                <Select 
                  value={newContract.tipo_servicio} 
                  onValueChange={(value) => setNewContract(prev => ({ ...prev, tipo_servicio: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contabilidad">Contabilidad</SelectItem>
                    <SelectItem value="tramites">Trámites</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select 
                  value={newContract.moneda} 
                  onValueChange={(value) => setNewContract(prev => ({ ...prev, moneda: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PEN">Soles (S/)</SelectItem>
                    <SelectItem value="USD">Dólares ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción *</Label>
              <Textarea
                value={newContract.descripcion}
                onChange={(e) => setNewContract(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Descripción del contrato..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio *</Label>
                <Input
                  type="date"
                  value={newContract.fecha_inicio}
                  onChange={(e) => setNewContract(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={newContract.fecha_fin}
                  onChange={(e) => setNewContract(prev => ({ ...prev, fecha_fin: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto Mensual</Label>
                <Input
                  type="number"
                  value={newContract.monto_mensual}
                  onChange={(e) => setNewContract(prev => ({ ...prev, monto_mensual: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Monto Total</Label>
                <Input
                  type="number"
                  value={newContract.monto_total}
                  onChange={(e) => setNewContract(prev => ({ ...prev, monto_total: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={newContract.notas}
                onChange={(e) => setNewContract(prev => ({ ...prev, notas: e.target.value }))}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateContract}>
              {proformaData ? "Crear Contrato (Borrador)" : "Crear Contrato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contract Detail Modal */}
      <ContractDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        contractId={selectedContractId}
      />

      {/* Edit Contract Dialog */}
      <EditContractDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        contractId={editContractId}
        onSuccess={fetchContracts}
      />
        </TabsContent>

        <TabsContent value="plantillas" className="mt-4">
          <ContratoDesigner />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Contratos;

import { useState, useEffect } from "react";
import { Plus, Search, Filter, Eye, Download, Send, MoreHorizontal, FileText, Calculator, LayoutGrid, List, Palette, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { ProformaDesigner } from "@/components/proformas/ProformaDesigner";
import { CreateProformaDialog } from "@/components/proformas/CreateProformaDialog";

interface Proforma {
  id: string;
  numero: string;
  cliente: {
    razon_social: string;
  } | null;
  tipo: "contabilidad" | "tramites";
  subtotal: number;
  igv: number;
  total: number;
  status: "borrador" | "enviada" | "aprobada" | "rechazada" | "facturada";
  fecha_emision: string;
  fecha_vencimiento: string;
}

const statusStyles: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-800 border-gray-200",
  enviada: "bg-blue-100 text-blue-800 border-blue-200",
  aprobada: "bg-green-100 text-green-800 border-green-200",
  rechazada: "bg-red-100 text-red-800 border-red-200",
  facturada: "bg-purple-100 text-purple-800 border-purple-200",
};

const statusLabels: Record<string, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  facturada: "Facturada",
};

const typeStyles = {
  contabilidad: "bg-primary/10 text-primary",
  tramites: "bg-secondary/20 text-secondary-foreground",
};

const typeLabels = {
  contabilidad: "Contabilidad",
  tramites: "Trámites",
};

const Proformas = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("todas");
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [loading, setLoading] = useState(true);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogType, setCreateDialogType] = useState<"contabilidad" | "tramites">("contabilidad");

  useEffect(() => {
    fetchProformas();
  }, []);

  const fetchProformas = async () => {
    setLoading(true);
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
        cliente:clientes(razon_social)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching proformas:", error);
    } else {
      const parsed = (data || []).map((p) => ({
        ...p,
        tipo: p.tipo as "contabilidad" | "tramites",
        status: p.status as Proforma["status"],
        cliente: p.cliente as { razon_social: string } | null,
      }));
      setProformas(parsed);
    }
    setLoading(false);
  };

  const handleOpenCreateDialog = (tipo: "contabilidad" | "tramites") => {
    setCreateDialogType(tipo);
    setCreateDialogOpen(true);
  };

  const filteredProformas = proformas.filter((proforma) => {
    const matchesSearch =
      proforma.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proforma.cliente?.razon_social.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "todas") return matchesSearch;
    if (activeTab === "contabilidad") return matchesSearch && proforma.tipo === "contabilidad";
    if (activeTab === "tramites") return matchesSearch && proforma.tipo === "tramites";
    return matchesSearch;
  });

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
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleOpenCreateDialog("contabilidad")}>
                <Calculator className="h-4 w-4 mr-2" />
                Contabilidad
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenCreateDialog("tramites")}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Trámites
              </DropdownMenuItem>
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="contabilidad">Contabilidad</TabsTrigger>
            <TabsTrigger value="tramites">Trámites</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar proforma..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-[250px]"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
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
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Descargar PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Send className="h-4 w-4 mr-2" />
                              Enviar al cliente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="outline" className={typeStyles[proforma.tipo]}>
                          {typeLabels[proforma.tipo]}
                        </Badge>
                        <Badge variant="outline" className={statusStyles[proforma.status]}>
                          {statusLabels[proforma.status]}
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
                              <Badge variant="outline" className={statusStyles[proforma.status]}>
                                {statusLabels[proforma.status]}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-muted-foreground">
                                {proforma.fecha_vencimiento}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver detalle
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Download className="h-4 w-4 mr-2" />
                                    Descargar PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Send className="h-4 w-4 mr-2" />
                                    Enviar al cliente
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
      <CreateProformaDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchProformas}
        tipo={createDialogType}
      />
    </div>
  );
};

export default Proformas;

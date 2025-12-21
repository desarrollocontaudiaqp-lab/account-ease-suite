import { useState } from "react";
import { Plus, Search, Filter, Eye, Download, Send, MoreHorizontal, FileText, Calculator, LayoutGrid, List } from "lucide-react";
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

interface Proforma {
  id: string;
  number: string;
  client: string;
  type: "Contabilidad" | "Trámites";
  items: number;
  total: number;
  status: "Borrador" | "Enviada" | "Aceptada" | "Rechazada";
  createdAt: string;
  validUntil: string;
}

const proformas: Proforma[] = [
  {
    id: "1",
    number: "PRO-2024-001",
    client: "Empresa ABC S.A.C.",
    type: "Contabilidad",
    items: 5,
    total: 3500,
    status: "Aceptada",
    createdAt: "15/12/2024",
    validUntil: "15/01/2025",
  },
  {
    id: "2",
    number: "PRO-2024-002",
    client: "Tech Solutions Perú",
    type: "Trámites",
    items: 3,
    total: 1200,
    status: "Enviada",
    createdAt: "18/12/2024",
    validUntil: "18/01/2025",
  },
  {
    id: "3",
    number: "PRO-2024-003",
    client: "Inversiones XYZ E.I.R.L.",
    type: "Contabilidad",
    items: 8,
    total: 5800,
    status: "Borrador",
    createdAt: "19/12/2024",
    validUntil: "19/01/2025",
  },
  {
    id: "4",
    number: "PRO-2024-004",
    client: "Comercial Delta S.A.",
    type: "Trámites",
    items: 2,
    total: 800,
    status: "Rechazada",
    createdAt: "10/12/2024",
    validUntil: "10/01/2025",
  },
];

const statusStyles = {
  Borrador: "bg-gray-100 text-gray-800 border-gray-200",
  Enviada: "bg-blue-100 text-blue-800 border-blue-200",
  Aceptada: "bg-green-100 text-green-800 border-green-200",
  Rechazada: "bg-red-100 text-red-800 border-red-200",
};

const typeStyles = {
  Contabilidad: "bg-primary/10 text-primary",
  Trámites: "bg-secondary/20 text-secondary-foreground",
};

const Proformas = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("todas");
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");

  const filteredProformas = proformas.filter((proforma) => {
    const matchesSearch =
      proforma.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proforma.client.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "todas") return matchesSearch;
    if (activeTab === "contabilidad") return matchesSearch && proforma.type === "Contabilidad";
    if (activeTab === "tramites") return matchesSearch && proforma.type === "Trámites";
    return matchesSearch;
  });

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
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Calculator className="h-4 w-4" />
            Contabilidad
          </Button>
          <Button className="btn-gradient gap-2">
            <Plus className="h-4 w-4" />
            Nueva Proforma
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Proformas</p>
          <p className="text-2xl font-bold text-foreground mt-1">{proformas.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Pendientes</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {proformas.filter((p) => p.status === "Enviada").length}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Aceptadas</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {proformas.filter((p) => p.status === "Aceptada").length}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Valor Total</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            S/ {proformas.reduce((acc, p) => acc + p.total, 0).toLocaleString()}
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
                        <p className="font-semibold text-foreground">{proforma.number}</p>
                        <p className="text-sm text-muted-foreground">{proforma.client}</p>
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
                    <Badge variant="outline" className={typeStyles[proforma.type]}>
                      {proforma.type}
                    </Badge>
                    <Badge variant="outline" className={statusStyles[proforma.status]}>
                      {proforma.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-muted-foreground">Items</p>
                      <p className="font-medium text-foreground">{proforma.items} servicios</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-semibold text-foreground">S/ {proforma.total.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Creada</p>
                      <p className="font-medium text-foreground">{proforma.createdAt}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Válida hasta</p>
                      <p className="font-medium text-foreground">{proforma.validUntil}</p>
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
                        Items
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
                              {proforma.number}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-foreground">
                            {proforma.client}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={typeStyles[proforma.type]}>
                            {proforma.type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-muted-foreground">
                            {proforma.items} servicios
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-foreground">
                            S/ {proforma.total.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={statusStyles[proforma.status]}>
                            {proforma.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-muted-foreground">
                            {proforma.validUntil}
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Proformas;
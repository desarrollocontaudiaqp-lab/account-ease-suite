import { useState } from "react";
import { Plus, Search, Eye, MoreHorizontal, FileCheck, Calendar, User, LayoutGrid, List, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Contract {
  id: string;
  number: string;
  client: string;
  type: "Contabilidad" | "Trámites" | "Mixto";
  advisor: string;
  startDate: string;
  endDate: string;
  monthlyFee: number;
  status: "Vigente" | "Por vencer" | "Vencido" | "Cancelado";
  progress: number;
  pendingPayments: number;
}

const contracts: Contract[] = [
  {
    id: "1",
    number: "CTR-2024-001",
    client: "Empresa ABC S.A.C.",
    type: "Contabilidad",
    advisor: "María García",
    startDate: "01/01/2024",
    endDate: "31/12/2024",
    monthlyFee: 1500,
    status: "Vigente",
    progress: 75,
    pendingPayments: 0,
  },
  {
    id: "2",
    number: "CTR-2024-002",
    client: "Inversiones XYZ E.I.R.L.",
    type: "Mixto",
    advisor: "Carlos López",
    startDate: "15/03/2024",
    endDate: "14/03/2025",
    monthlyFee: 2200,
    status: "Vigente",
    progress: 60,
    pendingPayments: 2,
  },
  {
    id: "3",
    number: "CTR-2024-003",
    client: "Comercial Delta S.A.",
    type: "Trámites",
    advisor: "Ana Rodríguez",
    startDate: "01/06/2024",
    endDate: "31/12/2024",
    monthlyFee: 800,
    status: "Por vencer",
    progress: 90,
    pendingPayments: 1,
  },
  {
    id: "4",
    number: "CTR-2024-004",
    client: "Tech Solutions Perú",
    type: "Contabilidad",
    advisor: "Luis Martínez",
    startDate: "01/02/2024",
    endDate: "31/01/2025",
    monthlyFee: 1800,
    status: "Vigente",
    progress: 45,
    pendingPayments: 0,
  },
];

const statusStyles = {
  Vigente: "bg-green-100 text-green-800 border-green-200",
  "Por vencer": "bg-yellow-100 text-yellow-800 border-yellow-200",
  Vencido: "bg-red-100 text-red-800 border-red-200",
  Cancelado: "bg-gray-100 text-gray-800 border-gray-200",
};

const typeStyles = {
  Contabilidad: "bg-primary/10 text-primary",
  Trámites: "bg-secondary/20 text-secondary-foreground",
  Mixto: "bg-purple-100 text-purple-800",
};

const Contratos = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const filteredContracts = contracts.filter(
    (contract) =>
      contract.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <Button className="btn-gradient gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Contrato
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-green-100">
            <FileCheck className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {contracts.filter((c) => c.status === "Vigente").length}
            </p>
            <p className="text-sm text-muted-foreground">Vigentes</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-yellow-100">
            <Calendar className="h-5 w-5 text-yellow-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {contracts.filter((c) => c.status === "Por vencer").length}
            </p>
            <p className="text-sm text-muted-foreground">Por Vencer</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">5</p>
            <p className="text-sm text-muted-foreground">Asesores</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Ingresos Mensuales</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            S/ {contracts.reduce((acc, c) => acc + c.monthlyFee, 0).toLocaleString()}
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

      {/* Cards View */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredContracts.map((contract) => (
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
                    <p className="font-semibold text-foreground">{contract.number}</p>
                    <p className="text-sm text-muted-foreground">{contract.client}</p>
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
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Cancelar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className={typeStyles[contract.type]}>
                  {contract.type}
                </Badge>
                <Badge variant="outline" className={statusStyles[contract.status]}>
                  {contract.status}
                </Badge>
                {contract.pendingPayments > 0 && (
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                    {contract.pendingPayments} pago(s) pendiente(s)
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="text-muted-foreground">Asesor</p>
                  <p className="font-medium text-foreground">{contract.advisor}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cuota Mensual</p>
                  <p className="font-medium text-foreground">
                    S/ {contract.monthlyFee.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Inicio</p>
                  <p className="font-medium text-foreground">{contract.startDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fin</p>
                  <p className="font-medium text-foreground">{contract.endDate}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Progreso</span>
                  <span className="text-sm font-medium text-foreground">
                    {contract.progress}%
                  </span>
                </div>
                <Progress value={contract.progress} className="h-2" />
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
                    Contrato
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Cliente
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Tipo
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Asesor
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
                {filteredContracts.map((contract) => (
                  <tr key={contract.id} className="table-row-hover">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileCheck className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">
                          {contract.number}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-foreground">
                        {contract.client}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={typeStyles[contract.type]}>
                        {contract.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">
                        {contract.advisor}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-foreground">
                        S/ {contract.monthlyFee.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className={statusStyles[contract.status]}>
                          {contract.status}
                        </Badge>
                        {contract.pendingPayments > 0 && (
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                            {contract.pendingPayments} pago(s)
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={contract.progress} className="h-2 flex-1" />
                        <span className="text-sm text-muted-foreground w-10 text-right">
                          {contract.progress}%
                        </span>
                      </div>
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
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Cancelar
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
    </div>
  );
};

export default Contratos;
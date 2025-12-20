import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye } from "lucide-react";

interface Contract {
  id: string;
  client: string;
  type: "Contabilidad" | "Trámites" | "Mixto";
  advisor: string;
  startDate: string;
  status: "Vigente" | "Por vencer" | "Vencido";
  progress: number;
}

const contracts: Contract[] = [
  {
    id: "C-2024-001",
    client: "Empresa ABC S.A.C.",
    type: "Contabilidad",
    advisor: "María García",
    startDate: "01/12/2024",
    status: "Vigente",
    progress: 75,
  },
  {
    id: "C-2024-002",
    client: "Inversiones XYZ E.I.R.L.",
    type: "Trámites",
    advisor: "Carlos López",
    startDate: "15/11/2024",
    status: "Vigente",
    progress: 45,
  },
  {
    id: "C-2024-003",
    client: "Comercial Delta S.A.",
    type: "Mixto",
    advisor: "Ana Rodríguez",
    startDate: "20/10/2024",
    status: "Por vencer",
    progress: 90,
  },
  {
    id: "C-2024-004",
    client: "Tech Solutions Perú",
    type: "Contabilidad",
    advisor: "Luis Martínez",
    startDate: "05/09/2024",
    status: "Vencido",
    progress: 100,
  },
  {
    id: "C-2024-005",
    client: "Distribuidora Norte",
    type: "Trámites",
    advisor: "María García",
    startDate: "18/12/2024",
    status: "Vigente",
    progress: 20,
  },
];

const statusStyles = {
  Vigente: "bg-green-100 text-green-800 border-green-200",
  "Por vencer": "bg-yellow-100 text-yellow-800 border-yellow-200",
  Vencido: "bg-red-100 text-red-800 border-red-200",
};

const typeStyles = {
  Contabilidad: "bg-primary/10 text-primary",
  Trámites: "bg-secondary/20 text-secondary-foreground",
  Mixto: "bg-purple-100 text-purple-800",
};

export function RecentContracts() {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-slide-up">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Contratos Recientes
          </h3>
          <p className="text-sm text-muted-foreground">
            Últimos 5 contratos activos
          </p>
        </div>
        <Button variant="outline" size="sm">
          Ver todos
        </Button>
      </div>

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
            {contracts.map((contract) => (
              <tr key={contract.id} className="table-row-hover">
                <td className="px-6 py-4">
                  <span className="font-medium text-foreground">
                    {contract.id}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-foreground">
                    {contract.client}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant="outline"
                    className={typeStyles[contract.type]}
                  >
                    {contract.type}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-muted-foreground">
                    {contract.advisor}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant="outline"
                    className={statusStyles[contract.status]}
                  >
                    {contract.status}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${contract.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {contract.progress}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

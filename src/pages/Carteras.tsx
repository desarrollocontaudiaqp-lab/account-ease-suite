import { useState } from "react";
import { Users, Plus, Edit, MoreHorizontal, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TeamMember {
  id: string;
  name: string;
  role: "Asesor" | "Auxiliar" | "Practicante";
  initials: string;
  contracts: number;
  progress: number;
}

interface Portfolio {
  id: string;
  name: string;
  specialty: "Contabilidad" | "Trámites" | "Mixta";
  members: TeamMember[];
  totalContracts: number;
  activeClients: number;
  monthlyRevenue: number;
  overallProgress: number;
}

const portfolios: Portfolio[] = [
  {
    id: "1",
    name: "Cartera 1",
    specialty: "Contabilidad",
    members: [
      { id: "1", name: "María García", role: "Asesor", initials: "MG", contracts: 12, progress: 75 },
      { id: "2", name: "Pedro Sánchez", role: "Auxiliar", initials: "PS", contracts: 8, progress: 68 },
      { id: "3", name: "Laura Díaz", role: "Practicante", initials: "LD", contracts: 4, progress: 82 },
    ],
    totalContracts: 24,
    activeClients: 18,
    monthlyRevenue: 35000,
    overallProgress: 75,
  },
  {
    id: "2",
    name: "Cartera 2",
    specialty: "Trámites",
    members: [
      { id: "4", name: "Carlos López", role: "Asesor", initials: "CL", contracts: 10, progress: 70 },
      { id: "5", name: "Ana Torres", role: "Auxiliar", initials: "AT", contracts: 6, progress: 65 },
    ],
    totalContracts: 16,
    activeClients: 12,
    monthlyRevenue: 22000,
    overallProgress: 68,
  },
  {
    id: "3",
    name: "Cartera 3",
    specialty: "Mixta",
    members: [
      { id: "6", name: "Ana Rodríguez", role: "Asesor", initials: "AR", contracts: 15, progress: 87 },
      { id: "7", name: "Miguel Flores", role: "Auxiliar", initials: "MF", contracts: 9, progress: 72 },
      { id: "8", name: "Sofía Mendoza", role: "Practicante", initials: "SM", contracts: 5, progress: 78 },
    ],
    totalContracts: 29,
    activeClients: 22,
    monthlyRevenue: 42000,
    overallProgress: 79,
  },
  {
    id: "4",
    name: "Cartera 4",
    specialty: "Contabilidad",
    members: [
      { id: "9", name: "Luis Martínez", role: "Asesor", initials: "LM", contracts: 8, progress: 63 },
      { id: "10", name: "Carmen Ruiz", role: "Auxiliar", initials: "CR", contracts: 5, progress: 70 },
    ],
    totalContracts: 13,
    activeClients: 10,
    monthlyRevenue: 19000,
    overallProgress: 66,
  },
  {
    id: "5",
    name: "Cartera 5",
    specialty: "Trámites",
    members: [
      { id: "11", name: "Patricia Sánchez", role: "Asesor", initials: "PS", contracts: 11, progress: 91 },
      { id: "12", name: "Roberto Vega", role: "Auxiliar", initials: "RV", contracts: 7, progress: 85 },
      { id: "13", name: "Elena Castro", role: "Practicante", initials: "EC", contracts: 3, progress: 88 },
    ],
    totalContracts: 21,
    activeClients: 16,
    monthlyRevenue: 28000,
    overallProgress: 88,
  },
];

const specialtyStyles = {
  Contabilidad: "bg-primary/10 text-primary",
  Trámites: "bg-secondary/20 text-secondary-foreground",
  Mixta: "bg-purple-100 text-purple-800",
};

const roleStyles = {
  Asesor: "bg-green-100 text-green-800",
  Auxiliar: "bg-blue-100 text-blue-800",
  Practicante: "bg-orange-100 text-orange-800",
};

const Carteras = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Carteras
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de las carteras operativas del estudio
          </p>
        </div>
        <Button className="btn-gradient gap-2">
          <Plus className="h-4 w-4" />
          Nueva Cartera
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Carteras</p>
          <p className="text-2xl font-bold text-foreground mt-1">{portfolios.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Miembros</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {portfolios.reduce((acc, p) => acc + p.members.length, 0)}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Contratos</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {portfolios.reduce((acc, p) => acc + p.totalContracts, 0)}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Ingresos Totales</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            S/ {portfolios.reduce((acc, p) => acc + p.monthlyRevenue, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Portfolios Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {portfolios.map((portfolio) => (
          <div
            key={portfolio.id}
            className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* Header */}
            <div className="p-5 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary text-primary-foreground">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{portfolio.name}</h3>
                    <Badge variant="outline" className={specialtyStyles[portfolio.specialty]}>
                      {portfolio.specialty}
                    </Badge>
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
                      <Edit className="h-4 w-4 mr-2" />
                      Editar cartera
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Agregar miembro
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
              <div className="p-3 text-center">
                <p className="text-lg font-bold text-foreground">{portfolio.totalContracts}</p>
                <p className="text-xs text-muted-foreground">Contratos</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-lg font-bold text-foreground">{portfolio.activeClients}</p>
                <p className="text-xs text-muted-foreground">Clientes</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-lg font-bold text-foreground">S/{(portfolio.monthlyRevenue / 1000).toFixed(0)}K</p>
                <p className="text-xs text-muted-foreground">Ingresos</p>
              </div>
            </div>

            {/* Members */}
            <div className="p-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Equipo</p>
              <div className="space-y-3">
                {portfolio.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.name}
                        </p>
                        <Badge variant="outline" className={`text-xs ${roleStyles[member.role]}`}>
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {member.contracts} contratos
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Footer */}
            <div className="p-4 border-t border-border bg-muted/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Progreso General</span>
                <span className="text-sm font-semibold text-foreground">
                  {portfolio.overallProgress}%
                </span>
              </div>
              <Progress value={portfolio.overallProgress} className="h-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Carteras;

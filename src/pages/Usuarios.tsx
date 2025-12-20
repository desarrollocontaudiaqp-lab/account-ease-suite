import { Users, Shield, Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  portfolio: string;
  status: "Activo" | "Inactivo";
  initials: string;
  lastAccess: string;
}

const users: User[] = [
  {
    id: "1",
    name: "Juan Díaz",
    email: "juan.diaz@estudio.com",
    role: "Administrador",
    portfolio: "-",
    status: "Activo",
    initials: "JD",
    lastAccess: "Hace 5 min",
  },
  {
    id: "2",
    name: "Roberto Mendoza",
    email: "roberto.mendoza@estudio.com",
    role: "Gerente",
    portfolio: "-",
    status: "Activo",
    initials: "RM",
    lastAccess: "Hace 1 hora",
  },
  {
    id: "3",
    name: "María García",
    email: "maria.garcia@estudio.com",
    role: "Asesor",
    portfolio: "Cartera 1",
    status: "Activo",
    initials: "MG",
    lastAccess: "Hace 30 min",
  },
  {
    id: "4",
    name: "Carlos López",
    email: "carlos.lopez@estudio.com",
    role: "Asesor",
    portfolio: "Cartera 2",
    status: "Activo",
    initials: "CL",
    lastAccess: "Hace 2 horas",
  },
  {
    id: "5",
    name: "Ana Rodríguez",
    email: "ana.rodriguez@estudio.com",
    role: "Asesor",
    portfolio: "Cartera 3",
    status: "Activo",
    initials: "AR",
    lastAccess: "En línea",
  },
  {
    id: "6",
    name: "Pedro Sánchez",
    email: "pedro.sanchez@estudio.com",
    role: "Auxiliar",
    portfolio: "Cartera 1",
    status: "Inactivo",
    initials: "PS",
    lastAccess: "Hace 3 días",
  },
];

const roleStyles: Record<string, string> = {
  Administrador: "bg-red-100 text-red-800",
  Gerente: "bg-purple-100 text-purple-800",
  Supervisor: "bg-blue-100 text-blue-800",
  Asesor: "bg-green-100 text-green-800",
  Auxiliar: "bg-yellow-100 text-yellow-800",
  Practicante: "bg-orange-100 text-orange-800",
};

const Usuarios = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>
        <Button className="btn-gradient gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{users.length}</p>
            <p className="text-sm text-muted-foreground">Usuarios Totales</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-green-100">
            <Shield className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {users.filter((u) => u.status === "Activo").length}
            </p>
            <p className="text-sm text-muted-foreground">Activos</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-secondary/20">
            <Settings className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">6</p>
            <p className="text-sm text-muted-foreground">Roles Definidos</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Lista de Usuarios</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Usuario
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Rol
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Cartera
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Último Acceso
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="table-row-hover">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {user.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={roleStyles[user.role]}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{user.portfolio}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{user.lastAccess}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <Switch checked={user.status === "Activo"} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Usuarios;

import {
  Users,
  FileCheck,
  FileText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentContracts } from "@/components/dashboard/RecentContracts";
import { UpcomingPayments } from "@/components/dashboard/UpcomingPayments";
import { TeamPerformance } from "@/components/dashboard/TeamPerformance";
import { QuickActions } from "@/components/dashboard/QuickActions";

const Dashboard = () => {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Bienvenido, aquí está el resumen de tu estudio contable
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-status-completed/10 text-status-completed rounded-full">
            <span className="h-2 w-2 rounded-full bg-status-completed animate-pulse" />
            Sistema activo
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Clientes Activos"
          value={156}
          subtitle="12 nuevos este mes"
          icon={Users}
          trend={{ value: 8, isPositive: true }}
          variant="primary"
        />
        <StatCard
          title="Contratos Vigentes"
          value={89}
          subtitle="5 por vencer"
          icon={FileCheck}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Proformas Enviadas"
          value={34}
          subtitle="Este mes"
          icon={FileText}
          trend={{ value: 5, isPositive: true }}
        />
        <StatCard
          title="Ingresos del Mes"
          value="S/ 125,400"
          subtitle="Meta: S/ 150,000"
          icon={DollarSign}
          variant="secondary"
        />
        <StatCard
          title="Tasa Conversión"
          value="68%"
          subtitle="Proforma a contrato"
          icon={TrendingUp}
          trend={{ value: 3, isPositive: true }}
        />
        <StatCard
          title="Pagos Vencidos"
          value={7}
          subtitle="S/ 15,200 pendiente"
          icon={AlertTriangle}
          variant="warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Contracts - Takes 2 columns */}
        <div className="xl:col-span-2">
          <RecentContracts />
        </div>

        {/* Quick Actions */}
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Secondary Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingPayments />
        <TeamPerformance />
      </div>
    </div>
  );
};

export default Dashboard;

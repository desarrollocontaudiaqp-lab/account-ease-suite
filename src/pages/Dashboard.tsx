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
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Bienvenido de nuevo, Juan
          </p>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium text-emerald-700">Sistema activo</span>
          </div>
        </div>
      </div>

      {/* Stats Grid - Modern Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-5">
        <StatCard
          title="Clientes Activos"
          value={156}
          subtitle="este mes"
          icon={Users}
          trend={{ value: 8, isPositive: true }}
          variant="primary"
          delay={0}
        />
        <StatCard
          title="Contratos Vigentes"
          value={89}
          subtitle="5 por vencer"
          icon={FileCheck}
          trend={{ value: 12, isPositive: true }}
          delay={50}
        />
        <StatCard
          title="Proformas"
          value={34}
          subtitle="enviadas"
          icon={FileText}
          trend={{ value: 5, isPositive: true }}
          delay={100}
        />
        <StatCard
          title="Ingresos"
          value="S/ 125.4K"
          subtitle="Meta: S/ 150K"
          icon={DollarSign}
          variant="secondary"
          delay={150}
        />
        <StatCard
          title="Conversión"
          value="68%"
          subtitle="proforma → contrato"
          icon={TrendingUp}
          trend={{ value: 3, isPositive: true }}
          delay={200}
        />
        <StatCard
          title="Pagos Vencidos"
          value={7}
          subtitle="S/ 15.2K"
          icon={AlertTriangle}
          variant="warning"
          delay={250}
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

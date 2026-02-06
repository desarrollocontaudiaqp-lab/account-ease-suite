import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BarChart3, Building2 } from "lucide-react";
import { TeamRankingCard } from "./TeamRankingCard";
import { CategoryMetricsPanel } from "./CategoryMetricsPanel";
import { CategorySummaryCards } from "./CategorySummaryCards";
import { PerformanceFilters } from "./PerformanceFilters";
import { useCarteraPerformance, TimeFilter } from "@/hooks/useCarteraPerformance";

interface CarteraPerformanceDashboardProps {
  carteraId: string;
  carteraNombre: string;
}

export function CarteraPerformanceDashboard({
  carteraId,
  carteraNombre,
}: CarteraPerformanceDashboardProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month");
  const [contractFilter, setContractFilter] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<"contract" | "activity" | "responsible">("contract");

  const { teamRanking, categoryScores, contracts, loading } = useCarteraPerformance(
    carteraId,
    timeFilter,
    contractFilter
  );

  // Calculate overall stats
  const totalScore = teamRanking.reduce((sum, m) => sum + m.totalScore, 0);
  const totalCompleted = categoryScores.filter(s => s.progress >= 100).length;
  const totalPending = categoryScores.filter(s => s.progress < 100).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary text-primary-foreground">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{carteraNombre}</h2>
            <p className="text-sm text-muted-foreground">Rendimiento del equipo</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-lg px-3 py-1">
            {totalScore} pts totales
          </Badge>
          <Badge variant="secondary">
            {totalCompleted} completados
          </Badge>
          <Badge variant="outline" className="text-muted-foreground">
            {totalPending} pendientes
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <PerformanceFilters
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        contractFilter={contractFilter}
        onContractFilterChange={setContractFilter}
        contracts={contracts}
      />

      {/* Category Summary Cards */}
      <CategorySummaryCards scores={categoryScores} />

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Team Ranking */}
        <div className="xl:col-span-1">
          <TeamRankingCard members={teamRanking} loading={loading} />
        </div>

        {/* Category Metrics */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Detalle por Categorías</CardTitle>
                <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="contract" className="text-xs px-3">Contrato</TabsTrigger>
                    <TabsTrigger value="activity" className="text-xs px-3">Actividad</TabsTrigger>
                    <TabsTrigger value="responsible" className="text-xs px-3">Responsable</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <CategoryMetricsPanel scores={categoryScores} groupBy={groupBy} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

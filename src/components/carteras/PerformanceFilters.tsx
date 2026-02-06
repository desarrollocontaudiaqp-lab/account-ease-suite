import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar, CalendarDays, CalendarRange, Infinity } from "lucide-react";
import type { TimeFilter } from "@/hooks/useCarteraPerformance";

interface PerformanceFiltersProps {
  timeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
  contractFilter: string | null;
  onContractFilterChange: (contractId: string | null) => void;
  contracts: { id: string; numero: string }[];
}

export function PerformanceFilters({
  timeFilter,
  onTimeFilterChange,
  contractFilter,
  onContractFilterChange,
  contracts,
}: PerformanceFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      {/* Time Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Período:</span>
        <ToggleGroup
          type="single"
          value={timeFilter}
          onValueChange={(value) => {
            if (value) onTimeFilterChange(value as TimeFilter);
          }}
          className="bg-muted/50 p-1 rounded-lg"
        >
          <ToggleGroupItem
            value="today"
            aria-label="Hoy"
            className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
          >
            <Calendar className="h-4 w-4 mr-1.5" />
            Hoy
          </ToggleGroupItem>
          <ToggleGroupItem
            value="week"
            aria-label="Semana"
            className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
          >
            <CalendarDays className="h-4 w-4 mr-1.5" />
            Semana
          </ToggleGroupItem>
          <ToggleGroupItem
            value="month"
            aria-label="Mes"
            className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
          >
            <CalendarRange className="h-4 w-4 mr-1.5" />
            Mes
          </ToggleGroupItem>
          <ToggleGroupItem
            value="all"
            aria-label="Todo"
            className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
          >
            <Infinity className="h-4 w-4 mr-1.5" />
            Todo
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Contract Filter */}
      {contracts.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Contrato:</span>
          <Select
            value={contractFilter || "all"}
            onValueChange={(value) => onContractFilterChange(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos los contratos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los contratos</SelectItem>
              {contracts.map((contract) => (
                <SelectItem key={contract.id} value={contract.id}>
                  {contract.numero}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertFilter,
  parseLocalDate,
  useAlertFilters,
  useContractAlerts,
} from "@/hooks/useContractAlerts";

const formatDate = (value: string) =>
  parseLocalDate(value).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const severity = (dias: number) => {
  if (dias < 0) return { label: "Vencido", className: "bg-destructive/10 text-destructive border-destructive/20" };
  if (dias === 0) return { label: "Vence hoy", className: "bg-destructive/10 text-destructive border-destructive/20" };
  if (dias <= 7) return { label: `${dias} días`, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
  if (dias <= 15) return { label: `${dias} días`, className: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
  return { label: `${dias} días`, className: "bg-muted text-muted-foreground border-border" };
};

export default function Alertas() {
  const navigate = useNavigate();
  const { filters, addFilter, updateFilter, removeFilter, resetFilters } = useAlertFilters();
  const maxDias = useMemo(
    () => Math.max(30, ...filters.map((f) => f.dias)),
    [filters]
  );
  const { contracts, loading, refetch } = useContractAlerts(maxDias);

  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [editing, setEditing] = useState<AlertFilter | null>(null);
  const [form, setForm] = useState({ label: "", dias: "" });

  const activeFilter = filters.find((f) => f.id === activeFilterId) || null;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contracts.filter((c) => {
      const withinFilter = activeFilter ? c.diasRestantes <= activeFilter.dias : true;
      const matchesSearch =
        !term ||
        c.numero.toLowerCase().includes(term) ||
        c.cliente.toLowerCase().includes(term) ||
        c.descripcion.toLowerCase().includes(term);
      return withinFilter && matchesSearch;
    });
  }, [contracts, activeFilter, search]);

  const countFor = (dias: number) => contracts.filter((c) => c.diasRestantes <= dias).length;
  const vencidos = contracts.filter((c) => c.diasRestantes < 0).length;

  const openCreate = () => {
    setEditing(null);
    setForm({ label: "", dias: "" });
    setManageOpen(true);
  };

  const openEdit = (filter: AlertFilter) => {
    setEditing(filter);
    setForm({ label: filter.label, dias: String(filter.dias) });
    setManageOpen(true);
  };

  const handleSaveFilter = async () => {
    const label = form.label.trim();
    const dias = Number(form.dias);
    if (!label) return toast.error("Ingresa un nombre para el filtro");
    if (!Number.isFinite(dias) || dias < 0) return toast.error("Ingresa un número de días válido");

    if (editing) {
      await updateFilter(editing.id, { label, dias });
      toast.success("Filtro actualizado");
    } else {
      await addFilter({ label, dias });
      toast.success("Filtro agregado");
    }
    setManageOpen(false);
  };

  const handleRemove = async (filter: AlertFilter) => {
    await removeFilter(filter.id);
    if (activeFilterId === filter.id) setActiveFilterId(null);
    toast.success("Filtro eliminado");
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/10 ring-1 ring-destructive/20">
            <BellRing className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Alertas</h1>
            <p className="text-sm text-muted-foreground">
              Gestión de contratos próximos a vencer
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refetch} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Actualizar
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo filtro
          </Button>
        </div>
      </div>

      {/* Filtros dinámicos */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">Filtros de visualización</span>
          <Button variant="ghost" size="sm" onClick={() => resetFilters()} className="gap-2 text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar por defecto
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilterId(null)}
            className={cn(
              "px-3 py-2 rounded-xl border text-sm transition-colors",
              !activeFilterId
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/40 border-border hover:bg-muted"
            )}
          >
            Todos <span className="ml-1 opacity-80">({contracts.length})</span>
          </button>
          {filters.map((filter) => (
            <div
              key={filter.id}
              className={cn(
                "group flex items-center rounded-xl border transition-colors",
                activeFilterId === filter.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 border-border hover:bg-muted"
              )}
            >
              <button
                onClick={() => setActiveFilterId(filter.id)}
                className="px-3 py-2 text-sm"
                title={`Hasta ${filter.dias} día(s)`}
              >
                {filter.label} <span className="ml-1 opacity-80">({countFor(filter.dias)})</span>
              </button>
              <span className="flex items-center pr-2 gap-1">
                <button
                  onClick={() => openEdit(filter)}
                  className="p-1 rounded-md hover:bg-background/20"
                  aria-label={`Editar filtro ${filter.label}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleRemove(filter)}
                  className="p-1 rounded-md hover:bg-background/20"
                  aria-label={`Eliminar filtro ${filter.label}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <p className="text-sm text-muted-foreground">Próximos a vencer</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {contracts.filter((c) => c.diasRestantes >= 0).length}
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <p className="text-sm text-muted-foreground">Vencen esta semana</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {contracts.filter((c) => c.diasRestantes >= 0 && c.diasRestantes <= 7).length}
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <p className="text-sm text-muted-foreground">Vencidos</p>
          <p className="text-2xl font-bold text-destructive mt-1">{vencidos}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por contrato, cliente o descripción..."
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <CalendarClock className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No hay contratos próximos a vencer con este filtro.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Fecha de fin</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const s = severity(c.diasRestantes);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.numero}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{c.cliente}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground text-sm">
                      {c.descripcion}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(c.fecha_fin)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("gap-1", s.className)}>
                        {c.diasRestantes <= 0 && <AlertTriangle className="h-3 w-3" />}
                        {s.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/contratos?search=${encodeURIComponent(c.numero)}`)}
                      >
                        Ver contrato
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar filtro" : "Nuevo filtro"}</DialogTitle>
            <DialogDescription>
              Define un rango de días para agrupar los contratos próximos a vencer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filter-label">Nombre</Label>
              <Input
                id="filter-label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Ej. Dos meses"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-dias">Días</Label>
              <Input
                id="filter-dias"
                type="number"
                min={0}
                value={form.dias}
                onChange={(e) => setForm((f) => ({ ...f, dias: e.target.value }))}
                placeholder="Ej. 60"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveFilter}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

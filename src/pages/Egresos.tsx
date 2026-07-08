import { useState, useMemo } from "react";
import { Plus, Search, Wallet, Loader2, CheckCircle2, Clock, Trash2, Eye, Pencil, FileText, ThumbsUp, XCircle, Ban, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useExpenses, type Expense } from "@/hooks/useExpenses";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { ExpenseStatusBadge } from "@/components/egresos/ExpenseStatusBadge";
import { CreateExpenseDialog } from "@/components/egresos/CreateExpenseDialog";
import { ExpenseDetailModal } from "@/components/egresos/ExpenseDetailModal";
import { EditExpenseDialog } from "@/components/egresos/EditExpenseDialog";
import { useCurrentPermisos } from "@/hooks/useCurrentPermisos";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BlurredValue } from "@/components/ui/BlurredValue";

type DateFilter = "hoy" | "semana" | "mes" | "anio" | "todos";
const dateFilterLabels: Record<DateFilter, string> = {
  hoy: "Hoy",
  semana: "Esta semana",
  mes: "Este mes",
  anio: "Este año",
  todos: "Todos",
};

const parseDate = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const formatDate = (s: string | null) => {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};
const fmtMoney = (n: number, c = "PEN") =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: c }).format(n || 0);

const Egresos = () => {
  const { expenses, loading, refresh } = useExpenses();
  const { categories } = useExpenseCategories();
  const { can } = useCurrentPermisos();
  const canEdit = can("egresos", "editar");
  const canDelete = can("egresos", "eliminar");
  const canCreate = can("egresos", "crear");

  const [openCreate, setOpenCreate] = useState(false);
  const [detail, setDetail] = useState<Expense | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<string>("all");
  const [categoria, setCategoria] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("mes");

  const getDateRange = (f: DateFilter): { start: Date; end: Date } | null => {
    if (f === "todos") return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (f === "hoy") return { start: today, end: new Date(today.getTime() + 86400000 - 1) };
    if (f === "semana") {
      const day = today.getDay() || 7;
      const start = new Date(today); start.setDate(today.getDate() - (day - 1));
      const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
      return { start, end };
    }
    if (f === "mes") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23,59,59,999);
      return { start, end };
    }
    // anio
    const start = new Date(today.getFullYear(), 0, 1);
    const end = new Date(today.getFullYear(), 11, 31, 23,59,59,999);
    return { start, end };
  };

  const range = getDateRange(dateFilter);

  // First apply date + search + category (used for state KPI counts)
  const scopedByBase = useMemo(() => {
    return expenses.filter((e) => {
      if (categoria !== "all" && e.categoria_id !== categoria) return false;
      if (range && e.fecha_egreso) {
        const d = parseDate(e.fecha_egreso);
        if (d < range.start || d > range.end) return false;
      }
      if (search) {
        const s = search.toLowerCase();
        if (
          !e.codigo.toLowerCase().includes(s) &&
          !(e.proveedor_nombre || "").toLowerCase().includes(s) &&
          !(e.descripcion || "").toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
  }, [expenses, search, categoria, dateFilter]);

  const filtered = useMemo(() => {
    return scopedByBase.filter((e) => (estado === "all" ? true : e.estado === estado));
  }, [scopedByBase, estado]);

  const stats = useMemo(() => {
    const count = (st: string) => scopedByBase.filter((e) => e.estado === st).length;
    return {
      total: scopedByBase.length,
      montoTotal: scopedByBase.reduce((a, x) => a + Number(x.total || 0), 0),
      pendiente: count("pendiente"),
      aprobado: count("aprobado"),
      pagado: count("pagado"),
      rechazado: count("rechazado"),
      borrador: count("borrador"),
    };
  }, [scopedByBase]);

  const toggleEstado = (val: string) => setEstado((prev) => (prev === val ? "all" : val));

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    scopedByBase.forEach((e) => {
      if (e.categoria_id) map.set(e.categoria_id, (map.get(e.categoria_id) || 0) + 1);
    });
    return map;
  }, [scopedByBase]);

  const handleDelete = async (id: string, codigo: string) => {
    if (!confirm(`¿Eliminar el egreso ${codigo}? Esta acción no se puede deshacer.`)) return;
    try {
      const { error } = await (supabase as any).from("expenses").delete().eq("id", id);
      if (error) throw error;
      toast.success("Egreso eliminado");
      refresh();
    } catch (e: any) {
      toast.error("Error: " + e.message);
    }
  };

  const statCards = [
    { key: "all", label: "Total", value: stats.total, icon: Wallet, color: "text-primary", bg: "bg-primary/10" },
    { key: "pendiente", label: "Pendientes", value: stats.pendiente, icon: Clock, color: "text-amber-700", bg: "bg-amber-100" },
    { key: "aprobado", label: "Aprobados", value: stats.aprobado, icon: ThumbsUp, color: "text-blue-700", bg: "bg-blue-100" },
    { key: "pagado", label: "Pagados", value: stats.pagado, icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-100" },
    { key: "rechazado", label: "Rechazados", value: stats.rechazado, icon: XCircle, color: "text-rose-700", bg: "bg-rose-100" },
    { key: "borrador", label: "Borradores", value: stats.borrador, icon: FileText, color: "text-slate-700", bg: "bg-slate-100" },
  ];

  return (
    <div className="p-6 space-y-6 font-jakarta">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wallet className="h-7 w-7 text-primary" />
            Registro de Egresos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona los gastos y egresos de la empresa
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nuevo Egreso
          </Button>
        )}
      </div>

      {/* Monto total (informativo) */}
      <Card className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase">Monto total filtrado</p>
          <p className="text-3xl font-bold mt-1"><BlurredValue>{fmtMoney(stats.montoTotal)}</BlurredValue></p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</p>
          <p className="text-xs mt-1">Rango: {dateFilterLabels[dateFilter]}</p>
        </div>
      </Card>

      {/* Stats clickables por estado */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          const active = estado === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => (s.key === "all" ? setEstado("all") : toggleEstado(s.key))}
              className={`bg-card rounded-xl border p-4 flex items-center gap-3 text-left transition-all hover:shadow-md hover:border-primary/40 ${active ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
            >
              <div className={`p-3 rounded-lg ${s.bg}`}>
                <Icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filtro de fecha */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(dateFilterLabels) as DateFilter[]).map((f) => (
          <Button
            key={f}
            variant={dateFilter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setDateFilter(f)}
            className={dateFilter === f ? "btn-gradient" : ""}
          >
            {dateFilterLabels[f]}
          </Button>
        ))}
      </div>

      {/* Búsqueda + Categorías como chips */}
      <Card className="p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por código, proveedor o descripción..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" /> Categoría:</span>
          <Badge
            variant={categoria === "all" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setCategoria("all")}
          >
            Todas
          </Badge>
          {categories.map((c) => {
            const active = categoria === c.id;
            const count = categoryCounts.get(c.id) || 0;
            return (
              <Badge
                key={c.id}
                variant={active ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setCategoria(active ? "all" : c.id)}
              >
                {c.nombre}
                <span className="ml-1 opacity-70">({count})</span>
              </Badge>
            );
          })}
        </div>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No hay egresos registrados</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => {
                const cat = categories.find((c) => c.id === e.categoria_id)?.nombre || "—";
                const doc = [e.tipo_documento, e.serie_documento, e.numero_documento].filter(Boolean).join(" ") || "—";
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.codigo}</TableCell>
                    <TableCell>{formatDate(e.fecha_egreso)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{e.proveedor_nombre || "—"}</TableCell>
                    <TableCell>{cat}</TableCell>
                    <TableCell className="text-xs">{doc}</TableCell>
                    <TableCell className="text-right font-semibold"><BlurredValue>{fmtMoney(Number(e.total), e.moneda)}</BlurredValue></TableCell>
                    <TableCell><ExpenseStatusBadge estado={e.estado} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => setDetail(e)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Ver detalle
                        </Button>
                        {canEdit && e.estado !== "pagado" && e.estado !== "anulado" && (
                          <Button variant="outline" size="sm" onClick={() => setEditing(e)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                          </Button>
                        )}
                        {canDelete && e.estado !== "pagado" && (
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id, e.codigo)} title="Eliminar">
                            <Trash2 className="h-4 w-4 text-rose-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <CreateExpenseDialog open={openCreate} onOpenChange={setOpenCreate} onCreated={refresh} />
      <EditExpenseDialog
        expense={editing}
        open={!!editing}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        onSaved={refresh}
      />
      <ExpenseDetailModal
        expense={detail}
        open={!!detail}
        onOpenChange={(o) => { if (!o) setDetail(null); }}
        onChanged={() => { refresh(); }}
      />
    </div>
  );
};

export default Egresos;
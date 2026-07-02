import { useState, useMemo } from "react";
import { Plus, Search, Wallet, Loader2, CheckCircle2, Clock, Trash2, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [estado, setEstado] = useState("all");
  const [categoria, setCategoria] = useState("all");

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (estado !== "all" && e.estado !== estado) return false;
      if (categoria !== "all" && e.categoria_id !== categoria) return false;
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
  }, [expenses, search, estado, categoria]);

  const totals = useMemo(() => {
    const total = filtered.reduce((a, x) => a + Number(x.total || 0), 0);
    const pendientes = filtered.filter((e) => e.estado === "pendiente").length;
    const pagados = filtered.filter((e) => e.estado === "pagado").length;
    return { total, pendientes, pagados, count: filtered.length };
  }, [filtered]);

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

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Total filtrado</p>
          <p className="text-2xl font-bold mt-1"><BlurredValue>{fmtMoney(totals.total)}</BlurredValue></p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Registros</p>
          <p className="text-2xl font-bold mt-1">{totals.count}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase flex items-center gap-1"><Clock className="h-3 w-3" /> Pendientes</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{totals.pendientes}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Pagados</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{totals.pagados}</p>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por código, proveedor o descripción..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="borrador">Borrador</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="aprobado">Aprobado</SelectItem>
              <SelectItem value="rechazado">Rechazado</SelectItem>
              <SelectItem value="pagado">Pagado</SelectItem>
              <SelectItem value="anulado">Anulado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
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
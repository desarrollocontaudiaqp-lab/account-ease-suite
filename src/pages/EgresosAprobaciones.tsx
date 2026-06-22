import { useState, useMemo } from "react";
import { CheckSquare, Loader2, Eye, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useExpenses, type Expense } from "@/hooks/useExpenses";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { ExpenseStatusBadge } from "@/components/egresos/ExpenseStatusBadge";
import { ExpenseDetailModal } from "@/components/egresos/ExpenseDetailModal";
import { BlurredValue } from "@/components/ui/BlurredValue";
import { useAuth } from "@/hooks/useAuth";
import { useSystemConfig } from "@/hooks/useSystemConfig";

const formatDate = (s: string | null) => {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};
const fmtMoney = (n: number, c = "PEN") =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: c }).format(n || 0);

const EgresosAprobaciones = () => {
  const { expenses, loading, refresh } = useExpenses();
  const { categories } = useExpenseCategories();
  const { role } = useAuth();
  const { config } = useSystemConfig();
  const approvalEnabled = config.expense_approval_enabled;
  const isApprover = role === "administrador" || role === "gerente";
  const [detail, setDetail] = useState<Expense | null>(null);

  const pendientes = useMemo(
    () => expenses.filter((e) => e.estado === "pendiente"),
    [expenses]
  );
  const totalPendiente = useMemo(
    () => pendientes.reduce((a, x) => a + Number(x.total || 0), 0),
    [pendientes]
  );

  return (
    <div className="p-6 space-y-6 font-jakarta">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CheckSquare className="h-7 w-7 text-primary" />
          Aprobaciones de Egresos
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cola de egresos pendientes de aprobación
        </p>
      </div>

      {!approvalEnabled && (
        <Card className="p-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                Aprobación de egresos deshabilitada
              </p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                Los egresos se aprueban automáticamente al registrarse. Esta cola permanecerá vacía mientras el flujo de aprobación esté desactivado en Configuración → Sistema.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Pendientes</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{pendientes.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Monto total</p>
          <p className="text-2xl font-bold mt-1"><BlurredValue>{fmtMoney(totalPendiente)}</BlurredValue></p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Tu rol</p>
          <p className="text-2xl font-bold mt-1 capitalize">{role || "—"}</p>
          {!isApprover && (
            <p className="text-xs text-rose-600 mt-1">No tienes permisos de aprobación</p>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : pendientes.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No hay egresos pendientes de aprobación</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendientes.map((e) => {
                const cat = categories.find((c) => c.id === e.categoria_id)?.nombre || "—";
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.codigo}</TableCell>
                    <TableCell>{formatDate(e.fecha_egreso)}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{e.proveedor_nombre || "—"}</TableCell>
                    <TableCell>{cat}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-xs">{e.descripcion}</TableCell>
                    <TableCell className="text-right font-semibold">
                      <BlurredValue>{fmtMoney(Number(e.total), e.moneda)}</BlurredValue>
                    </TableCell>
                    <TableCell><ExpenseStatusBadge estado={e.estado} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setDetail(e)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Revisar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <ExpenseDetailModal
        expense={detail}
        open={!!detail}
        onOpenChange={(o) => { if (!o) setDetail(null); }}
        onChanged={refresh}
      />
    </div>
  );
};

export default EgresosAprobaciones;
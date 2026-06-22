import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExpenseStatusBadge } from "./ExpenseStatusBadge";
import { ExpenseAttachments } from "./ExpenseAttachments";
import { ExpenseApprovalActions } from "./ExpenseApprovalActions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Expense } from "@/hooks/useExpenses";
import { History, MessageSquare } from "lucide-react";
import { BlurredValue } from "@/components/ui/BlurredValue";

interface Props {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}

const formatDate = (s: string | null) => {
  if (!s) return "—";
  const [y, m, d] = s.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
};
const formatDateTime = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
};
const fmtMoney = (n: number, c = "PEN") =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: c }).format(n || 0);

const ESTADO_MAP: Record<string, string> = {
  borrador: "Borrador", pendiente: "Pendiente", aprobado: "Aprobado",
  rechazado: "Rechazado", pagado: "Pagado", anulado: "Anulado",
};

export function ExpenseDetailModal({ expense, open, onOpenChange, onChanged }: Props) {
  const { role } = useAuth();
  const isAdmin = role === "administrador" || role === "gerente";
  const [history, setHistory] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);

  useEffect(() => {
    if (!expense || !open) return;
    (async () => {
      const [{ data: h }, { data: a }] = await Promise.all([
        (supabase as any).from("expense_status_history").select("*").eq("expense_id", expense.id).order("created_at", { ascending: false }),
        (supabase as any).from("expense_approvals").select("*").eq("expense_id", expense.id).order("created_at", { ascending: false }),
      ]);
      setHistory(h || []);
      setApprovals(a || []);
    })();
  }, [expense, open]);

  if (!expense) return null;
  const canEdit = isAdmin && expense.estado !== "anulado" && expense.estado !== "pagado";

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value || "—"}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto font-jakarta">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-3">
                <span className="font-mono text-base">{expense.codigo}</span>
                <ExpenseStatusBadge estado={expense.estado} />
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{expense.descripcion}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <ExpenseApprovalActions expenseId={expense.id} estado={expense.estado} onChanged={onChanged} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-4 lg:col-span-2 space-y-4">
              <h3 className="font-semibold text-sm">Información general</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Field label="Fecha de egreso" value={formatDate(expense.fecha_egreso)} />
                <Field label="Fecha de emisión" value={formatDate(expense.fecha_emision)} />
                <Field label="Moneda" value={expense.moneda} />
                <Field label="Proveedor" value={expense.proveedor_nombre} />
                <Field label="RUC/DNI" value={expense.proveedor_documento} />
                <Field label="Centro de costo" value={expense.centro_costo} />
                <Field label="Tipo doc." value={expense.tipo_documento} />
                <Field label="Serie" value={expense.serie_documento} />
                <Field label="Número" value={expense.numero_documento} />
              </div>

              <Separator />
              <h3 className="font-semibold text-sm">Importes</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Subtotal" value={<BlurredValue>{fmtMoney(Number(expense.subtotal), expense.moneda)}</BlurredValue>} />
                <Field label="IGV" value={<BlurredValue>{fmtMoney(Number(expense.igv), expense.moneda)}</BlurredValue>} />
                <Field label="Otros impuestos" value={<BlurredValue>{fmtMoney(Number(expense.otros_impuestos), expense.moneda)}</BlurredValue>} />
                <Field label="Total" value={<span className="text-lg font-bold"><BlurredValue>{fmtMoney(Number(expense.total), expense.moneda)}</BlurredValue></span>} />
              </div>

              <Separator />
              <h3 className="font-semibold text-sm">Pago</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Field label="Método" value={expense.metodo_pago} />
                <Field label="Banco" value={expense.banco} />
                <Field label="Cuenta / referencia" value={expense.referencia_pago || expense.cuenta_bancaria} />
                <Field label="Aprobado por" value={expense.approved_by ? "Usuario " + expense.approved_by.slice(0, 8) : "—"} />
                <Field label="Aprobado el" value={formatDateTime(expense.approved_at)} />
                <Field label="Pagado el" value={formatDateTime(expense.paid_at)} />
              </div>

              {expense.observaciones && (
                <>
                  <Separator />
                  <Field label="Observaciones" value={<span className="whitespace-pre-wrap">{expense.observaciones}</span>} />
                </>
              )}
            </Card>

            <div className="space-y-4">
              <Card className="p-4">
                <ExpenseAttachments expenseId={expense.id} canEdit={canEdit} />
              </Card>

              <Card className="p-4 space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <History className="h-4 w-4" /> Historial de estados
                </h3>
                {history.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin movimientos</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {history.map((h) => (
                      <div key={h.id} className="text-xs border-l-2 border-primary/40 pl-2">
                        <p className="font-medium">
                          {h.estado_anterior ? `${ESTADO_MAP[h.estado_anterior]} → ` : ""}{ESTADO_MAP[h.estado_nuevo]}
                        </p>
                        <p className="text-muted-foreground">{formatDateTime(h.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {approvals.length > 0 && (
                <Card className="p-4 space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" /> Aprobaciones
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {approvals.map((a) => (
                      <div key={a.id} className="text-xs border-l-2 border-amber-400 pl-2">
                        <p className="font-medium capitalize">{a.accion}</p>
                        {a.comentario && <p className="text-muted-foreground italic">"{a.comentario}"</p>}
                        <p className="text-muted-foreground">{formatDateTime(a.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
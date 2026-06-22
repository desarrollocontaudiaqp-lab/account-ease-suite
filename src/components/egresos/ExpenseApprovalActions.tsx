import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { Send, CheckCircle2, XCircle, DollarSign, Ban } from "lucide-react";

type Estado = "borrador" | "pendiente" | "aprobado" | "rechazado" | "pagado" | "anulado";

interface Props {
  expenseId: string;
  estado: Estado;
  onChanged: () => void;
}

export function ExpenseApprovalActions({ expenseId, estado, onChanged }: Props) {
  const { user, role } = useAuth();
  const { config } = useSystemConfig();
  const approvalEnabled = config.expense_approval_enabled;
  const isApprover = role === "administrador" || role === "gerente";
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<null | "aprobar" | "rechazar">(null);
  const [comentario, setComentario] = useState("");

  const updateEstado = async (nuevo: Estado, extra: Record<string, any> = {}) => {
    setBusy(true);
    try {
      const { error } = await (supabase as any)
        .from("expenses")
        .update({ estado: nuevo, ...extra })
        .eq("id", expenseId);
      if (error) throw error;
      toast.success(`Estado actualizado a ${nuevo}`);
      onChanged();
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAprobar = async () => {
    setBusy(true);
    try {
      const { error: e1 } = await (supabase as any)
        .from("expenses")
        .update({ estado: "aprobado", approved_by: user?.id, approved_at: new Date().toISOString() })
        .eq("id", expenseId);
      if (e1) throw e1;
      if (comentario.trim()) {
        await (supabase as any).from("expense_approvals").insert({
          expense_id: expenseId, user_id: user?.id, accion: "aprobar", comentario: comentario.trim(),
        });
      }
      toast.success("Egreso aprobado");
      setDialog(null); setComentario(""); onChanged();
    } catch (e: any) { toast.error("Error: " + e.message); }
    finally { setBusy(false); }
  };

  const handleRechazar = async () => {
    if (!comentario.trim()) { toast.error("El motivo del rechazo es obligatorio"); return; }
    setBusy(true);
    try {
      const { error: e1 } = await (supabase as any)
        .from("expenses").update({ estado: "rechazado" }).eq("id", expenseId);
      if (e1) throw e1;
      await (supabase as any).from("expense_approvals").insert({
        expense_id: expenseId, user_id: user?.id, accion: "rechazar", comentario: comentario.trim(),
      });
      toast.success("Egreso rechazado");
      setDialog(null); setComentario(""); onChanged();
    } catch (e: any) { toast.error("Error: " + e.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {approvalEnabled && estado === "borrador" && (
          <Button size="sm" onClick={() => updateEstado("pendiente")} disabled={busy}>
            <Send className="h-3 w-3 mr-1" /> Enviar a aprobación
          </Button>
        )}
        {approvalEnabled && estado === "pendiente" && isApprover && (
          <>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setDialog("aprobar")} disabled={busy}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Aprobar
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setDialog("rechazar")} disabled={busy}>
              <XCircle className="h-3 w-3 mr-1" /> Rechazar
            </Button>
          </>
        )}
        {/* When approval is disabled, borradores legacy pueden auto-aprobarse para luego pagarse */}
        {!approvalEnabled && estado === "borrador" && (
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => updateEstado("aprobado", { approved_by: user?.id, approved_at: new Date().toISOString() })}
            disabled={busy}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" /> Auto-aprobar
          </Button>
        )}
        {estado === "aprobado" && (isApprover || !approvalEnabled) && (
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => updateEstado("pagado", { paid_at: new Date().toISOString() })} disabled={busy}>
            <DollarSign className="h-3 w-3 mr-1" /> Marcar como pagado
          </Button>
        )}
        {(estado === "borrador" || estado === "pendiente" || estado === "rechazado") &&
          (isApprover || !approvalEnabled) && (
          <Button size="sm" variant="outline" onClick={() => updateEstado("anulado")} disabled={busy}>
            <Ban className="h-3 w-3 mr-1" /> Anular
          </Button>
        )}
      </div>

      <Dialog open={!!dialog} onOpenChange={(o) => { if (!o) { setDialog(null); setComentario(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "aprobar" ? "Aprobar egreso" : "Rechazar egreso"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Comentario {dialog === "rechazar" && <span className="text-rose-600">*</span>}
            </label>
            <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={4}
              placeholder={dialog === "rechazar" ? "Motivo del rechazo..." : "Comentario (opcional)"} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>Cancelar</Button>
            <Button onClick={dialog === "aprobar" ? handleAprobar : handleRechazar} disabled={busy}
              className={dialog === "aprobar" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              variant={dialog === "rechazar" ? "destructive" : "default"}>
              {busy ? "Procesando..." : dialog === "aprobar" ? "Confirmar aprobación" : "Confirmar rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
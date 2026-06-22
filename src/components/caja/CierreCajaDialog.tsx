import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowDownCircle, ArrowUpCircle, Loader2, Save, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSedeContext } from "@/hooks/useSedeContext";

type Tipo = "parcial" | "diario";

interface Props {
  open: boolean;
  onClose: () => void;
  tipo: Tipo;
  onSaved: () => void;
}

const fmt = (n: number, c = "PEN") =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: c }).format(n || 0);

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalISO = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function CierreCajaDialog({ open, onClose, tipo, onSaved }: Props) {
  const { user } = useAuth();
  const { activeSedeId } = useSedeContext();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [egresos, setEgresos] = useState<any[]>([]);
  const [obs, setObs] = useState("");

  // Window: cierre diario = todo el día; parcial = desde 00:00 hasta ahora
  const { horaInicio, horaFin, fechaISO } = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = tipo === "diario" ? (() => { const d = new Date(now); d.setHours(23, 59, 59, 999); return d; })() : now;
    return { horaInicio: start, horaFin: end, fechaISO: toLocalISO(now) };
  }, [tipo, open]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        // INGRESOS: pagos con status 'pagado' cuya fecha_pago = hoy
        let pagosQ: any = supabase
          .from("pagos")
          .select(`id, monto, fecha_pago, metodo_pago, referencia, status, contrato:contratos(codigo, sede_id, cliente:clientes(razon_social))`)
          .eq("status", "pagado")
          .eq("fecha_pago", fechaISO);
        const { data: pagosData, error: pErr } = await pagosQ;
        if (pErr) throw pErr;
        let ing = (pagosData || []) as any[];
        if (activeSedeId) ing = ing.filter((p) => p.contrato?.sede_id === activeSedeId);

        // EGRESOS: expenses 'pagado' del día
        let expQ: any = (supabase as any)
          .from("expenses")
          .select("id, codigo, total, moneda, fecha_egreso, proveedor_nombre, metodo_pago, descripcion, sede_id, paid_at, estado")
          .eq("estado", "pagado");
        if (activeSedeId) expQ = expQ.eq("sede_id", activeSedeId);
        const { data: expData, error: eErr } = await expQ;
        if (eErr) throw eErr;
        const startMs = horaInicio.getTime();
        const endMs = horaFin.getTime();
        const eg = (expData || []).filter((x: any) => {
          const t = x.paid_at ? new Date(x.paid_at).getTime() : new Date(x.fecha_egreso + "T12:00:00").getTime();
          return t >= startMs && t <= endMs;
        });

        setIngresos(ing);
        setEgresos(eg);
      } catch (e: any) {
        toast.error("Error al cargar movimientos: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, tipo, fechaISO, activeSedeId, horaInicio, horaFin]);

  const totales = useMemo(() => {
    const ti = ingresos.reduce((a, x) => a + Number(x.monto || 0), 0);
    const te = egresos.reduce((a, x) => a + Number(x.total || 0), 0);
    return { ti, te, saldo: ti - te };
  }, [ingresos, egresos]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: codeData, error: codeErr } = await (supabase as any).rpc("get_next_caja_code");
      if (codeErr) throw codeErr;

      const payload = {
        codigo: codeData,
        tipo,
        sede_id: activeSedeId || null,
        fecha: fechaISO,
        hora_inicio: horaInicio.toISOString(),
        hora_fin: horaFin.toISOString(),
        total_ingresos: totales.ti,
        total_egresos: totales.te,
        saldo: totales.saldo,
        cantidad_ingresos: ingresos.length,
        cantidad_egresos: egresos.length,
        moneda: "PEN",
        detalle: {
          ingresos: ingresos.map((p) => ({
            id: p.id, monto: Number(p.monto || 0), metodo_pago: p.metodo_pago,
            referencia: p.referencia, contrato: p.contrato?.codigo,
            cliente: p.contrato?.cliente?.razon_social,
          })),
          egresos: egresos.map((e) => ({
            id: e.id, codigo: e.codigo, total: Number(e.total || 0),
            proveedor: e.proveedor_nombre, metodo_pago: e.metodo_pago,
            descripcion: e.descripcion,
          })),
        },
        observaciones: obs || null,
        created_by: user?.id || null,
      };

      const { error } = await (supabase as any).from("caja_cierres").insert(payload);
      if (error) throw error;
      toast.success(`Cierre ${tipo === "diario" ? "diario" : "parcial"} ${codeData} guardado`);
      onSaved();
      onClose();
      setObs("");
    } catch (e: any) {
      toast.error("Error al guardar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto font-jakarta">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Cierre de Caja {tipo === "diario" ? "Diario" : "Parcial"}
          </DialogTitle>
          <DialogDescription>
            {tipo === "diario"
              ? `Consolida todos los movimientos del día ${fechaISO}.`
              : `Movimientos desde las 00:00 hasta ${horaFin.toLocaleTimeString("es-PE")} del ${fechaISO}.`}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 border-l-4 border-l-emerald-500">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowDownCircle className="h-4 w-4 text-emerald-500" /> Ingresos</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">{fmt(totales.ti)}</div>
                <div className="text-xs text-muted-foreground">{ingresos.length} movimientos</div>
              </Card>
              <Card className="p-4 border-l-4 border-l-rose-500">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowUpCircle className="h-4 w-4 text-rose-500" /> Egresos</div>
                <div className="text-2xl font-bold text-rose-600 mt-1">{fmt(totales.te)}</div>
                <div className="text-xs text-muted-foreground">{egresos.length} movimientos</div>
              </Card>
              <Card className={`p-4 border-l-4 ${totales.saldo >= 0 ? "border-l-primary" : "border-l-amber-500"}`}>
                <div className="text-sm text-muted-foreground">Saldo</div>
                <div className={`text-2xl font-bold mt-1 ${totales.saldo >= 0 ? "text-primary" : "text-amber-600"}`}>{fmt(totales.saldo)}</div>
                <div className="text-xs text-muted-foreground">Ingresos − Egresos</div>
              </Card>
            </div>

            <Tabs defaultValue="ingresos">
              <TabsList>
                <TabsTrigger value="ingresos">Ingresos ({ingresos.length})</TabsTrigger>
                <TabsTrigger value="egresos">Egresos ({egresos.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="ingresos">
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Contrato</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ingresos.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Sin ingresos en el periodo</TableCell></TableRow>
                      )}
                      {ingresos.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.contrato?.cliente?.razon_social || "—"}</TableCell>
                          <TableCell>{p.contrato?.codigo || "—"}</TableCell>
                          <TableCell>{p.metodo_pago || "—"}</TableCell>
                          <TableCell>{p.referencia || "—"}</TableCell>
                          <TableCell className="text-right font-mono text-emerald-600">{fmt(Number(p.monto || 0))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
              <TabsContent value="egresos">
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {egresos.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Sin egresos en el periodo</TableCell></TableRow>
                      )}
                      {egresos.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-mono text-xs">{e.codigo}</TableCell>
                          <TableCell>{e.proveedor_nombre || "—"}</TableCell>
                          <TableCell className="max-w-xs truncate">{e.descripcion || "—"}</TableCell>
                          <TableCell>{e.metodo_pago || "—"}</TableCell>
                          <TableCell className="text-right font-mono text-rose-600">{fmt(Number(e.total || 0))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
            </Tabs>

            <div>
              <label className="text-sm font-medium">Observaciones</label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Notas del cierre (opcional)" rows={2} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Confirmar Cierre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import type { Expense } from "@/hooks/useExpenses";

interface Props {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}

export function EditExpenseDialog({ expense, open, onOpenChange, onSaved }: Props) {
  const { categories, subcategories } = useExpenseCategories();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expense && open) {
      setForm({
        fecha_egreso: expense.fecha_egreso,
        fecha_emision: expense.fecha_emision || "",
        proveedor_nombre: expense.proveedor_nombre || "",
        proveedor_documento: expense.proveedor_documento || "",
        tipo_documento: expense.tipo_documento || "",
        serie_documento: expense.serie_documento || "",
        numero_documento: expense.numero_documento || "",
        categoria_id: expense.categoria_id || "",
        subcategoria_id: expense.subcategoria_id || "",
        centro_costo: expense.centro_costo || "",
        moneda: expense.moneda || "PEN",
        subtotal: String(expense.subtotal ?? 0),
        igv: String(expense.igv ?? 0),
        otros_impuestos: String(expense.otros_impuestos ?? 0),
        total: String(expense.total ?? 0),
        metodo_pago: expense.metodo_pago || "",
        banco: expense.banco || "",
        cuenta_bancaria: expense.cuenta_bancaria || "",
        referencia_pago: expense.referencia_pago || "",
        descripcion: expense.descripcion || "",
        observaciones: expense.observaciones || "",
      });
    }
  }, [expense, open]);

  useEffect(() => {
    if (!form) return;
    const s = parseFloat(form.subtotal || "0");
    const i = parseFloat(form.igv || "0");
    const o = parseFloat(form.otros_impuestos || "0");
    const total = (s + i + o).toFixed(2);
    if (total !== form.total) setForm((p: any) => ({ ...p, total }));
  }, [form?.subtotal, form?.igv, form?.otros_impuestos]);

  if (!expense || !form) return null;
  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));
  const filteredSubs = subcategories.filter((s) => s.categoria_id === form.categoria_id);

  const handleSave = async () => {
    if (!form.proveedor_nombre.trim()) { toast.error("El proveedor es obligatorio"); return; }
    if (!form.descripcion.trim()) { toast.error("La descripción es obligatoria"); return; }
    setSaving(true);
    try {
      const payload: any = {
        fecha_egreso: form.fecha_egreso,
        fecha_emision: form.fecha_emision || null,
        proveedor_nombre: form.proveedor_nombre.trim(),
        proveedor_documento: form.proveedor_documento || null,
        tipo_documento: form.tipo_documento || null,
        serie_documento: form.serie_documento || null,
        numero_documento: form.numero_documento || null,
        categoria_id: form.categoria_id || null,
        subcategoria_id: form.subcategoria_id || null,
        centro_costo: form.centro_costo || null,
        moneda: form.moneda,
        subtotal: parseFloat(form.subtotal) || 0,
        igv: parseFloat(form.igv) || 0,
        otros_impuestos: parseFloat(form.otros_impuestos) || 0,
        total: parseFloat(form.total) || 0,
        metodo_pago: form.metodo_pago || null,
        banco: form.banco || null,
        cuenta_bancaria: form.cuenta_bancaria || null,
        referencia_pago: form.referencia_pago || null,
        descripcion: form.descripcion.trim(),
        observaciones: form.observaciones || null,
      };
      const { error } = await (supabase as any).from("expenses").update(payload).eq("id", expense.id);
      if (error) throw error;
      toast.success("Egreso actualizado");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Error al actualizar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto font-jakarta">
        <DialogHeader>
          <DialogTitle>Editar Egreso · <span className="font-mono">{expense.codigo}</span></DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Fecha egreso</Label>
              <Input type="date" value={form.fecha_egreso} onChange={(e) => set("fecha_egreso", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Fecha emisión</Label>
              <Input type="date" value={form.fecha_emision} onChange={(e) => set("fecha_emision", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Moneda</Label>
              <Select value={form.moneda} onValueChange={(v) => set("moneda", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PEN">PEN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label>Proveedor *</Label>
              <Input value={form.proveedor_nombre} onChange={(e) => set("proveedor_nombre", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>RUC / DNI</Label>
              <Input value={form.proveedor_documento} onChange={(e) => set("proveedor_documento", e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Categoría</Label>
              <Select value={form.categoria_id} onValueChange={(v) => setForm((p: any) => ({ ...p, categoria_id: v, subcategoria_id: "" }))}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Subcategoría</Label>
              <Select value={form.subcategoria_id} onValueChange={(v) => set("subcategoria_id", v)} disabled={!form.categoria_id}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {filteredSubs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Centro de costo</Label>
              <Input value={form.centro_costo} onChange={(e) => set("centro_costo", e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Tipo documento</Label>
              <Input value={form.tipo_documento} onChange={(e) => set("tipo_documento", e.target.value)} placeholder="Factura, Boleta..." />
            </div>
            <div className="space-y-1">
              <Label>Serie</Label>
              <Input value={form.serie_documento} onChange={(e) => set("serie_documento", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Número</Label>
              <Input value={form.numero_documento} onChange={(e) => set("numero_documento", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>Subtotal</Label>
              <Input type="number" step="0.01" value={form.subtotal} onChange={(e) => set("subtotal", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>IGV</Label>
              <Input type="number" step="0.01" value={form.igv} onChange={(e) => set("igv", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Otros impuestos</Label>
              <Input type="number" step="0.01" value={form.otros_impuestos} onChange={(e) => set("otros_impuestos", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Total</Label>
              <Input type="number" step="0.01" value={form.total} readOnly className="bg-muted font-semibold" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Método de pago</Label>
              <Input value={form.metodo_pago} onChange={(e) => set("metodo_pago", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Banco</Label>
              <Input value={form.banco} onChange={(e) => set("banco", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Cuenta bancaria</Label>
              <Input value={form.cuenta_bancaria} onChange={(e) => set("cuenta_bancaria", e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>Referencia de pago</Label>
              <Input value={form.referencia_pago} onChange={(e) => set("referencia_pago", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Descripción *</Label>
            <Textarea rows={2} value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Observaciones</Label>
            <Textarea rows={3} value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
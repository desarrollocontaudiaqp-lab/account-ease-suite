import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}

const initial = {
  fecha_egreso: new Date().toISOString().slice(0, 10),
  fecha_emision: "",
  proveedor_nombre: "",
  proveedor_documento: "",
  tipo_documento: "",
  serie_documento: "",
  numero_documento: "",
  categoria_id: "",
  subcategoria_id: "",
  centro_costo: "",
  moneda: "PEN",
  subtotal: "0",
  igv: "0",
  otros_impuestos: "0",
  total: "0",
  metodo_pago: "",
  banco: "",
  cuenta_bancaria: "",
  referencia_pago: "",
  descripcion: "",
  observaciones: "",
};

export function CreateExpenseDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const { categories, subcategories } = useExpenseCategories();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(initial); }, [open]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Auto-calculate total
  useEffect(() => {
    const s = parseFloat(form.subtotal || "0");
    const i = parseFloat(form.igv || "0");
    const o = parseFloat(form.otros_impuestos || "0");
    setForm((p) => ({ ...p, total: (s + i + o).toFixed(2) }));
  }, [form.subtotal, form.igv, form.otros_impuestos]);

  const filteredSubs = subcategories.filter((s) => s.categoria_id === form.categoria_id);

  const handleSubmit = async () => {
    if (!form.proveedor_nombre.trim()) { toast.error("El proveedor es obligatorio"); return; }
    if (!form.descripcion.trim()) { toast.error("La descripción es obligatoria"); return; }
    setSaving(true);
    try {
      const { data: codigo, error: cErr } = await (supabase as any).rpc("get_next_expense_code");
      if (cErr) throw cErr;
      const payload: any = {
        codigo,
        estado: "borrador",
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
        created_by: user?.id,
      };
      const { error } = await (supabase as any).from("expenses").insert(payload);
      if (error) throw error;
      toast.success(`Egreso ${codigo} creado`);
      onCreated();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Error al crear egreso: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Egreso</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Fecha de egreso *</Label>
            <Input type="date" value={form.fecha_egreso} onChange={(e) => set("fecha_egreso", e.target.value)} />
          </div>
          <div>
            <Label>Fecha de emisión</Label>
            <Input type="date" value={form.fecha_emision} onChange={(e) => set("fecha_emision", e.target.value)} />
          </div>

          <div className="col-span-2">
            <Label>Proveedor *</Label>
            <Input value={form.proveedor_nombre} onChange={(e) => set("proveedor_nombre", e.target.value)} placeholder="Razón social o nombre" />
          </div>
          <div>
            <Label>RUC/DNI del proveedor</Label>
            <Input value={form.proveedor_documento} onChange={(e) => set("proveedor_documento", e.target.value)} />
          </div>
          <div>
            <Label>Tipo de documento</Label>
            <Select value={form.tipo_documento} onValueChange={(v) => set("tipo_documento", v)}>
              <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Factura">Factura</SelectItem>
                <SelectItem value="Boleta">Boleta</SelectItem>
                <SelectItem value="Recibo por Honorarios">Recibo por Honorarios</SelectItem>
                <SelectItem value="Nota de Crédito">Nota de Crédito</SelectItem>
                <SelectItem value="Ticket">Ticket</SelectItem>
                <SelectItem value="Otros">Otros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Serie</Label>
            <Input value={form.serie_documento} onChange={(e) => set("serie_documento", e.target.value)} />
          </div>
          <div>
            <Label>Número</Label>
            <Input value={form.numero_documento} onChange={(e) => set("numero_documento", e.target.value)} />
          </div>

          <div>
            <Label>Categoría</Label>
            <Select value={form.categoria_id} onValueChange={(v) => { set("categoria_id", v); set("subcategoria_id", ""); }}>
              <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subcategoría</Label>
            <Select value={form.subcategoria_id} onValueChange={(v) => set("subcategoria_id", v)} disabled={!form.categoria_id || filteredSubs.length === 0}>
              <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
              <SelectContent>
                {filteredSubs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Centro de costo</Label>
            <Input value={form.centro_costo} onChange={(e) => set("centro_costo", e.target.value)} />
          </div>
          <div>
            <Label>Moneda</Label>
            <Select value={form.moneda} onValueChange={(v) => set("moneda", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PEN">PEN (Soles)</SelectItem>
                <SelectItem value="USD">USD (Dólares)</SelectItem>
                <SelectItem value="EUR">EUR (Euros)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Subtotal</Label>
            <Input type="number" step="0.01" value={form.subtotal} onChange={(e) => set("subtotal", e.target.value)} />
          </div>
          <div>
            <Label>IGV</Label>
            <Input type="number" step="0.01" value={form.igv} onChange={(e) => set("igv", e.target.value)} />
          </div>
          <div>
            <Label>Otros impuestos</Label>
            <Input type="number" step="0.01" value={form.otros_impuestos} onChange={(e) => set("otros_impuestos", e.target.value)} />
          </div>
          <div>
            <Label>Total</Label>
            <Input type="number" step="0.01" value={form.total} readOnly className="font-semibold" />
          </div>

          <div>
            <Label>Método de pago</Label>
            <Select value={form.metodo_pago} onValueChange={(v) => set("metodo_pago", v)}>
              <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
                <SelectItem value="Yape">Yape</SelectItem>
                <SelectItem value="Plin">Plin</SelectItem>
                <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Crédito">Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Banco</Label>
            <Input value={form.banco} onChange={(e) => set("banco", e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Cuenta bancaria / Referencia</Label>
            <Input value={form.referencia_pago} onChange={(e) => set("referencia_pago", e.target.value)} placeholder="Nro. operación, cheque, etc." />
          </div>

          <div className="col-span-2">
            <Label>Descripción *</Label>
            <Textarea value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} rows={2} />
          </div>
          <div className="col-span-2">
            <Label>Observaciones</Label>
            <Textarea value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "Guardando..." : "Crear Egreso"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
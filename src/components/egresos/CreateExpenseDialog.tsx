import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useAuth } from "@/hooks/useAuth";
import {
  Users, Briefcase, Laptop, Megaphone, Wrench, Landmark, Receipt,
  GraduationCap, Coffee, Crown, TrendingUp, AlertTriangle, Repeat,
  Undo2, ArrowLeft, Calculator, Info, FileText, Wallet, ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}

// ───────────────────────── Category UX configuration ─────────────────────────
type CategoryKey =
  | "Personal" | "Administrativo" | "Tecnológico" | "Comercial" | "Operativo"
  | "Financiero" | "Impuestos" | "Capacitación" | "Representación" | "Dirección"
  | "Inversiones" | "Extraordinarios" | "Intermediario" | "Devoluciones";

interface CategoryUX {
  icon: LucideIcon;
  tone: string; // tailwind classes
  tagline: string;
  proveedorLabel: string;
  proveedorPlaceholder: string;
  documentoLabel: string;
  defaultTipoDoc?: string;
  suggestIGV?: boolean;
  showFiscal: boolean; // tipo doc, serie, numero
  showBanco: boolean;
  centroCostoLabel: string;
  hint: string;
  defaultMetodoPago?: string;
}

const CATEGORY_UX: Record<CategoryKey, CategoryUX> = {
  Personal: {
    icon: Users, tone: "from-rose-500/15 to-rose-500/5 text-rose-600 border-rose-500/30",
    tagline: "Sueldos, planillas, beneficios y bonificaciones",
    proveedorLabel: "Colaborador / Empleado", proveedorPlaceholder: "Nombre del colaborador",
    documentoLabel: "DNI", showFiscal: false, showBanco: true,
    centroCostoLabel: "Área / Sede",
    hint: "Registra pagos al personal: sueldos, gratificaciones, CTS, ESSALUD. Adjunta la boleta de pago en el siguiente paso.",
    defaultMetodoPago: "Transferencia",
  },
  Administrativo: {
    icon: Briefcase, tone: "from-slate-500/15 to-slate-500/5 text-slate-600 border-slate-500/30",
    tagline: "Servicios, alquiler, suministros de oficina",
    proveedorLabel: "Proveedor", proveedorPlaceholder: "Razón social",
    documentoLabel: "RUC", defaultTipoDoc: "Factura", suggestIGV: true,
    showFiscal: true, showBanco: true, centroCostoLabel: "Sede / Oficina",
    hint: "Pagos administrativos como alquileres, luz, agua, internet, útiles y mantenimiento general.",
  },
  Tecnológico: {
    icon: Laptop, tone: "from-indigo-500/15 to-indigo-500/5 text-indigo-600 border-indigo-500/30",
    tagline: "Software, hosting, equipos, licencias",
    proveedorLabel: "Proveedor tecnológico", proveedorPlaceholder: "Ej: Microsoft, AWS, Adobe…",
    documentoLabel: "RUC / ID Fiscal", defaultTipoDoc: "Factura", suggestIGV: true,
    showFiscal: true, showBanco: true, centroCostoLabel: "Producto / Plataforma",
    hint: "Licencias SaaS, suscripciones, hardware y servicios cloud. Para proveedores extranjeros usa moneda USD.",
    defaultMetodoPago: "Tarjeta",
  },
  Comercial: {
    icon: Megaphone, tone: "from-orange-500/15 to-orange-500/5 text-orange-600 border-orange-500/30",
    tagline: "Publicidad, marketing, comisiones de ventas",
    proveedorLabel: "Proveedor / Agencia", proveedorPlaceholder: "Agencia o medio",
    documentoLabel: "RUC", defaultTipoDoc: "Factura", suggestIGV: true,
    showFiscal: true, showBanco: true, centroCostoLabel: "Campaña / Producto",
    hint: "Gastos comerciales: ads digitales, eventos, material POP, comisiones. Indica la campaña en el centro de costo.",
  },
  Operativo: {
    icon: Wrench, tone: "from-amber-500/15 to-amber-500/5 text-amber-600 border-amber-500/30",
    tagline: "Insumos, logística, operación diaria",
    proveedorLabel: "Proveedor", proveedorPlaceholder: "Razón social",
    documentoLabel: "RUC", defaultTipoDoc: "Factura", suggestIGV: true,
    showFiscal: true, showBanco: true, centroCostoLabel: "Proyecto / Servicio",
    hint: "Costos operativos directos: insumos, transporte, herramientas, EPP.",
  },
  Financiero: {
    icon: Landmark, tone: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 border-emerald-500/30",
    tagline: "Intereses, comisiones bancarias, ITF",
    proveedorLabel: "Entidad financiera", proveedorPlaceholder: "Ej: BCP, BBVA, Interbank",
    documentoLabel: "RUC entidad", showFiscal: false, showBanco: true,
    centroCostoLabel: "Producto financiero",
    hint: "Comisiones, intereses de préstamos, mantenimiento de cuentas y portes. No suelen llevar IGV.",
    defaultMetodoPago: "Transferencia",
  },
  Impuestos: {
    icon: Receipt, tone: "from-red-500/15 to-red-500/5 text-red-600 border-red-500/30",
    tagline: "SUNAT, municipales, retenciones",
    proveedorLabel: "Entidad recaudadora", proveedorPlaceholder: "Ej: SUNAT, Municipalidad",
    documentoLabel: "RUC", showFiscal: false, showBanco: false,
    centroCostoLabel: "Concepto tributario",
    hint: "Pagos de tributos (IGV, Renta, ESSALUD, ONP, arbitrios). Registra el periodo tributario en observaciones.",
    defaultMetodoPago: "Transferencia",
  },
  Capacitación: {
    icon: GraduationCap, tone: "from-sky-500/15 to-sky-500/5 text-sky-600 border-sky-500/30",
    tagline: "Cursos, certificaciones, eventos formativos",
    proveedorLabel: "Institución / Capacitador", proveedorPlaceholder: "Universidad, escuela o ponente",
    documentoLabel: "RUC / DNI", defaultTipoDoc: "Boleta",
    showFiscal: true, showBanco: true, centroCostoLabel: "Área beneficiada",
    hint: "Inversión en aprendizaje del equipo. Especifica curso y participantes en la descripción.",
  },
  Representación: {
    icon: Coffee, tone: "from-pink-500/15 to-pink-500/5 text-pink-600 border-pink-500/30",
    tagline: "Atenciones a clientes, reuniones",
    proveedorLabel: "Establecimiento", proveedorPlaceholder: "Restaurante, hotel, evento",
    documentoLabel: "RUC", defaultTipoDoc: "Boleta",
    showFiscal: true, showBanco: false, centroCostoLabel: "Cliente / Reunión",
    hint: "Gastos de representación: almuerzos con clientes, regalos institucionales. Sujetos a límite tributario (0.5% ingresos).",
  },
  Dirección: {
    icon: Crown, tone: "from-violet-500/15 to-violet-500/5 text-violet-600 border-violet-500/30",
    tagline: "Gerencia, viajes ejecutivos, asesorías",
    proveedorLabel: "Proveedor / Consultor", proveedorPlaceholder: "Consultora, asesor o servicio ejecutivo",
    documentoLabel: "RUC / DNI", defaultTipoDoc: "Factura", suggestIGV: true,
    showFiscal: true, showBanco: true, centroCostoLabel: "Iniciativa estratégica",
    hint: "Gastos asociados a la alta dirección: viajes, asesorías legales/contables, membresías ejecutivas.",
  },
  Inversiones: {
    icon: TrendingUp, tone: "from-teal-500/15 to-teal-500/5 text-teal-600 border-teal-500/30",
    tagline: "Activos fijos, mejoras, capitalización",
    proveedorLabel: "Proveedor del activo", proveedorPlaceholder: "Razón social",
    documentoLabel: "RUC", defaultTipoDoc: "Factura", suggestIGV: true,
    showFiscal: true, showBanco: true, centroCostoLabel: "Activo / Proyecto",
    hint: "Compra de activos depreciables: equipos, mobiliario, infraestructura. Estos egresos se capitalizan.",
  },
  Extraordinarios: {
    icon: AlertTriangle, tone: "from-yellow-500/15 to-yellow-500/5 text-yellow-700 border-yellow-500/30",
    tagline: "Eventos no recurrentes, contingencias",
    proveedorLabel: "Proveedor / Beneficiario", proveedorPlaceholder: "Razón social o nombre",
    documentoLabel: "RUC / DNI", showFiscal: true, showBanco: true,
    centroCostoLabel: "Evento / Motivo",
    hint: "Gastos no recurrentes o imprevistos: multas, indemnizaciones, donaciones. Justifica en observaciones.",
  },
  Intermediario: {
    icon: Repeat, tone: "from-cyan-500/15 to-cyan-500/5 text-cyan-600 border-cyan-500/30",
    tagline: "Cuentas puente, transferencias internas",
    proveedorLabel: "Contraparte", proveedorPlaceholder: "Cuenta, sede o tercero",
    documentoLabel: "RUC / Identificador", showFiscal: false, showBanco: true,
    centroCostoLabel: "Flujo / Operación",
    hint: "Movimientos transitorios entre cuentas o sedes. No impactan resultado final, sólo flujo de caja.",
    defaultMetodoPago: "Transferencia",
  },
  Devoluciones: {
    icon: Undo2, tone: "from-fuchsia-500/15 to-fuchsia-500/5 text-fuchsia-600 border-fuchsia-500/30",
    tagline: "Reembolsos a clientes o terceros",
    proveedorLabel: "Cliente / Beneficiario", proveedorPlaceholder: "Nombre del cliente",
    documentoLabel: "RUC / DNI", defaultTipoDoc: "Nota de Crédito",
    showFiscal: true, showBanco: true, centroCostoLabel: "Contrato / Proforma original",
    hint: "Devoluciones de dinero. Referencia el contrato, proforma o pago original en observaciones.",
  },
};

const DEFAULT_UX: CategoryUX = {
  icon: Wallet, tone: "from-muted to-muted/40 text-foreground border-border",
  tagline: "Egreso general",
  proveedorLabel: "Proveedor", proveedorPlaceholder: "Razón social o nombre",
  documentoLabel: "RUC / DNI", showFiscal: true, showBanco: true,
  centroCostoLabel: "Centro de costo",
  hint: "Completa los datos del egreso.",
};

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
  const selectedCat = useMemo(
    () => categories.find((c) => c.id === form.categoria_id),
    [categories, form.categoria_id]
  );
  const ux: CategoryUX = (selectedCat && CATEGORY_UX[selectedCat.nombre as CategoryKey]) || DEFAULT_UX;

  // Apply category-specific defaults when category changes
  const pickCategory = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    const cfg = (cat && CATEGORY_UX[cat.nombre as CategoryKey]) || DEFAULT_UX;
    setForm((p) => ({
      ...p,
      categoria_id: id,
      subcategoria_id: "",
      tipo_documento: cfg.defaultTipoDoc ?? p.tipo_documento,
      metodo_pago: cfg.defaultMetodoPago ?? p.metodo_pago,
    }));
  };

  const calcIGV = () => {
    const s = parseFloat(form.subtotal || "0");
    set("igv", (s * 0.18).toFixed(2));
  };

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
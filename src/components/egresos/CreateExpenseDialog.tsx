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
  Search, Loader2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { lookupVerificaPe } from "@/lib/verificaPe";

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
  const [lookingUp, setLookingUp] = useState(false);

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

  const supportsRuc = /ruc/i.test(ux.documentoLabel);

  const handleRucLookup = async () => {
    const ruc = form.proveedor_documento.trim();
    if (!/^\d{11}$/.test(ruc)) {
      toast.error("Ingresa un RUC válido de 11 dígitos");
      return;
    }
    setLookingUp(true);
    try {
      const res = await lookupVerificaPe("ruc", ruc);
      const nombre = res.razon_social || res.nombre;
      if (!nombre) {
        toast.warning("No se encontró información para el RUC");
        return;
      }
      setForm((p) => ({
        ...p,
        proveedor_nombre: nombre,
        observaciones: [
          p.observaciones,
          res.direccion ? `Dirección: ${res.direccion}` : "",
          res.estado ? `Estado: ${res.estado}` : "",
          res.condicion ? `Condición: ${res.condicion}` : "",
        ].filter(Boolean).join("\n"),
      }));
      toast.success("Datos del RUC cargados");
    } catch (e: any) {
      toast.error("Error consultando RUC: " + e.message);
    } finally {
      setLookingUp(false);
    }
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

  const SelectedIcon = ux.icon;
  const totalNum = parseFloat(form.total || "0");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        {/* ── Hero header ──────────────────────────────────────────── */}
        <DialogHeader className={cn(
          "px-6 pt-6 pb-5 border-b bg-gradient-to-br rounded-t-lg",
          ux.tone
        )}>
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-background/80 backdrop-blur flex items-center justify-center shadow-sm border">
              <SelectedIcon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl text-foreground">
                {selectedCat ? `Egreso · ${selectedCat.nombre}` : "Nuevo Egreso"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedCat ? ux.tagline : "Selecciona la categoría para iniciar"}
              </p>
            </div>
            {selectedCat && (
              <Button variant="ghost" size="sm" onClick={() => set("categoria_id", "")} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Cambiar
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="px-6 py-5">
          {/* ── Step 1: Category picker ─────────────────────────────── */}
          {!form.categoria_id ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">¿Qué tipo de egreso vas a registrar?</h3>
                <p className="text-xs text-muted-foreground">Elige una categoría: el formulario se adaptará automáticamente.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((c) => {
                  const cfg = CATEGORY_UX[c.nombre as CategoryKey] || DEFAULT_UX;
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pickCategory(c.id)}
                      className={cn(
                        "group relative text-left rounded-xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5",
                        "bg-gradient-to-br", cfg.tone
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-background/70 border flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-foreground">{c.nombre}</div>
                          <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{cfg.tagline}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Step 2: Contextual form ──────────────────────────── */
            <div className="space-y-6">
              {/* Hint card */}
              <div className="flex gap-3 rounded-lg border bg-muted/40 p-3">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">{ux.hint}</p>
              </div>

              {/* Subcategoría + fechas */}
              <section className="space-y-3">
                <SectionTitle>Clasificación</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <Label>Subcategoría</Label>
                    <Select value={form.subcategoria_id} onValueChange={(v) => set("subcategoria_id", v)} disabled={filteredSubs.length === 0}>
                      <SelectTrigger><SelectValue placeholder={filteredSubs.length ? "Seleccione..." : "Sin subcategorías"} /></SelectTrigger>
                      <SelectContent>
                        {filteredSubs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{ux.centroCostoLabel}</Label>
                    <Input value={form.centro_costo} onChange={(e) => set("centro_costo", e.target.value)} placeholder="Opcional" />
                  </div>
                  <div>
                    <Label>Fecha de egreso *</Label>
                    <Input type="date" value={form.fecha_egreso} onChange={(e) => set("fecha_egreso", e.target.value)} />
                  </div>
                </div>
              </section>

              {/* Proveedor */}
              <section className="space-y-3">
                <SectionTitle>{ux.proveedorLabel}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label>{ux.proveedorLabel} *</Label>
                    <Input value={form.proveedor_nombre} onChange={(e) => set("proveedor_nombre", e.target.value)} placeholder={ux.proveedorPlaceholder} />
                  </div>
                  <div>
                    <Label>{ux.documentoLabel}</Label>
                    {supportsRuc ? (
                      <div className="flex gap-2">
                        <Input
                          value={form.proveedor_documento}
                          onChange={(e) => set("proveedor_documento", e.target.value.replace(/\D/g, "").slice(0, 11))}
                          placeholder="11 dígitos"
                          inputMode="numeric"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleRucLookup}
                          disabled={lookingUp || form.proveedor_documento.length !== 11}
                          title="Consultar RUC en VerificaPe"
                        >
                          {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                      </div>
                    ) : (
                      <Input value={form.proveedor_documento} onChange={(e) => set("proveedor_documento", e.target.value)} />
                    )}
                  </div>
                </div>
              </section>

              {/* Documento fiscal */}
              {ux.showFiscal && (
                <section className="space-y-3">
                  <SectionTitle icon={FileText}>Documento</SectionTitle>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <Label>Tipo</Label>
                      <Select value={form.tipo_documento} onValueChange={(v) => set("tipo_documento", v)}>
                        <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                        <SelectContent>
                          {["Factura","Boleta","Recibo por Honorarios","Nota de Crédito","Ticket","Otros"].map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Serie</Label>
                      <Input value={form.serie_documento} onChange={(e) => set("serie_documento", e.target.value)} placeholder="F001" />
                    </div>
                    <div>
                      <Label>Número</Label>
                      <Input value={form.numero_documento} onChange={(e) => set("numero_documento", e.target.value)} placeholder="00001234" />
                    </div>
                    <div>
                      <Label>Fecha de emisión</Label>
                      <Input type="date" value={form.fecha_emision} onChange={(e) => set("fecha_emision", e.target.value)} />
                    </div>
                  </div>
                </section>
              )}

              {/* Montos */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionTitle icon={Calculator}>Montos</SectionTitle>
                  {ux.suggestIGV && (
                    <Button type="button" variant="outline" size="sm" onClick={calcIGV} className="h-7 gap-1 text-xs">
                      <Calculator className="h-3 w-3" /> Calcular IGV (18%)
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
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
                  <div>
                    <Label>Subtotal</Label>
                    <Input type="number" step="0.01" value={form.subtotal} onChange={(e) => set("subtotal", e.target.value)} />
                  </div>
                  <div>
                    <Label>IGV</Label>
                    <Input type="number" step="0.01" value={form.igv} onChange={(e) => set("igv", e.target.value)} />
                  </div>
                  <div>
                    <Label>Otros</Label>
                    <Input type="number" step="0.01" value={form.otros_impuestos} onChange={(e) => set("otros_impuestos", e.target.value)} />
                  </div>
                  <div>
                    <Label className="font-semibold">Total</Label>
                    <Input type="number" step="0.01" value={form.total} readOnly className="font-bold bg-muted/50" />
                  </div>
                </div>
                {totalNum > 0 && (
                  <div className="flex justify-end">
                    <Badge variant="secondary" className="text-sm font-mono">
                      Total: {form.moneda} {totalNum.toFixed(2)}
                    </Badge>
                  </div>
                )}
              </section>

              {/* Pago */}
              <section className="space-y-3">
                <SectionTitle icon={Wallet}>Forma de pago</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Método</Label>
                    <Select value={form.metodo_pago} onValueChange={(v) => set("metodo_pago", v)}>
                      <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                      <SelectContent>
                        {["Efectivo","Transferencia","Yape","Plin","Tarjeta","Cheque","Crédito"].map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {ux.showBanco && (
                    <>
                      <div>
                        <Label>Banco</Label>
                        <Input value={form.banco} onChange={(e) => set("banco", e.target.value)} placeholder="BCP, BBVA…" />
                      </div>
                      <div>
                        <Label>Referencia / N° operación</Label>
                        <Input value={form.referencia_pago} onChange={(e) => set("referencia_pago", e.target.value)} />
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* Descripción */}
              <section className="space-y-3">
                <SectionTitle>Detalle</SectionTitle>
                <div>
                  <Label>Descripción *</Label>
                  <Textarea value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} rows={2} placeholder="¿En qué consiste el egreso?" />
                </div>
                <div>
                  <Label>Observaciones</Label>
                  <Textarea value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} rows={2} placeholder="Notas internas, periodo, justificación…" />
                </div>
              </section>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.categoria_id}>
            {saving ? "Guardando..." : "Crear Egreso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </div>
  );
}
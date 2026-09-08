import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

type Row = Record<string, any>;

const fmt = (v: any) => (v === null || v === undefined ? "" : v);
const money = (v: any) => (v === null || v === undefined ? "" : Number(v));

function addSheet(wb: XLSX.WorkBook, name: string, rows: Row[]) {
  const data = rows.length ? rows : [{ "Sin datos": "" }];
  const ws = XLSX.utils.json_to_sheet(data);
  const headers = Object.keys(data[0]);
  ws["!cols"] = headers.map((h) => ({
    wch: Math.min(Math.max(h.length + 2, 12), 50),
  }));
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
}

export interface BaseMaestraSections {
  clientes: boolean;
  proformas: boolean;
  contratos: boolean;
  asignaciones: boolean;
  pagos: boolean;
  carteras: boolean;
}

export const DEFAULT_SECTIONS: BaseMaestraSections = {
  clientes: true,
  proformas: true,
  contratos: true,
  asignaciones: true,
  pagos: true,
  carteras: true,
};

export interface BaseMaestraOptions {
  clientIds?: string[] | null;
  includeSunat?: boolean;
  /** null = todas las sedes */
  sedeId?: string | null;
  sections?: Partial<BaseMaestraSections>;
  /** Incluir hoja con los detalles asignados por contrato */
  detallesPorContrato?: boolean;
}

const isPN = (t: any) =>
  String(t || "").toLowerCase().replace(/\s+/g, "_").includes("persona_natural");

export async function exportBaseMaestra({
  clientIds,
  includeSunat = false,
  sedeId = null,
  sections,
  detallesPorContrato = false,
}: BaseMaestraOptions = {}) {
  const sec: BaseMaestraSections = { ...DEFAULT_SECTIONS, ...(sections || {}) };

  const inFilter = <T,>(q: any, col: string) =>
    clientIds && clientIds.length ? q.in(col, clientIds) : q;

  const [
    clientesRes,
    sedesRes,
    contactosRes,
    contratosRes,
    proformasRes,
    pagosRes,
    carterasRes,
    carteraClientesRes,
    motivosRes,
    asignacionesRes,
    detallesRes,
  ] = await Promise.all([
    inFilter(supabase.from("clientes").select("*"), "id"),
    supabase.from("sedes").select("id, nombre, codigo"),
    inFilter(supabase.from("cliente_contactos").select("*"), "cliente_id"),
    inFilter(supabase.from("contratos").select("*"), "cliente_id"),
    inFilter(supabase.from("proformas").select("*"), "cliente_id"),
    supabase.from("pagos").select("*"),
    supabase.from("carteras").select("id, nombre, especialidad, activa, responsable_id, sede_id"),
    inFilter(supabase.from("cartera_clientes").select("cartera_id, cliente_id"), "cliente_id"),
    supabase.from("motivos_suspension").select("id, nombre"),
    supabase.from("asignaciones").select("*"),
    detallesPorContrato
      ? supabase.from("detalle_supervisiones").select("*")
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  const err = [
    clientesRes,
    sedesRes,
    contactosRes,
    contratosRes,
    proformasRes,
    pagosRes,
    carterasRes,
    carteraClientesRes,
    motivosRes,
    asignacionesRes,
  ].find((r: any) => r.error);
  if (err) throw new Error((err as any).error.message);

  const sedes = (sedesRes.data as any[]) || [];
  const bySede = <T extends { sede_id?: string | null }>(rows: T[]) =>
    sedeId ? rows.filter((r) => (r as any).sede_id === sedeId) : rows;

  const clientes = bySede((clientesRes.data as any[]) || []);
  const clienteIds = new Set(clientes.map((c) => c.id));
  const contactos = ((contactosRes.data as any[]) || []).filter((x) => clienteIds.has(x.cliente_id));
  const contratos = ((contratosRes.data as any[]) || []).filter((x) => clienteIds.has(x.cliente_id));
  const proformas = ((proformasRes.data as any[]) || []).filter((x) => clienteIds.has(x.cliente_id));
  const carteras = bySede((carterasRes.data as any[]) || []);
  const carteraIds = new Set(carteras.map((c) => c.id));
  const carteraClientes = ((carteraClientesRes.data as any[]) || []).filter(
    (cc) => clienteIds.has(cc.cliente_id) && carteraIds.has(cc.cartera_id)
  );
  const motivos = (motivosRes.data as any[]) || [];

  const contratoIds = new Set(contratos.map((c) => c.id));
  const pagos = ((pagosRes.data as any[]) || []).filter((p) => contratoIds.has(p.contrato_id));
  const asignaciones = ((asignacionesRes.data as any[]) || []).filter(
    (a) => (a.cliente_id && clienteIds.has(a.cliente_id)) || (a.contrato_id && contratoIds.has(a.contrato_id))
  );
  const detalles = ((detallesRes as any)?.data as any[] | undefined)?.filter((d) =>
    contratoIds.has(d.contrato_id)
  ) || [];

  const sedeName = (id: string | null) => sedes.find((s) => s.id === id)?.nombre ?? "";
  const motivoName = (id: string | null) => motivos.find((m) => m.id === id)?.nombre ?? "";
  const clienteName = (c: any) =>
    (isPN(c?.tipo_cliente) ? c?.nombre_persona_natural || c?.razon_social : c?.razon_social) || "";
  const clienteById = (id: string) => clientes.find((c) => c.id === id);
  const contratoById = (id: string) => contratos.find((c) => c.id === id);

  const carterasPorCliente = (clienteId: string) =>
    carteraClientes
      .filter((cc) => cc.cliente_id === clienteId)
      .map((cc) => carteras.find((c) => c.id === cc.cartera_id)?.nombre)
      .filter(Boolean)
      .join(", ");

  const today = new Date().toISOString().split("T")[0];
  const pagosVencidos = pagos.filter(
    (p) => p.status !== "pagado" && p.fecha_vencimiento && p.fecha_vencimiento < today
  );

  // Hoja Resumen
  const resumenStats: Row[] = [];
  const push = (grupo: string, indicador: string, valor: number) =>
    resumenStats.push({ Grupo: grupo, Indicador: indicador, Valor: valor });

  if (sec.clientes) {
    push("Clientes", "Total", clientes.length);
    push("Clientes", "Activos", clientes.filter((c) => c.activo).length);
    push("Clientes", "Inactivos", clientes.filter((c) => !c.activo).length);
    push("Clientes", "Empresas", clientes.filter((c) => !isPN(c.tipo_cliente)).length);
    push("Clientes", "Personas Naturales", clientes.filter((c) => isPN(c.tipo_cliente)).length);
    push(
      "Clientes",
      "Persona Natural con Empresa",
      clientes.filter((c) => isPN(c.tipo_cliente) && c.persona_natural_con_empresa === true).length
    );
  }
  if (sec.proformas) {
    push("Proformas", "Total", proformas.length);
    push("Proformas", "Aprobadas", proformas.filter((p) => p.status === "aprobada").length);
    push(
      "Proformas",
      "En Proceso",
      proformas.filter((p) => p.status === "borrador" || p.status === "enviada").length
    );
    push("Proformas", "Rechazadas", proformas.filter((p) => p.status === "rechazada").length);
    push("Proformas", "Anuladas", proformas.filter((p) => p.status === "anulada").length);
  }
  if (sec.contratos) {
    push("Contratos", "Total", contratos.length);
    push("Contratos", "Aprobados", contratos.filter((c) => c.status === "aprobado").length);
    push("Contratos", "En Gestión", contratos.filter((c) => c.status === "en_gestion").length);
    push("Contratos", "Borradores", contratos.filter((c) => c.status === "borrador").length);
    push(
      "Contratos",
      "Anulados",
      contratos.filter((c) => c.status === "anulado" || c.condicion === "Anulado").length
    );
  }
  if (sec.asignaciones) {
    push("Asignaciones", "Total", asignaciones.length);
    push(
      "Asignaciones",
      "En gestión",
      asignaciones.filter((a) => a.status === "pendiente" || a.status === "en_progreso").length
    );
    push("Asignaciones", "Finalizados", asignaciones.filter((a) => a.status === "completada").length);
    push("Asignaciones", "Sin Asignar", asignaciones.filter((a) => !a.asignado_a).length);
  }
  if (sec.pagos) {
    push("Pagos", "Total", pagos.length);
    push("Pagos", "Pagados", pagos.filter((p) => p.status === "pagado").length);
    push(
      "Pagos",
      "Pendientes",
      pagos.filter((p) => p.status !== "pagado" && !pagosVencidos.includes(p)).length
    );
    push("Pagos", "Vencidos", pagosVencidos.length);
  }
  if (sec.carteras) {
    push("Carteras", "Total", carteras.length);
    push("Carteras", "Activas", carteras.filter((c) => c.activa).length);
    push("Carteras", "Inactivas", carteras.filter((c) => !c.activa).length);
  }

  // Hoja: Base maestra consolidada (una fila por cliente)
  const resumen: Row[] = clientes.map((c) => {
    const cContratos = contratos.filter((x) => x.cliente_id === c.id);
    const cProformas = proformas.filter((x) => x.cliente_id === c.id);
    const cPagos = pagos.filter((p) => cContratos.some((ct) => ct.id === p.contrato_id));
    const pagados = cPagos.filter((p) => p.status === "pagado");
    const pendientes = cPagos.filter((p) => p.status !== "pagado");
    const base: Row = {
      "Código": fmt(c.codigo),
      "Tipo Cliente": fmt(c.tipo_cliente),
      "Nombre / Razón Social": clienteName(c),
      "RUC / Documento": fmt(c.codigo),
      "Estado": c.activo ? "Activo" : "Inactivo",
      "Motivo Suspensión": motivoName(c.motivo_suspension_id),
      "Fecha Suspensión": fmt(c.fecha_suspension),
      "Sede": sedeName(c.sede_id),
      "Dirección": fmt(c.direccion),
      "Fecha de Ingreso": fmt((c as any).fecha_ingreso),
      "Teléfono Empresa": fmt(c.telefono),
      "Email Empresa": fmt(c.email),
      "Sector": fmt(c.sector),
      "Actividad Económica": fmt(c.actividad_economica),
      "Régimen Tributario": fmt(c.regimen_tributario),
      "Régimen Laboral": fmt(c.regimen_laboral),
      "N° Trabajadores": fmt(c.nro_trabajadores),
      "PN con Empresa": c.persona_natural_con_empresa ? "Sí" : "No",
      "Contacto Principal": fmt(c.contacto_nombre),
      "Tel. Contacto": fmt(c.contacto_telefono),
      "Email Contacto": fmt(c.contacto_email),
      "Contacto 2": fmt(c.contacto_nombre2),
      "Tel. Contacto 2": fmt(c.contacto_telefono2),
      "Total Contactos": contactos.filter((x) => x.cliente_id === c.id).length,
      "Carteras Asignadas": carterasPorCliente(c.id),
      "N° Contratos": cContratos.length,
      "Contratos Vigentes": cContratos.filter((x) => x.condicion === "Vigente").length,
      "Códigos Contratos": cContratos.map((x) => x.numero).join(", "),
      "Monto Mensual Total": cContratos.reduce((s, x) => s + Number(x.monto_mensual || 0), 0),
      "Monto Total Contratado": cContratos.reduce((s, x) => s + Number(x.monto_total || 0), 0),
      "N° Proformas": cProformas.length,
      "Proformas Aprobadas": cProformas.filter((x) => x.status === "aprobada").length,
      "Total Proformas (S/)": cProformas.reduce((s, x) => s + Number(x.total || 0), 0),
      "N° Pagos": cPagos.length,
      "Pagos Cobrados": pagados.reduce((s, p) => s + Number(p.monto || 0), 0),
      "Pagos Pendientes": pendientes.reduce((s, p) => s + Number(p.monto || 0), 0),
      "Notas": fmt(c.notas),
      "Fecha Registro": fmt(c.created_at),
    };
    if (includeSunat) {
      base["Usuario SUNAT"] = fmt(c.usuario_sunat);
      base["Clave SUNAT"] = fmt(c.clave_sunat);
    }
    return base;
  });

  const hojaContactos: Row[] = contactos.map((ct) => ({
    "Cliente": clienteName(clienteById(ct.cliente_id)),
    "Código Cliente": fmt(clienteById(ct.cliente_id)?.codigo),
    "Nombre": fmt(ct.nombre),
    "Cargo": fmt(ct.cargo),
    "Teléfono": fmt(ct.telefono),
    "Email": fmt(ct.email),
    "Principal": ct.principal ? "Sí" : "No",
  }));

  const hojaContratos: Row[] = contratos.map((ct) => ({
    "N° Contrato": fmt(ct.numero),
    "Cliente": clienteName(clienteById(ct.cliente_id)),
    "Código Cliente": fmt(clienteById(ct.cliente_id)?.codigo),
    "Sede": sedeName(ct.sede_id),
    "Descripción": fmt(ct.descripcion),
    "Tipo Servicio": fmt(ct.tipo_servicio),
    "Estado": fmt(ct.status),
    "Condición": fmt(ct.condicion),
    "Fecha Inicio": fmt(ct.fecha_inicio),
    "Fecha Fin": fmt(ct.fecha_fin),
    "Moneda": fmt(ct.moneda),
    "Monto Mensual": money(ct.monto_mensual),
    "Monto Total": money(ct.monto_total),
    "N° Cuotas": fmt(ct.numero_cuotas),
    "Día Vencimiento": fmt(ct.dia_vencimiento),
    "Notas": fmt(ct.notas),
  }));

  const hojaProformas: Row[] = proformas.map((p) => ({
    "N° Proforma": fmt(p.numero),
    "Cliente": clienteName(clienteById(p.cliente_id)),
    "Código Cliente": fmt(clienteById(p.cliente_id)?.codigo),
    "Tipo": fmt(p.tipo),
    "Sede": sedeName(p.sede_id),
    "Estado": fmt(p.status),
    "Fecha Emisión": fmt(p.fecha_emision),
    "Fecha Vencimiento": fmt(p.fecha_vencimiento),
    "Moneda": fmt(p.moneda),
    "Subtotal": money(p.subtotal),
    "IGV": money(p.igv),
    "Total": money(p.total),
    "Contrato Vinculado": fmt(contratoById(p.contrato_id)?.numero),
    "Notas": fmt(p.notas),
  }));

  const hojaPagos: Row[] = pagos.map((p) => {
    const ct = contratoById(p.contrato_id);
    return {
      "Contrato": fmt(ct?.numero),
      "Cliente": clienteName(clienteById(ct?.cliente_id)),
      "Monto": money(p.monto),
      "Estado": pagosVencidos.includes(p) ? "vencido" : fmt(p.status),
      "Fecha Vencimiento": fmt(p.fecha_vencimiento),
      "Fecha Pago": fmt(p.fecha_pago),
      "Método de Pago": fmt(p.metodo_pago),
      "Comprobante": [p.tipo_comprobante, p.serie_comprobante, p.numero_comprobante].filter(Boolean).join(" "),
      "Subtotal": money(p.subtotal),
      "IGV": money(p.igv),
      "Monto Neto": money(p.monto_neto),
      "Banco": fmt(p.banco),
      "Referencia": fmt(p.referencia),
    };
  });

  const hojaAsignaciones: Row[] = asignaciones.map((a) => ({
    "Título": fmt(a.titulo),
    "Cliente": clienteName(clienteById(a.cliente_id)),
    "Contrato": fmt(contratoById(a.contrato_id)?.numero),
    "Sede": sedeName(a.sede_id),
    "Estado": fmt(a.status),
    "Prioridad": fmt(a.prioridad),
    "Asignado": a.asignado_a ? "Sí" : "Sin Asignar",
    "Fecha Inicio": fmt(a.fecha_inicio),
    "Fecha Vencimiento": fmt(a.fecha_vencimiento),
    "Horas Estimadas": money(a.horas_estimadas),
    "Horas Trabajadas": money(a.horas_trabajadas),
    "Notas": fmt(a.notas),
  }));

  const hojaDetalles: Row[] = detalles.map((d) => {
    const ct = contratoById(d.contrato_id);
    return {
      "Contrato": fmt(ct?.numero),
      "Cliente": clienteName(clienteById(ct?.cliente_id)),
      "Servicio": fmt(d.servicio_descripcion || d.servicio_id),
      "Detalle": fmt(d.detalle_descripcion || d.detalle_id),
      "Estado": fmt(d.estado),
      "Asignado": d.asignado_a ? "Sí" : "Sin Asignar",
      "Supervisado En": fmt(d.supervisado_en),
      "Observaciones": fmt(d.observaciones),
    };
  });

  const hojaCarteras: Row[] = carteraClientes.map((cc) => {
    const cart = carteras.find((c) => c.id === cc.cartera_id);
    return {
      "Cartera": fmt(cart?.nombre),
      "Especialidad": fmt(cart?.especialidad),
      "Sede Cartera": sedeName(cart?.sede_id ?? null),
      "Activa": cart?.activa ? "Sí" : "No",
      "Cliente": clienteName(clienteById(cc.cliente_id)),
      "Código Cliente": fmt(clienteById(cc.cliente_id)?.codigo),
    };
  });

  const wb = XLSX.utils.book_new();
  addSheet(wb, "Resumen", resumenStats);
  if (sec.clientes) {
    addSheet(wb, "Base Maestra", resumen);
    addSheet(wb, "Contactos", hojaContactos);
  }
  if (sec.contratos) addSheet(wb, "Contratos", hojaContratos);
  if (sec.proformas) addSheet(wb, "Proformas", hojaProformas);
  if (sec.asignaciones) addSheet(wb, "Asignaciones", hojaAsignaciones);
  if (sec.asignaciones && detallesPorContrato)
    addSheet(wb, "Detalles por Contrato", hojaDetalles);
  if (sec.pagos) addSheet(wb, "Pagos", hojaPagos);
  if (sec.carteras) addSheet(wb, "Carteras", hojaCarteras);

  const date = new Date().toISOString().split("T")[0];
  const sufijo = sedeId ? `_${(sedeName(sedeId) || "sede").replace(/\s+/g, "_")}` : "_todas_las_sedes";
  XLSX.writeFile(wb, `base_maestra${sufijo}_${date}.xlsx`);

  return {
    clientes: clientes.length,
    contratos: contratos.length,
    proformas: proformas.length,
    pagos: pagos.length,
    asignaciones: asignaciones.length,
    carteras: carteras.length,
  };
}

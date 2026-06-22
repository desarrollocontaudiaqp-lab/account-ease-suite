import { supabase } from "@/integrations/supabase/client";

export interface VerificaPeResult {
  razon_social?: string;
  nombre?: string;
  direccion?: string;
  actividad_economica?: string;
  estado?: string;
  condicion?: string;
  raw: Record<string, any>;
}

function deepPick(obj: any, keys: string[]): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const lowered = keys.map((k) => k.toLowerCase());
  const stack: any[] = [obj];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;
    for (const [k, v] of Object.entries(cur)) {
      if (typeof v === "string" && v.trim() && lowered.includes(k.toLowerCase())) {
        return v.trim();
      }
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return undefined;
}

function joinDireccion(root: any): string | undefined {
  const direct = deepPick(root, [
    "direccion", "direccion_completa", "direccionCompleta",
    "domicilio_fiscal", "domicilioFiscal", "direccion_fiscal",
  ]);
  if (direct) return direct;
  // SUNAT-style fragmented address fields
  const parts = [
    deepPick(root, ["tipo_via", "tipoVia"]),
    deepPick(root, ["nombre_via", "nombreVia"]),
    deepPick(root, ["numero_via", "numeroVia", "numero"]),
    deepPick(root, ["interior"]),
    deepPick(root, ["zona_tipo", "zonaTipo"]),
    deepPick(root, ["zona_nombre", "zonaNombre"]),
    deepPick(root, ["referencia"]),
    deepPick(root, ["distrito"]),
    deepPick(root, ["provincia"]),
    deepPick(root, ["departamento"]),
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

export async function lookupVerificaPe(
  tipo: "ruc" | "dni",
  numero: string,
): Promise<VerificaPeResult> {
  const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const url = `https://${projectId}.functions.supabase.co/verifica-pe-lookup?tipo=${tipo}&numero=${encodeURIComponent(numero)}`;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const resp = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token ?? anonKey}`,
    },
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json?.error || json?.message || `HTTP ${resp.status}`);
  const root = json?.data ?? json?.result ?? json;
  const nombres = deepPick(root, ["nombres", "nombre"]);
  const apPat = deepPick(root, ["apellido_paterno", "apellidoPaterno"]);
  const apMat = deepPick(root, ["apellido_materno", "apellidoMaterno"]);
  const nombreCompleto =
    deepPick(root, ["nombre_completo", "nombreCompleto"]) ||
    [nombres, apPat, apMat].filter(Boolean).join(" ").trim() || undefined;
  return {
    razon_social: deepPick(root, [
      "razon_social", "razonSocial",
      "nombre_o_razon_social", "nombreORazonSocial",
      "nombre_razon_social",
    ]),
    nombre: nombreCompleto,
    direccion: joinDireccion(root),
    actividad_economica: deepPick(root, [
      "actividad_economica", "actividadEconomica", "actividad",
      "actividad_economica_principal",
    ]),
    estado: deepPick(root, ["estado", "estado_contribuyente", "estadoContribuyente"]),
    condicion: deepPick(root, ["condicion", "condicion_domicilio", "condicionDomicilio"]),
    raw: root,
  };
}
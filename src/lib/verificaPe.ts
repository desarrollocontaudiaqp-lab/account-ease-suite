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

function pick(obj: any, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

export async function lookupVerificaPe(
  tipo: "ruc" | "dni",
  numero: string,
): Promise<VerificaPeResult> {
  const { data, error } = await supabase.functions.invoke("verifica-pe-lookup", {
    method: "GET" as any,
    body: undefined,
    headers: {},
    // @ts-expect-error: query is supported by GoTrue fetch
    query: { tipo, numero },
  });

  // Fallback: use full URL if invoke ignores query
  let payload: any = data;
  if (error || !payload) {
    const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.functions.supabase.co/verifica-pe-lookup?tipo=${tipo}&numero=${encodeURIComponent(numero)}`;
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const resp = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.error || `HTTP ${resp.status}`);
    payload = json;
  }

  const root = payload?.data ?? payload;
  return {
    razon_social: pick(root, ["razon_social", "razonSocial", "nombre_o_razon_social", "nombre"]),
    nombre: pick(root, ["nombres", "nombre_completo", "nombreCompleto", "nombre"]),
    direccion: pick(root, ["direccion", "direccion_completa", "domicilio_fiscal", "domicilioFiscal"]),
    actividad_economica: pick(root, ["actividad_economica", "actividadEconomica", "actividad"]),
    estado: pick(root, ["estado", "estado_contribuyente"]),
    condicion: pick(root, ["condicion", "condicion_domicilio"]),
    raw: root,
  };
}
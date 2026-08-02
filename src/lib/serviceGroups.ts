/**
 * Grupos de servicio canónicos usados por Proformas, Contratos y el catálogo de Servicios.
 * El grupo histórico "Auditoría y Control Interno" se separó en "Auditoría" y "Control Interno".
 */
export const GRUPOS_SERVICIO = [
  "Contabilidad",
  "Trámites",
  "Auditoría",
  "Control Interno",
] as const;

export type GrupoServicio = (typeof GRUPOS_SERVICIO)[number];

/** Valor legado que existía antes de separar los grupos. */
export const LEGACY_GRUPO_AUDITORIA = "Auditoría y Control Interno";

/** Normaliza cualquier valor histórico (minúsculas o grupo combinado) al grupo canónico. */
export function normalizeGrupoServicio(value?: string | null): GrupoServicio | null {
  if (!value) return null;
  const v = value.trim();
  if ((GRUPOS_SERVICIO as readonly string[]).includes(v)) return v as GrupoServicio;
  const lower = v.toLowerCase();
  if (lower === "contabilidad") return "Contabilidad";
  if (lower === "tramites" || lower === "trámites") return "Trámites";
  if (lower === "control_interno" || lower.includes("control interno")) {
    // "Auditoría y Control Interno" (legado) se muestra como Auditoría
    return lower.includes("auditor") ? "Auditoría" : "Control Interno";
  }
  if (lower.includes("audit")) return "Auditoría";
  return null;
}

/** ¿El tipo almacenado corresponde al grupo indicado? (tolera valores legados) */
export function matchesGrupoServicio(tipo: string | null | undefined, grupo: GrupoServicio): boolean {
  return normalizeGrupoServicio(tipo) === grupo;
}

export const GRUPO_BADGE_STYLES: Record<GrupoServicio, string> = {
  Contabilidad: "bg-primary/10 text-primary",
  "Trámites": "bg-secondary/20 text-secondary-foreground",
  "Auditoría": "bg-amber-100 text-amber-700",
  "Control Interno": "bg-purple-100 text-purple-700",
};

/** Slugs usados en contratos.tipo_servicio */
export const CONTRACT_SERVICE_TYPES = [
  { value: "contabilidad", label: "Contabilidad" },
  { value: "tramites", label: "Trámites" },
  { value: "auditoria", label: "Auditoría" },
  { value: "control_interno", label: "Control Interno" },
] as const;

export const CONTRACT_SERVICE_TYPE_LABELS: Record<string, string> = {
  contabilidad: "Contabilidad",
  tramites: "Trámites",
  auditoria: "Auditoría",
  control_interno: "Control Interno",
};

/** Prefijo de correlativo por grupo (fallback si la secuencia en BD falla). */
export const GRUPO_PROFORMA_PREFIX: Record<GrupoServicio, string> = {
  Contabilidad: "PC",
  "Trámites": "PT",
  "Auditoría": "PA",
  "Control Interno": "PCI",
};

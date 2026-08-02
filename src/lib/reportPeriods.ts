import { parseLocalDate } from "@/lib/utils";

export type PeriodType = "dia" | "semana" | "mes" | "anio" | "rango";

export interface PeriodRange {
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
  label: string;
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** ISO week number of a local date */
export function getISOWeek(date: Date): number {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7; // monday = 0
  d.setDate(d.getDate() - day + 3);
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const fDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - fDay + 3);
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}

/** Monday of ISO week `week` in `year` */
export function isoWeekStart(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const day = (jan4.getDay() + 6) % 7;
  const monday = new Date(year, 0, 4 - day);
  monday.setDate(monday.getDate() + (week - 1) * 7);
  return monday;
}

export function weeksInYear(year: number): number {
  return getISOWeek(new Date(year, 11, 28));
}

export interface PeriodState {
  type: PeriodType;
  anio: number;
  mes: number; // 0-11
  semana: number; // ISO week
  dia: string; // YYYY-MM-DD
  desde: string;
  hasta: string;
}

export function defaultPeriodState(): PeriodState {
  const now = new Date();
  return {
    type: "mes",
    anio: now.getFullYear(),
    mes: now.getMonth(),
    semana: getISOWeek(now),
    dia: iso(now),
    desde: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
    hasta: iso(now),
  };
}

export function resolvePeriod(p: PeriodState): PeriodRange {
  switch (p.type) {
    case "dia": {
      const d = parseLocalDate(p.dia);
      return { desde: iso(d), hasta: iso(d), label: `Día ${iso(d)}` };
    }
    case "semana": {
      const start = isoWeekStart(p.anio, p.semana);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { desde: iso(start), hasta: iso(end), label: `Semana ${p.semana} · ${p.anio}` };
    }
    case "mes": {
      const start = new Date(p.anio, p.mes, 1);
      const end = new Date(p.anio, p.mes + 1, 0);
      return { desde: iso(start), hasta: iso(end), label: `${MESES[p.mes]} ${p.anio}` };
    }
    case "anio":
      return { desde: `${p.anio}-01-01`, hasta: `${p.anio}-12-31`, label: `Año ${p.anio}` };
    case "rango":
    default:
      return { desde: p.desde, hasta: p.hasta, label: `${p.desde} a ${p.hasta}` };
  }
}

/* ---------------- Document types ---------------- */

export type DocTipoKey = "factura" | "boleta" | "rxh" | "recibo_simple" | "otros";

export const DOC_TIPOS: { key: DocTipoKey; label: string }[] = [
  { key: "factura", label: "Factura" },
  { key: "boleta", label: "Boleta" },
  { key: "rxh", label: "Recibo por Honorarios (RxH)" },
  { key: "recibo_simple", label: "Recibo Simple" },
  { key: "otros", label: "Otros" },
];

export function normalizeDocTipo(raw: string | null | undefined): DocTipoKey {
  const v = (raw || "").toLowerCase().replace(/[\s_-]+/g, "");
  if (!v) return "otros";
  if (v.includes("factura")) return "factura";
  if (v.includes("boleta")) return "boleta";
  if (v.includes("honorario") || v === "rxh" || v.includes("rxh")) return "rxh";
  if (v.includes("recibo")) return "recibo_simple";
  return "otros";
}

export function docTipoLabel(key: DocTipoKey): string {
  return DOC_TIPOS.find((d) => d.key === key)?.label ?? "Otros";
}
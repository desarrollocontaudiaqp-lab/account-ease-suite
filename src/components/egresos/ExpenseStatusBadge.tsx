import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "bg-muted text-muted-foreground" },
  pendiente: { label: "Pendiente", className: "bg-amber-100 text-amber-800 border-amber-200" },
  aprobado: { label: "Aprobado", className: "bg-blue-100 text-blue-800 border-blue-200" },
  rechazado: { label: "Rechazado", className: "bg-rose-100 text-rose-800 border-rose-200" },
  pagado: { label: "Pagado", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  anulado: { label: "Anulado", className: "bg-zinc-200 text-zinc-700 border-zinc-300 line-through" },
};

export function ExpenseStatusBadge({ estado }: { estado: string }) {
  const m = MAP[estado] || MAP.borrador;
  return <Badge variant="outline" className={m.className}>{m.label}</Badge>;
}
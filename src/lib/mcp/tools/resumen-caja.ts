import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "resumen_caja",
  title: "Resumen de caja",
  description:
    "Calcula ingresos cobrados, egresos pagados y saldo del periodo indicado (por defecto el mes en curso).",
  inputSchema: {
    desde: z.string().describe("Fecha inicial en formato YYYY-MM-DD.").optional(),
    hasta: z.string().describe("Fecha final en formato YYYY-MM-DD.").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ desde, hasta }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const first = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    const last = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    )}`;
    const from = desde?.trim() || first;
    const to = hasta?.trim() || last;

    const supabase = supabaseForUser(ctx);
    const [ingresos, egresos] = await Promise.all([
      supabase
        .from("pagos")
        .select("monto")
        .eq("status", "pagado")
        .gte("fecha_pago", from)
        .lte("fecha_pago", to),
      supabase
        .from("expenses")
        .select("total")
        .eq("estado", "pagado")
        .gte("fecha_egreso", from)
        .lte("fecha_egreso", to),
    ]);

    const err = ingresos.error ?? egresos.error;
    if (err) return { content: [{ type: "text" as const, text: err.message }], isError: true };

    const totalIngresos = (ingresos.data ?? []).reduce((s, r) => s + Number(r.monto ?? 0), 0);
    const totalEgresos = (egresos.data ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0);
    const resumen = {
      desde: from,
      hasta: to,
      total_ingresos: totalIngresos,
      total_egresos: totalEgresos,
      saldo: totalIngresos - totalEgresos,
      cantidad_ingresos: ingresos.data?.length ?? 0,
      cantidad_egresos: egresos.data?.length ?? 0,
    };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(resumen) }],
      structuredContent: resumen,
    };
  },
});
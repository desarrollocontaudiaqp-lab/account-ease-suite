import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, toResult, unauthenticated } from "../supabase";

export default defineTool({
  name: "listar_egresos",
  title: "Listar egresos",
  description:
    "Lista egresos con su código, proveedor, categoría, estado, método de pago y montos, filtrables por estado y rango de fechas.",
  inputSchema: {
    estado: z
      .string()
      .describe("Estado del egreso: borrador, pendiente, aprobado, rechazado, pagado o anulado.")
      .optional(),
    desde: z.string().describe("Fecha mínima del egreso en formato YYYY-MM-DD.").optional(),
    hasta: z.string().describe("Fecha máxima del egreso en formato YYYY-MM-DD.").optional(),
    limite: z.number().int().describe("Máximo de resultados (por defecto 20).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ estado, desde, hasta, limite }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let q = supabaseForUser(ctx)
      .from("expenses")
      .select(
        "id, codigo, fecha_egreso, estado, moneda, subtotal, igv, total, proveedor_nombre, proveedor_documento, metodo_pago, centro_costo, descripcion, expense_categories(nombre)",
      )
      .order("fecha_egreso", { ascending: false })
      .limit(Math.min(limite ?? 20, 100));
    if (estado?.trim()) q = q.eq("estado", estado.trim());
    if (desde?.trim()) q = q.gte("fecha_egreso", desde.trim());
    if (hasta?.trim()) q = q.lte("fecha_egreso", hasta.trim());
    const { data, error } = await q;
    return toResult(data, error);
  },
});
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, toResult, unauthenticated } from "../supabase";

export default defineTool({
  name: "listar_proformas",
  title: "Listar proformas",
  description:
    "Lista proformas con cliente, estado, fechas de emisión/vencimiento y montos (subtotal, IGV, total).",
  inputSchema: {
    estado: z.string().describe("Estado de la proforma, por ejemplo 'pendiente'.").optional(),
    desde: z.string().describe("Fecha mínima de emisión en formato YYYY-MM-DD.").optional(),
    hasta: z.string().describe("Fecha máxima de emisión en formato YYYY-MM-DD.").optional(),
    limite: z.number().int().describe("Máximo de resultados (por defecto 20).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ estado, desde, hasta, limite }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let q = supabaseForUser(ctx)
      .from("proformas")
      .select(
        "id, numero, tipo, status, moneda, subtotal, igv, total, fecha_emision, fecha_vencimiento, clientes(razon_social, codigo)",
      )
      .order("fecha_emision", { ascending: false })
      .limit(Math.min(limite ?? 20, 100));
    if (estado?.trim()) q = q.eq("status", estado.trim());
    if (desde?.trim()) q = q.gte("fecha_emision", desde.trim());
    if (hasta?.trim()) q = q.lte("fecha_emision", hasta.trim());
    const { data, error } = await q;
    return toResult(data, error);
  },
});
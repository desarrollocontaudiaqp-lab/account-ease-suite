import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, toResult, unauthenticated } from "../supabase";

export default defineTool({
  name: "listar_pagos",
  title: "Listar pagos",
  description:
    "Lista cuotas y pagos de contratos con su estado, monto, fecha de vencimiento y fecha de pago. Útil para revisar cobranzas pendientes o vencidas.",
  inputSchema: {
    estado: z.string().describe("Estado del pago, por ejemplo 'pendiente' o 'pagado'.").optional(),
    vence_desde: z.string().describe("Fecha mínima de vencimiento en formato YYYY-MM-DD.").optional(),
    vence_hasta: z.string().describe("Fecha máxima de vencimiento en formato YYYY-MM-DD.").optional(),
    limite: z.number().int().describe("Máximo de resultados (por defecto 20).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ estado, vence_desde, vence_hasta, limite }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let q = supabaseForUser(ctx)
      .from("pagos")
      .select(
        "id, monto, monto_neto, status, fecha_vencimiento, fecha_pago, metodo_pago, numero_comprobante, contratos(numero, clientes(razon_social))",
      )
      .order("fecha_vencimiento", { ascending: true })
      .limit(Math.min(limite ?? 20, 100));
    if (estado?.trim()) q = q.eq("status", estado.trim());
    if (vence_desde?.trim()) q = q.gte("fecha_vencimiento", vence_desde.trim());
    if (vence_hasta?.trim()) q = q.lte("fecha_vencimiento", vence_hasta.trim());
    const { data, error } = await q;
    return toResult(data, error);
  },
});
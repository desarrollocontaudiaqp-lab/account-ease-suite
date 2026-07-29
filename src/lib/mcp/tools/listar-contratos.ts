import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, toResult, unauthenticated } from "../supabase";

export default defineTool({
  name: "listar_contratos",
  title: "Listar contratos",
  description:
    "Lista contratos con su cliente, estado, condición, montos y vigencia. Permite filtrar por estado o por texto del número/descripción.",
  inputSchema: {
    estado: z.string().describe("Estado del contrato, por ejemplo 'activo'.").optional(),
    query: z.string().describe("Texto a buscar en número o descripción del contrato.").optional(),
    limite: z.number().int().describe("Máximo de resultados (por defecto 20).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ estado, query, limite }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let q = supabaseForUser(ctx)
      .from("contratos")
      .select(
        "id, numero, descripcion, tipo_servicio, status, condicion, moneda, monto_mensual, monto_total, fecha_inicio, fecha_fin, clientes(razon_social, codigo)",
      )
      .order("fecha_inicio", { ascending: false })
      .limit(Math.min(limite ?? 20, 100));
    if (estado?.trim()) q = q.eq("status", estado.trim());
    if (query?.trim()) {
      const t = query.trim();
      q = q.or(`numero.ilike.%${t}%,descripcion.ilike.%${t}%`);
    }
    const { data, error } = await q;
    return toResult(data, error);
  },
});
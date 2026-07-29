import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, toResult, unauthenticated } from "../supabase";

export default defineTool({
  name: "buscar_clientes",
  title: "Buscar clientes",
  description:
    "Busca clientes por razón social, código o documento. Devuelve datos de contacto, tipo de cliente y estado.",
  inputSchema: {
    query: z.string().describe("Texto a buscar en razón social, código o nombre de persona natural.").optional(),
    limite: z.number().int().describe("Máximo de resultados (por defecto 20).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limite }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let q = supabaseForUser(ctx)
      .from("clientes")
      .select(
        "id, codigo, razon_social, nombre_persona_natural, tipo_cliente, email, telefono, activo, sector, regimen_tributario",
      )
      .order("razon_social")
      .limit(Math.min(limite ?? 20, 100));
    if (query?.trim()) {
      const t = query.trim();
      q = q.or(
        `razon_social.ilike.%${t}%,codigo.ilike.%${t}%,nombre_persona_natural.ilike.%${t}%`,
      );
    }
    const { data, error } = await q;
    return toResult(data, error);
  },
});
import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/**
 * Supabase client bound to the MCP caller's verified access token so every
 * query runs under that user's RLS policies. Never build a service-role
 * client here.
 */
export function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export function unauthenticated() {
  return {
    content: [{ type: "text" as const, text: "No autenticado." }],
    isError: true,
  };
}

export function toResult(data: unknown, error: { message: string } | null) {
  if (error) {
    return { content: [{ type: "text" as const, text: error.message }], isError: true };
  }
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data ?? []) }],
    structuredContent: { rows: (data ?? []) as unknown[] },
  };
}
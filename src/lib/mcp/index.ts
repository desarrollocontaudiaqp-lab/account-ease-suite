import { auth, defineMcp } from "@lovable.dev/mcp-js";
import buscarClientes from "./tools/buscar-clientes";
import listarContratos from "./tools/listar-contratos";
import listarProformas from "./tools/listar-proformas";
import listarPagos from "./tools/listar-pagos";
import listarEgresos from "./tools/listar-egresos";
import resumenCaja from "./tools/resumen-caja";

// Must be the direct Supabase host, built from the project ref (inlined at build time).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "studioflow-pro",
  title: "StudioFlow Pro",
  version: "0.1.0",
  instructions:
    "Herramientas de solo lectura sobre el sistema contable: clientes, contratos, proformas, pagos, egresos y resumen de caja. Todas las consultas se ejecutan con los permisos del usuario autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    buscarClientes,
    listarContratos,
    listarProformas,
    listarPagos,
    listarEgresos,
    resumenCaja,
  ],
});
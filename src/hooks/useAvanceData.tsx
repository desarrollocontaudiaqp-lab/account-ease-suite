import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSedeContext } from "@/hooks/useSedeContext";
import { DocTipoKey, normalizeDocTipo } from "@/lib/reportPeriods";
import { toast } from "sonner";

export interface AvanceRow {
  id: string;
  fecha: string; // reference date (fecha_pago if paid, else vencimiento)
  fecha_vencimiento: string;
  fecha_pago: string | null;
  status: string;
  monto: number;
  moneda: string;
  docTipo: DocTipoKey;
  tipoComprobanteRaw: string;
  comprobante: string;
  metodo_pago: string | null;
  contratoId: string | null;
  contratoNumero: string;
  clienteId: string | null;
  clienteNombre: string;
  clienteCodigo: string;
  asesorId: string | null;
  asesorNombre: string;
  carteraNombre: string;
}

export function useAvanceData() {
  const { activeSedeId } = useSedeContext();
  const [rows, setRows] = useState<AvanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("pagos")
        .select(
          `id, monto, fecha_vencimiento, fecha_pago, status, tipo_comprobante,
           serie_comprobante, numero_comprobante, metodo_pago, contrato_id, sede_id,
           contrato:contratos(id, numero, moneda, responsable_id, cliente_id,
             cliente:clientes(id, codigo, razon_social))`
        )
        .order("fecha_vencimiento", { ascending: false });
      if (activeSedeId) query = query.eq("sede_id", activeSedeId);

      const [{ data: pagos, error }, { data: profiles }, { data: carteraLinks }] = await Promise.all([
        query,
        supabase.from("profiles").select("id, full_name"),
        supabase.from("cartera_clientes").select("cliente_id, cartera:carteras(nombre)"),
      ]);
      if (error) throw error;

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || "—"]));
      const carteraMap = new Map<string, string>();
      (carteraLinks || []).forEach((c: any) => {
        if (c.cliente_id && c.cartera?.nombre && !carteraMap.has(c.cliente_id)) {
          carteraMap.set(c.cliente_id, c.cartera.nombre);
        }
      });

      const mapped: AvanceRow[] = (pagos || []).map((p: any) => {
        const contrato = p.contrato || {};
        const cliente = contrato.cliente || {};
        const fecha = (p.status === "pagado" && p.fecha_pago ? p.fecha_pago : p.fecha_vencimiento) || "";
        const serie = p.serie_comprobante || "";
        const numero = p.numero_comprobante || "";
        return {
          id: p.id,
          fecha: String(fecha).split("T")[0],
          fecha_vencimiento: (p.fecha_vencimiento || "").split("T")[0],
          fecha_pago: p.fecha_pago ? String(p.fecha_pago).split("T")[0] : null,
          status: p.status,
          monto: Number(p.monto || 0),
          moneda: contrato.moneda || "PEN",
          docTipo: normalizeDocTipo(p.tipo_comprobante),
          tipoComprobanteRaw: p.tipo_comprobante || "",
          comprobante: [serie, numero].filter(Boolean).join("-"),
          metodo_pago: p.metodo_pago,
          contratoId: contrato.id ?? null,
          contratoNumero: contrato.numero || "—",
          clienteId: cliente.id ?? null,
          clienteNombre: cliente.razon_social || "—",
          clienteCodigo: cliente.codigo || "—",
          asesorId: contrato.responsable_id ?? null,
          asesorNombre: contrato.responsable_id
            ? profileMap.get(contrato.responsable_id) || "Sin asignar"
            : "Sin asignar",
          carteraNombre: (cliente.id && carteraMap.get(cliente.id)) || "Sin cartera",
        };
      });
      setRows(mapped);
    } catch (e: any) {
      toast.error("Error al cargar datos del reporte: " + (e?.message ?? ""));
    } finally {
      setLoading(false);
    }
  }, [activeSedeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { rows, loading, refresh: fetchData };
}
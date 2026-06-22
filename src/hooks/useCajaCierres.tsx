import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSedeContext } from "@/hooks/useSedeContext";

export interface CajaCierre {
  id: string;
  codigo: string;
  tipo: "parcial" | "diario";
  sede_id: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  total_ingresos: number;
  total_egresos: number;
  saldo: number;
  cantidad_ingresos: number;
  cantidad_egresos: number;
  moneda: string;
  detalle: any;
  observaciones: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CajaMovimientoIngreso {
  id: string;
  monto: number;
  metodo_pago: string | null;
  referencia: string | null;
  cliente: string | null;
  contrato: string | null;
}

export interface CajaMovimientoEgreso {
  id: string;
  codigo: string;
  total: number;
  proveedor: string | null;
  metodo_pago: string | null;
  descripcion: string | null;
}

export function useCajaCierres() {
  const { activeSedeId } = useSedeContext();
  const [cierres, setCierres] = useState<CajaCierre[]>([]);
  const [ingresosHoy, setIngresosHoy] = useState<CajaMovimientoIngreso[]>([]);
  const [egresosHoy, setEgresosHoy] = useState<CajaMovimientoEgreso[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const hoy = new Date().toISOString().slice(0, 10);

      let q: any = (supabase as any)
        .from("caja_cierres")
        .select("*")
        .order("hora_fin", { ascending: false });
      if (activeSedeId) q = q.eq("sede_id", activeSedeId);

      const pagosQ: any = supabase
        .from("pagos")
        .select(`id, monto, metodo_pago, referencia, contrato:contratos(codigo, sede_id, cliente:clientes(razon_social))`)
        .eq("status", "pagado")
        .eq("fecha_pago", hoy);

      let expQ: any = (supabase as any)
        .from("expenses")
        .select("id, codigo, total, proveedor_nombre, metodo_pago, descripcion, sede_id, paid_at, fecha_egreso, estado")
        .eq("estado", "pagado");
      if (activeSedeId) expQ = expQ.eq("sede_id", activeSedeId);

      const [{ data: ccData, error: ccErr }, { data: pgData, error: pgErr }, { data: exData, error: exErr }] =
        await Promise.all([q, pagosQ, expQ]);
      if (ccErr) throw ccErr;
      if (pgErr) throw pgErr;
      if (exErr) throw exErr;

      setCierres((ccData || []) as CajaCierre[]);

      const ing = (pgData || [])
        .filter((p: any) => !activeSedeId || p.contrato?.sede_id === activeSedeId)
        .map((p: any) => ({
          id: p.id,
          monto: Number(p.monto || 0),
          metodo_pago: p.metodo_pago,
          referencia: p.referencia,
          cliente: p.contrato?.cliente?.razon_social || null,
          contrato: p.contrato?.codigo || null,
        }));
      setIngresosHoy(ing);

      const eg = (exData || [])
        .filter((x: any) => {
          const d = x.paid_at ? new Date(x.paid_at).toISOString().slice(0, 10) : x.fecha_egreso;
          return d === hoy;
        })
        .map((x: any) => ({
          id: x.id,
          codigo: x.codigo,
          total: Number(x.total || 0),
          proveedor: x.proveedor_nombre || null,
          metodo_pago: x.metodo_pago,
          descripcion: x.descripcion,
        }));
      setEgresosHoy(eg);
    } catch (e: any) {
      toast.error("Error al cargar caja: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [activeSedeId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { cierres, ingresosHoy, egresosHoy, loading, refresh: fetch };
}

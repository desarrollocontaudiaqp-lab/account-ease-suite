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
  const [fecha, setFecha] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [saldoInicial, setSaldoInicial] = useState<number>(0);
  const [saldoInicialId, setSaldoInicialId] = useState<string | null>(null);
  const [ingresosMes, setIngresosMes] = useState<number>(0);
  const [egresosMes, setEgresosMes] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const hoy = fecha;
      const [yStr, mStr] = hoy.split("-");
      const anio = Number(yStr);
      const mes = Number(mStr);
      const pad = (n: number) => String(n).padStart(2, "0");
      const mesInicio = `${anio}-${pad(mes)}-01`;
      const mesFin = mes === 12 ? `${anio + 1}-01-01` : `${anio}-${pad(mes + 1)}-01`;

      let q: any = (supabase as any)
        .from("caja_cierres")
        .select("*")
        .order("hora_fin", { ascending: false });
      if (activeSedeId) q = q.eq("sede_id", activeSedeId);

      const pagosQ: any = supabase
        .from("pagos")
        .select(`id, monto, metodo_pago, referencia, fecha_pago, contrato:contratos(numero, sede_id, cliente:clientes(razon_social))`)
        .eq("status", "pagado")
        .gte("fecha_pago", mesInicio)
        .lt("fecha_pago", mesFin);

      let expQ: any = (supabase as any)
        .from("expenses")
        .select("id, codigo, total, proveedor_nombre, metodo_pago, descripcion, sede_id, paid_at, fecha_egreso, estado")
        .eq("estado", "pagado");
      if (activeSedeId) expQ = expQ.eq("sede_id", activeSedeId);

      let siQ: any = (supabase as any)
        .from("caja_saldos_iniciales")
        .select("*")
        .eq("anio", anio)
        .eq("mes", mes);
      if (activeSedeId) siQ = siQ.eq("sede_id", activeSedeId);
      else siQ = siQ.is("sede_id", null);

      const [
        { data: ccData, error: ccErr },
        { data: pgData, error: pgErr },
        { data: exData, error: exErr },
        { data: siData, error: siErr },
      ] = await Promise.all([q, pagosQ, expQ, siQ]);
      if (ccErr) throw ccErr;
      if (pgErr) throw pgErr;
      if (exErr) throw exErr;
      if (siErr) throw siErr;

      setCierres((ccData || []) as CajaCierre[]);

      const pagosFiltered = (pgData || []).filter(
        (p: any) => !activeSedeId || p.contrato?.sede_id === activeSedeId
      );
      const ing = pagosFiltered
        .filter((p: any) => p.fecha_pago === hoy)
        .map((p: any) => ({
          id: p.id,
          monto: Number(p.monto || 0),
          metodo_pago: p.metodo_pago,
          referencia: p.referencia,
          cliente: p.contrato?.cliente?.razon_social || null,
          contrato: p.contrato?.numero || null,
        }));
      setIngresosHoy(ing);
      setIngresosMes(pagosFiltered.reduce((a: number, p: any) => a + Number(p.monto || 0), 0));

      const expensesInMonth = (exData || []).filter((x: any) => {
        const d = x.paid_at ? new Date(x.paid_at).toISOString().slice(0, 10) : x.fecha_egreso;
        return d && d >= mesInicio && d < mesFin;
      });
      const eg = expensesInMonth
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
      setEgresosMes(expensesInMonth.reduce((a: number, x: any) => a + Number(x.total || 0), 0));

      const si = (siData || [])[0];
      setSaldoInicial(si ? Number(si.monto || 0) : 0);
      setSaldoInicialId(si ? si.id : null);
    } catch (e: any) {
      toast.error("Error al cargar caja: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [activeSedeId, fecha]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const saveSaldoInicial = useCallback(
    async (monto: number, observaciones?: string) => {
      const [yStr, mStr] = fecha.split("-");
      const anio = Number(yStr);
      const mes = Number(mStr);
      const payload: any = {
        sede_id: activeSedeId || null,
        anio,
        mes,
        monto,
        observaciones: observaciones ?? null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await (supabase as any)
        .from("caja_saldos_iniciales")
        .upsert(payload, { onConflict: "sede_id,anio,mes" });
      if (error) {
        toast.error("Error al guardar saldo inicial: " + error.message);
        return false;
      }
      toast.success("Saldo inicial guardado");
      await fetch();
      return true;
    },
    [activeSedeId, fecha, fetch]
  );

  return {
    cierres,
    ingresosHoy,
    egresosHoy,
    loading,
    refresh: fetch,
    fecha,
    setFecha,
    saldoInicial,
    saldoInicialId,
    ingresosMes,
    egresosMes,
    saveSaldoInicial,
  };
}

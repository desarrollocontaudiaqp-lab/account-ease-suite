import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSedeContext } from "@/hooks/useSedeContext";

export interface AlertFilter {
  id: string;
  label: string;
  dias: number;
}

export const DEFAULT_ALERT_FILTERS: AlertFilter[] = [
  { id: "hoy", label: "Hoy", dias: 0 },
  { id: "semana", label: "Semana", dias: 7 },
  { id: "quincena", label: "Quince Días", dias: 15 },
  { id: "mes", label: "Mes", dias: 30 },
];

const CONFIG_KEY = "contract_alert_filters";

export interface ContractAlert {
  id: string;
  numero: string;
  descripcion: string;
  tipo_servicio: string;
  status: string;
  condicion: string;
  moneda: string;
  monto_mensual: number | null;
  monto_total: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  sede_id: string | null;
  cliente: string;
  diasRestantes: number;
}

/** Parse YYYY-MM-DD without UTC shift */
export const parseLocalDate = (value: string) => {
  const [y, m, d] = value.split("T")[0].split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const diasHasta = (fecha: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseLocalDate(fecha);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

export function useContractAlerts(maxDias = 30) {
  const { activeSedeId, canViewAllSedes } = useSedeContext();
  const [contracts, setContracts] = useState<ContractAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contratos")
      .select(
        "id, numero, descripcion, tipo_servicio, status, condicion, moneda, monto_mensual, monto_total, fecha_inicio, fecha_fin, sede_id, clientes(razon_social)"
      )
      .not("fecha_fin", "is", null)
      .order("fecha_fin", { ascending: true });

    if (error) {
      console.error("Error cargando alertas de contratos:", error);
      setContracts([]);
      setLoading(false);
      return;
    }

    const mapped = (data || [])
      .filter((c) => c.condicion === "Vigente" && c.status !== "anulado")
      .map((c) => ({
        id: c.id,
        numero: c.numero,
        descripcion: c.descripcion,
        tipo_servicio: c.tipo_servicio,
        status: c.status as string,
        condicion: c.condicion as string,
        moneda: c.moneda,
        monto_mensual: c.monto_mensual,
        monto_total: c.monto_total,
        fecha_inicio: c.fecha_inicio,
        fecha_fin: c.fecha_fin as string,
        sede_id: c.sede_id,
        cliente:
          (c as unknown as { clientes?: { razon_social?: string } }).clientes?.razon_social || "—",
        diasRestantes: diasHasta(c.fecha_fin as string),
      }))
      .filter((c) => c.diasRestantes <= maxDias);

    setContracts(mapped);
    setLoading(false);
  }, [maxDias]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const visibleContracts = useMemo(
    () =>
      contracts.filter(
        (c) =>
          (canViewAllSedes && !activeSedeId) ||
          !activeSedeId ||
          c.sede_id === activeSedeId ||
          c.sede_id == null
      ),
    [contracts, activeSedeId, canViewAllSedes]
  );

  return { contracts: visibleContracts, loading, refetch: fetchContracts };
}

export function useAlertFilters() {
  const [filters, setFilters] = useState<AlertFilter[]>(DEFAULT_ALERT_FILTERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("configuracion")
        .select("valor")
        .eq("clave", CONFIG_KEY)
        .maybeSingle();
      const valor = data?.valor as unknown;
      if (Array.isArray(valor) && valor.length > 0) {
        setFilters(valor as AlertFilter[]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const persist = useCallback(async (next: AlertFilter[]) => {
    setFilters(next);
    const payload = JSON.parse(JSON.stringify(next));
    const { data: existing } = await supabase
      .from("configuracion")
      .select("id")
      .eq("clave", CONFIG_KEY)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("configuracion")
        .update({ valor: payload, updated_at: new Date().toISOString() })
        .eq("clave", CONFIG_KEY);
    } else {
      await supabase.from("configuracion").insert([
        {
          clave: CONFIG_KEY,
          valor: payload,
          descripcion: "Filtros de alertas de vencimiento de contratos",
        },
      ]);
    }
  }, []);

  const addFilter = (filter: Omit<AlertFilter, "id">) =>
    persist([...filters, { ...filter, id: crypto.randomUUID() }]);
  const updateFilter = (id: string, updates: Partial<AlertFilter>) =>
    persist(filters.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  const removeFilter = (id: string) => persist(filters.filter((f) => f.id !== id));
  const resetFilters = () => persist(DEFAULT_ALERT_FILTERS);

  return { filters, loading, addFilter, updateFilter, removeFilter, resetFilters };
}

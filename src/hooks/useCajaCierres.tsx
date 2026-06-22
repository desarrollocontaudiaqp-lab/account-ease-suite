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

export function useCajaCierres() {
  const { activeSedeId } = useSedeContext();
  const [cierres, setCierres] = useState<CajaCierre[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      let q: any = (supabase as any)
        .from("caja_cierres")
        .select("*")
        .order("hora_fin", { ascending: false });
      if (activeSedeId) q = q.eq("sede_id", activeSedeId);
      const { data, error } = await q;
      if (error) throw error;
      setCierres((data || []) as CajaCierre[]);
    } catch (e: any) {
      toast.error("Error al cargar cierres: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [activeSedeId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { cierres, loading, refresh: fetch };
}

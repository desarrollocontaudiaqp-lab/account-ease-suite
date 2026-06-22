import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSedeContext } from "@/hooks/useSedeContext";

export interface Expense {
  id: string;
  codigo: string;
  estado: "borrador" | "pendiente" | "aprobado" | "rechazado" | "pagado" | "anulado";
  sede_id: string | null;
  categoria_id: string | null;
  subcategoria_id: string | null;
  centro_costo: string | null;
  proveedor_nombre: string | null;
  proveedor_documento: string | null;
  tipo_documento: string | null;
  serie_documento: string | null;
  numero_documento: string | null;
  fecha_emision: string | null;
  fecha_egreso: string;
  moneda: string;
  tipo_cambio: number | null;
  subtotal: number;
  igv: number;
  otros_impuestos: number;
  total: number;
  metodo_pago: string | null;
  cuenta_bancaria: string | null;
  banco: string | null;
  referencia_pago: string | null;
  descripcion: string | null;
  observaciones: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useExpenses() {
  const { activeSedeId } = useSedeContext();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      let q: any = (supabase as any).from("expenses").select("*").order("fecha_egreso", { ascending: false });
      if (activeSedeId) q = q.eq("sede_id", activeSedeId);
      const { data, error } = await q;
      if (error) throw error;
      setExpenses((data || []) as Expense[]);
    } catch (e: any) {
      toast.error("Error al cargar egresos: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [activeSedeId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { expenses, loading, refresh: fetch };
}
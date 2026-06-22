import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ExpenseCategory {
  id: string;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  icono: string | null;
  activo: boolean;
  orden: number;
}

export interface ExpenseSubcategory {
  id: string;
  categoria_id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  orden: number;
}

export function useExpenseCategories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ExpenseSubcategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: cats, error: e1 }, { data: subs, error: e2 }] = await Promise.all([
        (supabase as any).from("expense_categories").select("*").order("orden"),
        (supabase as any).from("expense_subcategories").select("*").order("orden"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      setCategories((cats || []) as ExpenseCategory[]);
      setSubcategories((subs || []) as ExpenseSubcategory[]);
    } catch (e: any) {
      toast.error("Error al cargar categorías: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { categories, subcategories, loading, refresh: fetch };
}
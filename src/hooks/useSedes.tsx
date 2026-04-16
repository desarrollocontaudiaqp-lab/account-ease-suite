import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Sede {
  id: string;
  nombre: string;
  codigo: string;
  direccion: string | null;
  telefono: string | null;
  activa: boolean;
  orden: number;
}

export const useSedes = () => {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSedes = async () => {
    const { data, error } = await supabase
      .from('sedes' as any)
      .select('*')
      .order('orden', { ascending: true });
    if (!error && data) setSedes(data as unknown as Sede[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchSedes();
  }, []);

  return { sedes, loading, refetch: fetchSedes };
};

export const useUserSede = () => {
  const { user, role } = useAuth();
  const [sede, setSede] = useState<Sede | null>(null);
  const [loading, setLoading] = useState(true);

  const canViewAllSedes = role === 'administrador' || role === 'gerente';

  useEffect(() => {
    const fetch = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('sede_id')
        .eq('id', user.id)
        .maybeSingle();
      const sedeId = (profile as any)?.sede_id;
      if (sedeId) {
        const { data: s } = await supabase
          .from('sedes' as any)
          .select('*')
          .eq('id', sedeId)
          .maybeSingle();
        if (s) setSede(s as unknown as Sede);
      }
      setLoading(false);
    };
    fetch();
  }, [user?.id]);

  return { sede, canViewAllSedes, loading };
};

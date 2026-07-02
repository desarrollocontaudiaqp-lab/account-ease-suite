import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { PermisosPorModulo } from '@/hooks/useRolePermisos';

export function useCurrentPermisos() {
  const { role } = useAuth();
  const [permisos, setPermisos] = useState<PermisosPorModulo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!role) { setPermisos(null); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('role_permisos')
        .select('permisos')
        .eq('role', role)
        .maybeSingle();
      if (!cancelled) {
        setPermisos((data?.permisos as unknown as PermisosPorModulo) || null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [role]);

  const isAdmin = role === 'administrador' || role === 'gerente';

  const can = (modulo: keyof PermisosPorModulo, accion: string): boolean => {
    if (isAdmin) return true;
    if (!permisos) return false;
    const m: any = (permisos as any)[modulo];
    return !!(m && m[accion]);
  };

  return { permisos, loading, can, isAdmin, role };
}
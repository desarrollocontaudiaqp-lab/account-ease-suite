import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Determina si el usuario actual puede ver las credenciales SUNAT
 * (Usuario SUNAT / Clave SOL) de los clientes.
 * Administrador y Gerente siempre tienen acceso.
 */
export function useSunatCredentials() {
  const { user, role } = useAuth();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = role === 'administrador' || role === 'gerente';

  useEffect(() => {
    let cancelled = false;
    if (!user) { setAllowed(false); setLoading(false); return; }
    if (isAdmin) { setAllowed(true); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('ver_credenciales_sunat' as any)
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) {
        setAllowed(!!(data as any)?.ver_credenciales_sunat);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, isAdmin]);

  return { canViewSunat: allowed, loading };
}

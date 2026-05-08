import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { useUserSedes, Sede } from '@/hooks/useSedes';

interface SedeContextType {
  /** Sedes the current user has access to */
  availableSedes: Sede[];
  /** Currently active sede id, or null = "all sedes" (admin/gerente) */
  activeSedeId: string | null;
  setActiveSedeId: (id: string | null) => void;
  canViewAllSedes: boolean;
  loading: boolean;
}

const SedeContext = createContext<SedeContextType | undefined>(undefined);

const STORAGE_KEY = 'active_sede_id';

export const SedeProvider = ({ children }: { children: ReactNode }) => {
  const { sedes, canViewAllSedes, loading } = useUserSedes();
  const [activeSedeId, setActiveSedeIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    if (loading) return;
    // null = "Todas las sedes" (user still sees only the sedes they have access to via RLS).
    if (activeSedeId && !canViewAllSedes && sedes.length > 0 && !sedes.some((s) => s.id === activeSedeId)) {
      // Active sede is not in user's allowed list — reset to "Todas"
      setActiveSedeIdState(null);
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    }
  }, [sedes, activeSedeId, canViewAllSedes, loading]);

  const setActiveSedeId = (id: string | null) => {
    setActiveSedeIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const value = useMemo(
    () => ({ availableSedes: sedes, activeSedeId, setActiveSedeId, canViewAllSedes, loading }),
    [sedes, activeSedeId, canViewAllSedes, loading]
  );

  return <SedeContext.Provider value={value}>{children}</SedeContext.Provider>;
};

export const useSedeContext = () => {
  const ctx = useContext(SedeContext);
  if (!ctx) throw new Error('useSedeContext must be used within SedeProvider');
  return ctx;
};
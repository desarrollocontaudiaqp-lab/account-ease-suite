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
    if (canViewAllSedes) return; // null means "all"
    // Ensure active sede is one the user has access to
    if (sedes.length === 0) {
      setActiveSedeIdState(null);
      return;
    }
    if (!activeSedeId || !sedes.some((s) => s.id === activeSedeId)) {
      const next = sedes[0].id;
      setActiveSedeIdState(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
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
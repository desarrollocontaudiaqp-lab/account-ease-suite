import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface Permiso {
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
  exportar?: boolean;
}

export interface PermisosPorModulo {
  clientes: Permiso;
  contratos: Permiso;
  proformas: Permiso;
  usuarios: Permiso;
  configuracion: { ver: boolean; editar: boolean };
  reportes: { ver: boolean; exportar: boolean };
}

export interface RolePermiso {
  id: string;
  role: AppRole;
  nombre_display: string;
  descripcion: string | null;
  permisos: PermisosPorModulo;
  activo: boolean;
}

export const useRolePermisos = () => {
  const [roles, setRoles] = useState<RolePermiso[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('role_permisos')
        .select('*')
        .order('nombre_display');

      if (error) throw error;

      const mappedRoles: RolePermiso[] = (data || []).map(item => ({
        id: item.id,
        role: item.role as AppRole,
        nombre_display: item.nombre_display,
        descripcion: item.descripcion,
        permisos: item.permisos as unknown as PermisosPorModulo,
        activo: item.activo,
      }));

      setRoles(mappedRoles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Error al cargar roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const updateRolePermisos = async (roleId: string, permisos: PermisosPorModulo) => {
    try {
      const { error } = await supabase
        .from('role_permisos')
        .update({ permisos: JSON.parse(JSON.stringify(permisos)) })
        .eq('id', roleId);

      if (error) throw error;

      toast.success('Permisos actualizados');
      fetchRoles();
    } catch (error) {
      console.error('Error updating permisos:', error);
      toast.error('Error al actualizar permisos');
    }
  };

  const updateRoleInfo = async (roleId: string, data: { nombre_display: string; descripcion: string }) => {
    try {
      const { error } = await supabase
        .from('role_permisos')
        .update(data)
        .eq('id', roleId);

      if (error) throw error;

      toast.success('Rol actualizado');
      fetchRoles();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Error al actualizar rol');
    }
  };

  const toggleRoleActivo = async (roleId: string, activo: boolean) => {
    try {
      const { error } = await supabase
        .from('role_permisos')
        .update({ activo })
        .eq('id', roleId);

      if (error) throw error;

      toast.success(activo ? 'Rol activado' : 'Rol desactivado');
      fetchRoles();
    } catch (error) {
      console.error('Error toggling role:', error);
      toast.error('Error al cambiar estado del rol');
    }
  };

  return {
    roles,
    loading,
    updateRolePermisos,
    updateRoleInfo,
    toggleRoleActivo,
    refetch: fetchRoles,
  };
};

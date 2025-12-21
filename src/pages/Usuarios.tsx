import { useState, useEffect } from 'react';
import { Users, Shield, Settings, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import UserActions from '@/components/usuarios/UserActions';
import EditUserDialog from '@/components/usuarios/EditUserDialog';
import ChangePasswordDialog from '@/components/usuarios/ChangePasswordDialog';
import DeleteUserDialog from '@/components/usuarios/DeleteUserDialog';
import CreateUserDialog from '@/components/usuarios/CreateUserDialog';

type AppRole = Database['public']['Enums']['app_role'];

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  role: AppRole;
}

const roleStyles: Record<AppRole, string> = {
  administrador: 'bg-red-100 text-red-800',
  gerente: 'bg-purple-100 text-purple-800',
  asesor: 'bg-green-100 text-green-800',
  auxiliar: 'bg-yellow-100 text-yellow-800',
  practicante: 'bg-orange-100 text-orange-800',
};

const roleLabels: Record<AppRole, string> = {
  administrador: 'Administrador',
  gerente: 'Gerente',
  asesor: 'Asesor',
  auxiliar: 'Auxiliar',
  practicante: 'Practicante',
};

const getInitials = (name: string | null, email: string) => {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
};

const Usuarios = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles: UserProfile[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || 'asesor',
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditUser = async (userId: string, data: { full_name: string; phone: string; role: AppRole }) => {
    setActionLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: data.full_name, phone: data.phone })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Update role
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: data.role })
        .eq('user_id', userId);

      if (roleError) throw roleError;

      toast.success('Usuario actualizado');
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Error al actualizar usuario');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async (newPassword: string) => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    try {
      // Note: This requires admin privileges via service role key in an edge function
      // For now, we'll show a message that this requires admin access
      toast.info('El cambio de contraseña requiere acceso de administrador. Contacte al soporte técnico.');
      setPasswordDialogOpen(false);
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Error al cambiar contraseña');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    try {
      // Note: Deleting users from auth.users requires admin privileges
      // We can only delete the profile, which will cascade due to FK
      toast.info('La eliminación de usuarios requiere acceso de administrador. Contacte al soporte técnico.');
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Error al eliminar usuario');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateUser = async (data: { email: string; password: string; full_name: string; role: AppRole }) => {
    setActionLoading(true);
    try {
      // Create user via signup (this will trigger the handle_new_user function)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.full_name }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update the role (the trigger creates with 'asesor' by default)
        if (data.role !== 'asesor') {
          const { error: roleError } = await supabase
            .from('user_roles')
            .update({ role: data.role })
            .eq('user_id', authData.user.id);

          if (roleError) console.error('Error updating role:', roleError);
        }
      }

      toast.success('Usuario creado. Se ha enviado un email de verificación.');
      setCreateDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.message?.includes('already registered')) {
        toast.error('Este email ya está registrado');
      } else {
        toast.error('Error al crear usuario');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const activeUsers = users.filter(u => true); // All users are active for now

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>
        <Button className="btn-gradient gap-2" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{users.length}</p>
            <p className="text-sm text-muted-foreground">Usuarios Totales</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-green-100">
            <Shield className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{activeUsers.length}</p>
            <p className="text-sm text-muted-foreground">Activos</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-secondary/20">
            <Settings className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">5</p>
            <p className="text-sm text-muted-foreground">Roles Definidos</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Lista de Usuarios</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Usuario
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Rol
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Teléfono
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Fecha Registro
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="table-row-hover">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {getInitials(user.full_name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{user.full_name || 'Sin nombre'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={roleStyles[user.role]}>
                      {roleLabels[user.role]}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{user.phone || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('es-PE')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <UserActions
                        userId={user.id}
                        userName={user.full_name || user.email}
                        onEdit={() => {
                          setSelectedUser(user);
                          setEditDialogOpen(true);
                        }}
                        onChangePassword={() => {
                          setSelectedUser(user);
                          setPasswordDialogOpen(true);
                        }}
                        onDelete={() => {
                          setSelectedUser(user);
                          setDeleteDialogOpen(true);
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No hay usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialogs */}
      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        onSave={handleEditUser}
        loading={actionLoading}
      />

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        userName={selectedUser?.full_name || selectedUser?.email || ''}
        onSave={handleChangePassword}
        loading={actionLoading}
      />

      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        userName={selectedUser?.full_name || selectedUser?.email || ''}
        onConfirm={handleDeleteUser}
        loading={actionLoading}
      />

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreateUser}
        loading={actionLoading}
      />
    </div>
  );
};

export default Usuarios;

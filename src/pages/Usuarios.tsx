import { useState, useEffect } from 'react';
import { Users, Shield, Settings, Plus, Loader2, UserPlus, Briefcase, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import { useRolePermisos } from '@/hooks/useRolePermisos';
import UserActions from '@/components/usuarios/UserActions';
import EditUserDialog from '@/components/usuarios/EditUserDialog';
import ChangePasswordDialog from '@/components/usuarios/ChangePasswordDialog';
import DeleteUserDialog from '@/components/usuarios/DeleteUserDialog';
import CreateUserDialog from '@/components/usuarios/CreateUserDialog';
import PersonalTable, { PersonalProfile } from '@/components/usuarios/PersonalTable';
import CreatePersonalDialog from '@/components/usuarios/CreatePersonalDialog';
import EditPersonalDialog from '@/components/usuarios/EditPersonalDialog';
import DeletePersonalDialog from '@/components/usuarios/DeletePersonalDialog';
import ImportPersonalDialog from '@/components/usuarios/ImportPersonalDialog';

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
  supervisor: 'bg-blue-100 text-blue-800',
  contador: 'bg-teal-100 text-teal-800',
  asistente: 'bg-pink-100 text-pink-800',
};

const getInitials = (name: string | null, email: string) => {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
};

const Usuarios = () => {
  const { roles: availableRoles } = useRolePermisos();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [personal, setPersonal] = useState<PersonalProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('usuarios');
  
  // User dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Personal dialog states
  const [createPersonalDialogOpen, setCreatePersonalDialogOpen] = useState(false);
  const [editPersonalDialogOpen, setEditPersonalDialogOpen] = useState(false);
  const [deletePersonalDialogOpen, setDeletePersonalDialogOpen] = useState(false);
  const [importPersonalDialogOpen, setImportPersonalDialogOpen] = useState(false);
  const [selectedPersonal, setSelectedPersonal] = useState<PersonalProfile | null>(null);

  const getRoleLabel = (role: AppRole) => {
    const roleInfo = availableRoles.find(r => r.role === role);
    return roleInfo?.nombre_display || role;
  };

  const fetchData = async () => {
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

      // Create a set of user IDs that have roles (have user accounts)
      const userIdsWithRoles = new Set(roles?.map(r => r.user_id) || []);

      // Separate users (with accounts) from personal (without accounts)
      const usersWithRoles: UserProfile[] = [];
      const allPersonal: PersonalProfile[] = [];

      (profiles || []).forEach(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        const hasUser = userIdsWithRoles.has(profile.id);

        // Add to users list if they have a role (user account)
        if (hasUser) {
          usersWithRoles.push({
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            phone: profile.phone,
            avatar_url: profile.avatar_url,
            created_at: profile.created_at,
            role: userRole?.role || 'asesor',
          });
        }

        // Add all profiles to personal list
        allPersonal.push({
          id: profile.id,
          dni: (profile as any).dni || null,
          full_name: profile.full_name,
          puesto: (profile as any).puesto || null,
          email: profile.email,
          avatar_url: profile.avatar_url,
          phone: profile.phone,
          created_at: profile.created_at,
          has_user: hasUser,
        });
      });

      setUsers(usersWithRoles);
      setPersonal(allPersonal);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // User handlers
  const handleEditUser = async (userId: string, data: { full_name: string; phone: string; role: AppRole }) => {
    setActionLoading(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: data.full_name, phone: data.phone })
        .eq('id', userId);

      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: data.role })
        .eq('user_id', userId);

      if (roleError) throw roleError;

      toast.success('Usuario actualizado');
      setEditDialogOpen(false);
      fetchData();
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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.full_name }
        }
      });

      if (authError) throw authError;

      if (authData.user && data.role !== 'asesor') {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: data.role })
          .eq('user_id', authData.user.id);

        if (roleError) console.error('Error updating role:', roleError);
      }

      toast.success('Usuario creado. Se ha enviado un email de verificación.');
      setCreateDialogOpen(false);
      fetchData();
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

  // Personal handlers
  const handleCreatePersonal = async (data: { dni: string; full_name: string; puesto: string; email: string; phone: string }) => {
    setActionLoading(true);
    try {
      // Generate a unique ID for the personal (since they won't have an auth user)
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: crypto.randomUUID(),
          email: data.email,
          full_name: data.full_name,
          phone: data.phone,
          dni: data.dni,
          puesto: data.puesto,
        });

      if (error) throw error;

      toast.success('Personal registrado correctamente');
      setCreatePersonalDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error creating personal:', error);
      if (error.code === '23505') {
        toast.error('Ya existe un registro con este email');
      } else {
        toast.error('Error al registrar personal');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditPersonal = async (id: string, data: { dni: string; full_name: string; puesto: string; phone: string }) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone,
          dni: data.dni,
          puesto: data.puesto,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Personal actualizado');
      setEditPersonalDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error updating personal:', error);
      toast.error('Error al actualizar personal');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePersonal = async () => {
    if (!selectedPersonal) return;
    setActionLoading(true);
    try {
      if (selectedPersonal.has_user) {
        toast.info('No se puede eliminar personal con cuenta de usuario activa. Elimine primero el usuario.');
        setDeletePersonalDialogOpen(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedPersonal.id);

      if (error) throw error;

      toast.success('Personal eliminado');
      setDeletePersonalDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error deleting personal:', error);
      toast.error('Error al eliminar personal');
    } finally {
      setActionLoading(false);
    }
  };

  const usersWithAccount = users.length;
  const personalWithoutAccount = personal.filter(p => !p.has_user).length;

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
            Gestión de Usuarios y Personal
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra usuarios del sistema y personal de la empresa
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{personal.length}</p>
            <p className="text-sm text-muted-foreground">Total Personal</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-green-100">
            <Shield className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{usersWithAccount}</p>
            <p className="text-sm text-muted-foreground">Con Usuario</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-100">
            <Briefcase className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{personalWithoutAccount}</p>
            <p className="text-sm text-muted-foreground">Sin Usuario</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-secondary/20">
            <Settings className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{availableRoles.filter(r => r.activo).length}</p>
            <p className="text-sm text-muted-foreground">Roles Activos</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList>
            <TabsTrigger value="usuarios" className="gap-2">
              <Shield className="h-4 w-4" />
              Usuarios
            </TabsTrigger>
            <TabsTrigger value="personal" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Personal
            </TabsTrigger>
          </TabsList>
          
          {activeTab === 'usuarios' ? (
            <Button className="btn-gradient gap-2" onClick={() => setCreateDialogOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Nuevo Usuario
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={() => setImportPersonalDialogOpen(true)}>
                <Upload className="h-4 w-4" />
                Importar Personal
              </Button>
              <Button className="btn-gradient gap-2" onClick={() => setCreatePersonalDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Nuevo Personal
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="usuarios" className="mt-6">
          {/* Users Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Lista de Usuarios</h3>
              <p className="text-sm text-muted-foreground">Personal con cuenta de acceso al sistema</p>
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
                          {getRoleLabel(user.role)}
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
        </TabsContent>

        <TabsContent value="personal" className="mt-6">
          <PersonalTable
            personal={personal}
            onEdit={(person) => {
              setSelectedPersonal(person);
              setEditPersonalDialogOpen(true);
            }}
            onDelete={(person) => {
              setSelectedPersonal(person);
              setDeletePersonalDialogOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* User Dialogs */}
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

      {/* Personal Dialogs */}
      <CreatePersonalDialog
        open={createPersonalDialogOpen}
        onOpenChange={setCreatePersonalDialogOpen}
        onCreate={handleCreatePersonal}
        loading={actionLoading}
      />

      <EditPersonalDialog
        open={editPersonalDialogOpen}
        onOpenChange={setEditPersonalDialogOpen}
        person={selectedPersonal}
        onSave={handleEditPersonal}
        loading={actionLoading}
      />

      <DeletePersonalDialog
        open={deletePersonalDialogOpen}
        onOpenChange={setDeletePersonalDialogOpen}
        personName={selectedPersonal?.full_name || selectedPersonal?.email || ''}
        hasUser={selectedPersonal?.has_user || false}
        onConfirm={handleDeletePersonal}
        loading={actionLoading}
      />

      <ImportPersonalDialog
        open={importPersonalDialogOpen}
        onOpenChange={setImportPersonalDialogOpen}
        onImportComplete={fetchData}
      />
    </div>
  );
};

export default Usuarios;

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, User, Mail, AlertTriangle } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { useRolePermisos } from '@/hooks/useRolePermisos';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

type AppRole = Database['public']['Enums']['app_role'];

interface PersonalWithoutUser {
  id: string;
  full_name: string | null;
  email: string;
  dni: string | null;
  puesto: string | null;
}

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { email: string; password: string; full_name: string; role: AppRole; profileId: string }) => Promise<void>;
  loading: boolean;
}

const CreateUserDialog = ({ open, onOpenChange, onCreate, loading }: CreateUserDialogProps) => {
  const { roles: availableRoles } = useRolePermisos();
  const [personalList, setPersonalList] = useState<PersonalWithoutUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersonal, setSelectedPersonal] = useState<PersonalWithoutUser | null>(null);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AppRole>('asesor');
  const [error, setError] = useState('');
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailAlreadyRegistered, setEmailAlreadyRegistered] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPersonalWithoutUser();
    }
  }, [open]);

  const fetchPersonalWithoutUser = async () => {
    setLoadingPersonal(true);
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, dni, puesto')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Get all user_roles to identify which profiles have user accounts
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id');

      if (rolesError) throw rolesError;

      const userIds = new Set(userRoles?.map(r => r.user_id) || []);

      // Filter profiles that don't have user accounts
      const personalWithoutUser = (profiles || []).filter(p => !userIds.has(p.id));
      setPersonalList(personalWithoutUser);
    } catch (error) {
      console.error('Error fetching personal:', error);
    } finally {
      setLoadingPersonal(false);
    }
  };

  const filteredPersonal = useMemo(() => {
    if (!searchQuery.trim()) return personalList.slice(0, 10);
    const query = searchQuery.toLowerCase();
    return personalList.filter(p => 
      p.full_name?.toLowerCase().includes(query) ||
      p.email.toLowerCase().includes(query) ||
      p.dni?.toLowerCase().includes(query)
    ).slice(0, 10);
  }, [personalList, searchQuery]);

  const handleSelectPersonal = async (personal: PersonalWithoutUser) => {
    setSelectedPersonal(personal);
    setSearchQuery('');
    setEmailAlreadyRegistered(false);
    setError('');
    
    // Check if email is already registered in auth
    setCheckingEmail(true);
    try {
      // We can't directly check auth.users, but we can check user_roles
      const { data: existingUser } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('user_id', personal.id)
        .maybeSingle();

      if (existingUser) {
        setEmailAlreadyRegistered(true);
      }
    } catch (error) {
      console.error('Error checking email:', error);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedPersonal) {
      setError('Debe seleccionar un personal');
      return;
    }

    if (emailAlreadyRegistered) {
      setError('Este personal ya tiene una cuenta de usuario');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    await onCreate({ 
      email: selectedPersonal.email, 
      password, 
      full_name: selectedPersonal.full_name || '', 
      role,
      profileId: selectedPersonal.id
    });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSearchQuery('');
      setSelectedPersonal(null);
      setPassword('');
      setRole('asesor');
      setError('');
      setEmailAlreadyRegistered(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Nuevo Usuario</DialogTitle>
          <DialogDescription>
            Selecciona un personal existente para crear su cuenta de acceso
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal Search/Selection */}
          {!selectedPersonal ? (
            <div className="space-y-2">
              <Label>Buscar Personal</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, email o DNI..."
                  className="pl-9"
                  autoFocus
                />
              </div>
              
              {loadingPersonal ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPersonal.length > 0 ? (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {filteredPersonal.map((personal) => (
                    <button
                      key={personal.id}
                      type="button"
                      onClick={() => handleSelectPersonal(personal)}
                      className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors flex items-start gap-3 border-b last:border-b-0"
                    >
                      <div className="p-1.5 rounded-full bg-primary/10 mt-0.5 shrink-0">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="font-medium text-sm truncate">
                          {personal.full_name || 'Sin nombre'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {personal.email}
                        </p>
                        {personal.puesto && (
                          <p className="text-xs text-muted-foreground truncate">
                            {personal.puesto}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {searchQuery ? 'No se encontró personal' : 'No hay personal sin cuenta de usuario'}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Personal Seleccionado</Label>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="p-2 rounded-full bg-primary/10 shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="font-medium truncate">{selectedPersonal.full_name || 'Sin nombre'}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-hidden">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{selectedPersonal.email}</span>
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedPersonal(null);
                    setEmailAlreadyRegistered(false);
                  }}
                  className="shrink-0"
                >
                  Cambiar
                </Button>
              </div>
              
              {checkingEmail && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Verificando...
                </div>
              )}
              
              {emailAlreadyRegistered && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Este personal ya tiene una cuenta de usuario activa.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="create-password">Contraseña</Label>
            <Input
              id="create-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="input-focus"
              required
              disabled={emailAlreadyRegistered}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="create-role">Rol</Label>
            <Select 
              value={role} 
              onValueChange={(value) => setRole(value as AppRole)}
              disabled={emailAlreadyRegistered}
            >
              <SelectTrigger className="input-focus w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.filter(r => r.activo).map((r) => (
                  <SelectItem key={r.role} value={r.role}>
                    {r.nombre_display}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="btn-gradient" 
              disabled={loading || !selectedPersonal || emailAlreadyRegistered}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Crear Usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserDialog;

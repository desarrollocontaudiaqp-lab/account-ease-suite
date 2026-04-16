import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, User, Mail, AlertTriangle } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { useRolePermisos } from '@/hooks/useRolePermisos';
import { useSedes } from '@/hooks/useSedes';
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
  onCreate: (data: { email: string; password: string; full_name: string; role: AppRole; profileId: string; sede_id: string | null }) => Promise<void>;
  loading: boolean;
}

const CreateUserDialog = ({ open, onOpenChange, onCreate, loading }: CreateUserDialogProps) => {
  const { roles: availableRoles } = useRolePermisos();
  const { sedes } = useSedes();
  const [sedeId, setSedeId] = useState<string>('');
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
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, dni, puesto')
        .order('full_name');

      if (profilesError) throw profilesError;

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id');

      if (rolesError) throw rolesError;

      const userIds = new Set(userRoles?.map(r => r.user_id) || []);
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
    
    setCheckingEmail(true);
    try {
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

    if (!sedeId) {
      setError('Debe seleccionar una sede');
      return;
    }

    await onCreate({ 
      email: selectedPersonal.email, 
      password, 
      full_name: selectedPersonal.full_name || '', 
      role,
      profileId: selectedPersonal.id,
      sede_id: sedeId,
    });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSearchQuery('');
      setSelectedPersonal(null);
      setPassword('');
      setRole('asesor');
      setSedeId('');
      setError('');
      setEmailAlreadyRegistered(false);
    }
    onOpenChange(open);
  };

  const clearSelection = () => {
    setSelectedPersonal(null);
    setEmailAlreadyRegistered(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>Nuevo Usuario</DialogTitle>
          <DialogDescription>
            Selecciona un personal existente para crear su cuenta de acceso
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!selectedPersonal ? (
            <div className="space-y-3">
              <Label>Buscar Personal</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nombre, email o DNI..."
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
                      className="w-full px-3 py-2.5 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0"
                    >
                      <p className="font-medium text-sm">
                        {personal.full_name || 'Sin nombre'}
                      </p>
                      <p className="text-xs text-muted-foreground break-all">
                        {personal.email}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {searchQuery ? 'No se encontró personal' : 'No hay personal disponible'}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Personal Seleccionado</Label>
                <Button 
                  type="button" 
                  variant="link" 
                  size="sm"
                  onClick={clearSelection}
                  className="h-auto p-0 text-xs"
                >
                  Cambiar
                </Button>
              </div>
              
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-primary shrink-0" />
                  <p className="font-medium text-sm">{selectedPersonal.full_name || 'Sin nombre'}</p>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3 mt-0.5 shrink-0" />
                  <span className="break-all leading-relaxed">{selectedPersonal.email}</span>
                </div>
              </div>
              
              {checkingEmail && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Verificando...
                </div>
              )}
              
              {emailAlreadyRegistered && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
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
              <SelectTrigger>
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

          <div className="space-y-2">
            <Label htmlFor="create-sede">Sede</Label>
            <Select value={sedeId} onValueChange={setSedeId} disabled={emailAlreadyRegistered}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una sede" />
              </SelectTrigger>
              <SelectContent>
                {sedes.filter(s => s.activa).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre} ({s.codigo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleClose(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="btn-gradient w-full sm:w-auto" 
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

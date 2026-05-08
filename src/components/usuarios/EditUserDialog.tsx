import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { useRolePermisos } from '@/hooks/useRolePermisos';
import { useSedes } from '@/hooks/useSedes';

type AppRole = Database['public']['Enums']['app_role'];

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: AppRole;
  sede_id?: string | null;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onSave: (userId: string, data: { full_name: string; role: AppRole; sede_id: string | null }) => Promise<void>;
  loading: boolean;
}

const EditUserDialog = ({ open, onOpenChange, user, onSave, loading }: EditUserDialogProps) => {
  const { roles: availableRoles } = useRolePermisos();
  const { sedes } = useSedes();
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AppRole>('asesor');
  const [sedeId, setSedeId] = useState<string>('');

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setRole(user.role);
      setSedeId(user.sede_id || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      await onSave(user.id, { full_name: fullName, role, sede_id: sedeId || null });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email || ''} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre del usuario"
              className="input-focus"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select value={role} onValueChange={(value) => setRole(value as AppRole)}>
              <SelectTrigger className="input-focus">
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
            <Label htmlFor="sede">Sede</Label>
            <Select value={sedeId} onValueChange={setSedeId}>
              <SelectTrigger className="input-focus">
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
            <p className="text-xs text-muted-foreground">
              El usuario solo verá datos de su sede asignada (excepto Administrador y Gerente).
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-gradient" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;

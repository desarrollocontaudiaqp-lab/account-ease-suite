import { useState } from 'react';
import { Shield, Edit2, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRolePermisos, RolePermiso, PermisosPorModulo } from '@/hooks/useRolePermisos';

const moduloLabels: Record<string, string> = {
  clientes: 'Clientes',
  contratos: 'Contratos',
  proformas: 'Proformas',
  usuarios: 'Usuarios',
  configuracion: 'Configuración',
  reportes: 'Reportes',
};

const permisoLabels: Record<string, string> = {
  ver: 'Ver',
  crear: 'Crear',
  editar: 'Editar',
  eliminar: 'Eliminar',
  exportar: 'Exportar',
};

export const RolesManager = () => {
  const { roles, loading, updateRolePermisos, updateRoleInfo, toggleRoleActivo } = useRolePermisos();
  const [editingRole, setEditingRole] = useState<RolePermiso | null>(null);
  const [editingPermisos, setEditingPermisos] = useState<PermisosPorModulo | null>(null);
  const [editInfoDialogOpen, setEditInfoDialogOpen] = useState(false);
  const [editPermisosDialogOpen, setEditPermisosDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit info form
  const [nombreDisplay, setNombreDisplay] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const handleEditInfo = (role: RolePermiso) => {
    setEditingRole(role);
    setNombreDisplay(role.nombre_display);
    setDescripcion(role.descripcion || '');
    setEditInfoDialogOpen(true);
  };

  const handleEditPermisos = (role: RolePermiso) => {
    setEditingRole(role);
    setEditingPermisos(JSON.parse(JSON.stringify(role.permisos)));
    setEditPermisosDialogOpen(true);
  };

  const handleSaveInfo = async () => {
    if (!editingRole) return;
    setSaving(true);
    await updateRoleInfo(editingRole.id, { nombre_display: nombreDisplay, descripcion });
    setSaving(false);
    setEditInfoDialogOpen(false);
  };

  const handleSavePermisos = async () => {
    if (!editingRole || !editingPermisos) return;
    setSaving(true);
    await updateRolePermisos(editingRole.id, editingPermisos);
    setSaving(false);
    setEditPermisosDialogOpen(false);
  };

  const togglePermiso = (modulo: string, permiso: string, value: boolean) => {
    if (!editingPermisos) return;
    
    setEditingPermisos(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      (updated as any)[modulo] = { ...(updated as any)[modulo], [permiso]: value };
      return updated;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Roles de Usuario</h3>
          <p className="text-sm text-muted-foreground">Gestiona los roles y permisos del sistema</p>
        </div>
      </div>

      <div className="space-y-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{role.nombre_display}</p>
                  <Badge variant="outline" className="text-xs">
                    {role.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{role.descripcion || 'Sin descripción'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={role.activo}
                onCheckedChange={(checked) => toggleRoleActivo(role.id, checked)}
              />
              <Button variant="outline" size="sm" onClick={() => handleEditInfo(role)}>
                <Edit2 className="h-3 w-3 mr-1" />
                Info
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleEditPermisos(role)}>
                <Shield className="h-3 w-3 mr-1" />
                Permisos
              </Button>
            </div>
          </div>
        ))}

        {roles.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No hay roles configurados
          </div>
        )}
      </div>

      {/* Edit Info Dialog */}
      <Dialog open={editInfoDialogOpen} onOpenChange={setEditInfoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Rol</DialogTitle>
            <DialogDescription>Modifica la información del rol</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre para mostrar</Label>
              <Input
                value={nombreDisplay}
                onChange={(e) => setNombreDisplay(e.target.value)}
                placeholder="Ej: Administrador"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe las responsabilidades de este rol"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInfoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveInfo} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permisos Dialog */}
      <Dialog open={editPermisosDialogOpen} onOpenChange={setEditPermisosDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permisos - {editingRole?.nombre_display}</DialogTitle>
            <DialogDescription>Configura los permisos para cada módulo</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {editingPermisos && Object.entries(editingPermisos).map(([modulo, permisos]) => (
              <div key={modulo} className="space-y-3">
                <h4 className="font-medium text-foreground border-b border-border pb-2">
                  {moduloLabels[modulo] || modulo}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(permisos as Record<string, boolean>).map(([permiso, value]) => (
                    <div key={permiso} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${modulo}-${permiso}`}
                        checked={value}
                        onCheckedChange={(checked) => togglePermiso(modulo, permiso, checked === true)}
                      />
                      <Label htmlFor={`${modulo}-${permiso}`} className="text-sm cursor-pointer">
                        {permisoLabels[permiso] || permiso}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPermisosDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePermisos} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar Permisos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

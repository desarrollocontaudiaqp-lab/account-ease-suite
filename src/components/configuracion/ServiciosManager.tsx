import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Servicio {
  id: string;
  tipo: string;
  grupo_servicio: string | null;
  regimen_tributario: string | null;
  compras_ventas_mensual_soles: string | null;
  compras_ventas_anual_soles: string | null;
  valoracion: string | null;
  entidad: string | null;
  tramite: string | null;
  servicio: string;
  base_imponible: number;
  igv_monto: number;
  precio_servicio: number;
  activo: boolean;
}

interface ServiciosManagerProps {
  tipo: "contabilidad" | "tramites" | "auditoria";
  titulo: string;
}

export const ServiciosManager = ({ tipo, titulo }: ServiciosManagerProps) => {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null);
  const [deletingServicio, setDeletingServicio] = useState<Servicio | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    grupo_servicio: "",
    regimen_tributario: "",
    compras_ventas_mensual_soles: "",
    compras_ventas_anual_soles: "",
    valoracion: "",
    entidad: "",
    tramite: "",
    servicio: "",
    base_imponible: "",
    igv_monto: "",
    precio_servicio: "",
  });

  useEffect(() => {
    fetchServicios();
  }, [tipo]);

  const fetchServicios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("servicios")
      .select("*")
      .eq("tipo", tipo)
      .order("grupo_servicio", { ascending: true })
      .order("servicio", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los servicios",
        variant: "destructive",
      });
    } else {
      setServicios(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      grupo_servicio: "",
      regimen_tributario: "",
      compras_ventas_mensual_soles: "",
      compras_ventas_anual_soles: "",
      valoracion: "",
      entidad: "",
      tramite: "",
      servicio: "",
      base_imponible: "",
      igv_monto: "",
      precio_servicio: "",
    });
    setEditingServicio(null);
  };

  const handleOpenDialog = (servicio?: Servicio) => {
    if (servicio) {
      setEditingServicio(servicio);
      setFormData({
        grupo_servicio: servicio.grupo_servicio || "",
        regimen_tributario: servicio.regimen_tributario || "",
        compras_ventas_mensual_soles: servicio.compras_ventas_mensual_soles || "",
        compras_ventas_anual_soles: servicio.compras_ventas_anual_soles || "",
        valoracion: servicio.valoracion || "",
        entidad: servicio.entidad || "",
        tramite: servicio.tramite || "",
        servicio: servicio.servicio,
        base_imponible: servicio.base_imponible?.toString() || "0",
        igv_monto: servicio.igv_monto?.toString() || "0",
        precio_servicio: servicio.precio_servicio?.toString() || "0",
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!formData.servicio.trim()) {
      toast({
        title: "Error",
        description: "La descripción del servicio es obligatoria",
        variant: "destructive",
      });
      return;
    }

    const base_imponible = parseFloat(formData.base_imponible) || 0;
    const igv_monto = parseFloat(formData.igv_monto) || 0;
    const precio_servicio = parseFloat(formData.precio_servicio) || 0;

    const dataToSave = {
      grupo_servicio: formData.grupo_servicio.trim() || null,
      regimen_tributario: formData.regimen_tributario.trim() || null,
      compras_ventas_mensual_soles: formData.compras_ventas_mensual_soles.trim() || null,
      compras_ventas_anual_soles: formData.compras_ventas_anual_soles.trim() || null,
      valoracion: formData.valoracion.trim() || null,
      entidad: formData.entidad.trim() || null,
      tramite: formData.tramite.trim() || null,
      servicio: formData.servicio.trim(),
      base_imponible,
      igv_monto,
      precio_servicio,
    };

    if (editingServicio) {
      // Update existing
      const { error } = await supabase
        .from("servicios")
        .update(dataToSave)
        .eq("id", editingServicio.id);

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar el servicio",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Éxito",
        description: "Servicio actualizado correctamente",
      });
    } else {
      // Create new
      const { error } = await supabase.from("servicios").insert({
        tipo,
        ...dataToSave,
      });

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo crear el servicio",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Éxito",
        description: "Servicio creado correctamente",
      });
    }

    handleCloseDialog();
    fetchServicios();
  };

  const handleToggleActivo = async (servicio: Servicio) => {
    const { error } = await supabase
      .from("servicios")
      .update({ activo: !servicio.activo })
      .eq("id", servicio.id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      });
      return;
    }
    fetchServicios();
  };

  const handleDelete = async () => {
    if (!deletingServicio) return;

    const { error } = await supabase
      .from("servicios")
      .delete()
      .eq("id", deletingServicio.id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el servicio",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Éxito",
      description: "Servicio eliminado correctamente",
    });
    setDeleteDialogOpen(false);
    setDeletingServicio(null);
    fetchServicios();
  };

  // Group by grupo_servicio
  const serviciosByGrupo = servicios.reduce((acc, srv) => {
    const grupo = srv.grupo_servicio || "Sin grupo";
    if (!acc[grupo]) {
      acc[grupo] = [];
    }
    acc[grupo].push(srv);
    return acc;
  }, {} as Record<string, Servicio[]>);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">{titulo}</h3>
        <Button
          onClick={() => handleOpenDialog()}
          className="gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando...</div>
      ) : servicios.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No hay servicios registrados
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {Object.entries(serviciosByGrupo).map(([grupo, items]) => (
            <div key={grupo}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {grupo}
              </p>
              <div className="space-y-2">
                {items.map((srv) => (
                  <div
                    key={srv.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      srv.activo ? "bg-muted/30 border-border" : "bg-muted/10 border-border/50 opacity-60"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {srv.servicio}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1 ml-6">
                        {srv.regimen_tributario && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {srv.regimen_tributario}
                          </span>
                        )}
                        {srv.entidad && (
                          <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {srv.entidad}
                          </span>
                        )}
                        {srv.tramite && (
                          <span className="text-xs text-muted-foreground">
                            {srv.tramite}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-semibold text-foreground">
                        S/ {(srv.precio_servicio || 0).toFixed(2)}
                      </span>
                      <Switch
                        checked={srv.activo}
                        onCheckedChange={() => handleToggleActivo(srv)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenDialog(srv)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeletingServicio(srv);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingServicio ? "Editar Servicio" : "Nuevo Servicio"}
            </DialogTitle>
            <DialogDescription>
              {editingServicio
                ? "Modifica los datos del servicio"
                : `Agrega un nuevo servicio de ${tipo === "contabilidad" ? "contabilidad" : tipo === "tramites" ? "trámites" : "auditoría y control interno"}`}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grupo_servicio">Grupo de Servicio</Label>
                  <Input
                    id="grupo_servicio"
                    placeholder="Ej: AUDITORÍAS"
                    value={formData.grupo_servicio}
                    onChange={(e) =>
                      setFormData({ ...formData, grupo_servicio: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regimen_tributario">Régimen Tributario</Label>
                  <Input
                    id="regimen_tributario"
                    placeholder="Ej: RER, RMT, RG"
                    value={formData.regimen_tributario}
                    onChange={(e) =>
                      setFormData({ ...formData, regimen_tributario: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="compras_ventas_mensual_soles">Compras/Ventas Mensual (S/)</Label>
                  <Input
                    id="compras_ventas_mensual_soles"
                    placeholder="Ej: 10,000 - 50,000"
                    value={formData.compras_ventas_mensual_soles}
                    onChange={(e) =>
                      setFormData({ ...formData, compras_ventas_mensual_soles: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="compras_ventas_anual_soles">Compras/Ventas Anual (S/)</Label>
                  <Input
                    id="compras_ventas_anual_soles"
                    placeholder="Ej: 120,000 - 600,000"
                    value={formData.compras_ventas_anual_soles}
                    onChange={(e) =>
                      setFormData({ ...formData, compras_ventas_anual_soles: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valoracion">Valoración</Label>
                  <Input
                    id="valoracion"
                    placeholder="Ej: Alta, Media, Baja"
                    value={formData.valoracion}
                    onChange={(e) =>
                      setFormData({ ...formData, valoracion: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entidad">Entidad</Label>
                  <Input
                    id="entidad"
                    placeholder="Ej: SUNAT, SUNARP"
                    value={formData.entidad}
                    onChange={(e) =>
                      setFormData({ ...formData, entidad: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tramite">Trámite</Label>
                <Input
                  id="tramite"
                  placeholder="Ej: Constitución de empresa"
                  value={formData.tramite}
                  onChange={(e) =>
                    setFormData({ ...formData, tramite: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="servicio">
                  Descripción del Servicio <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="servicio"
                  placeholder="Ej: Declaración mensual de impuestos"
                  value={formData.servicio}
                  onChange={(e) =>
                    setFormData({ ...formData, servicio: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_imponible">Base Imponible (S/)</Label>
                  <Input
                    id="base_imponible"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.base_imponible}
                    onChange={(e) =>
                      setFormData({ ...formData, base_imponible: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="igv_monto">IGV (S/)</Label>
                  <Input
                    id="igv_monto"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.igv_monto}
                    onChange={(e) =>
                      setFormData({ ...formData, igv_monto: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precio_servicio">Precio del Servicio (S/)</Label>
                  <Input
                    id="precio_servicio"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.precio_servicio}
                    onChange={(e) =>
                      setFormData({ ...formData, precio_servicio: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingServicio ? "Guardar cambios" : "Crear servicio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el
              servicio "{deletingServicio?.servicio}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingServicio(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
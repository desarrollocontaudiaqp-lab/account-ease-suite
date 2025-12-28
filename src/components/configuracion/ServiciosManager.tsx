import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, FileText, Package } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Servicio {
  id: string;
  tipo: string;
  categoria: string;
  servicio: string;
  producto: string | null;
  variante: string | null;
  precio: number;
  activo: boolean;
}

interface ServiciosManagerProps {
  tipo: "contabilidad" | "tramites";
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
    categoria: "",
    servicio: "",
    producto: "",
    variante: "",
    precio: "",
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
      .order("categoria", { ascending: true })
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
      categoria: "",
      servicio: "",
      producto: "",
      variante: "",
      precio: "",
    });
    setEditingServicio(null);
  };

  const handleOpenDialog = (servicio?: Servicio) => {
    if (servicio) {
      setEditingServicio(servicio);
      setFormData({
        categoria: servicio.categoria,
        servicio: servicio.servicio,
        producto: servicio.producto || "",
        variante: servicio.variante || "",
        precio: servicio.precio.toString(),
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
    if (!formData.categoria.trim() || !formData.servicio.trim()) {
      toast({
        title: "Error",
        description: "La categoría y el servicio son obligatorios",
        variant: "destructive",
      });
      return;
    }

    const precio = parseFloat(formData.precio) || 0;

    if (editingServicio) {
      // Update existing
      const { error } = await supabase
        .from("servicios")
        .update({
          categoria: formData.categoria.trim(),
          servicio: formData.servicio.trim(),
          producto: formData.producto.trim() || null,
          variante: formData.variante.trim() || null,
          precio,
        })
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
        categoria: formData.categoria.trim(),
        servicio: formData.servicio.trim(),
        producto: formData.producto.trim() || null,
        variante: formData.variante.trim() || null,
        precio,
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

  // Group by category
  const serviciosByCategoria = servicios.reduce((acc, srv) => {
    if (!acc[srv.categoria]) {
      acc[srv.categoria] = [];
    }
    acc[srv.categoria].push(srv);
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
          {Object.entries(serviciosByCategoria).map(([categoria, items]) => (
            <div key={categoria}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {categoria}
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
                      {(srv.producto || srv.variante) && (
                        <div className="flex items-center gap-2 mt-1 ml-6">
                          {srv.producto && (
                            <span className="text-xs text-muted-foreground">
                              {srv.producto}
                            </span>
                          )}
                          {srv.variante && (
                            <span className="text-xs text-primary">
                              {srv.variante}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-semibold text-foreground">
                        S/ {srv.precio.toFixed(2)}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingServicio ? "Editar Servicio" : "Nuevo Servicio"}
            </DialogTitle>
            <DialogDescription>
              {editingServicio
                ? "Modifica los datos del servicio"
                : `Agrega un nuevo servicio de ${tipo === "contabilidad" ? "contabilidad" : "trámites"}`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoria">
                Categoría <span className="text-destructive">*</span>
              </Label>
              <Input
                id="categoria"
                placeholder="Ej: AUDITORÍAS FINANCIERAS"
                value={formData.categoria}
                onChange={(e) =>
                  setFormData({ ...formData, categoria: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="servicio">
                Servicio <span className="text-destructive">*</span>
              </Label>
              <Input
                id="servicio"
                placeholder="Ej: AUDITORIAS TRIBUTARIAS"
                value={formData.servicio}
                onChange={(e) =>
                  setFormData({ ...formData, servicio: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="producto">Producto</Label>
              <Input
                id="producto"
                placeholder="Ej: DECLARACION ANUAL DE RENTA"
                value={formData.producto}
                onChange={(e) =>
                  setFormData({ ...formData, producto: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="variante">Variante</Label>
              <Input
                id="variante"
                placeholder="Ej: DE 10,000 A 120,000 SOLES"
                value={formData.variante}
                onChange={(e) =>
                  setFormData({ ...formData, variante: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="precio">Precio (S/)</Label>
              <Input
                id="precio"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.precio}
                onChange={(e) =>
                  setFormData({ ...formData, precio: e.target.value })
                }
              />
            </div>
          </div>

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

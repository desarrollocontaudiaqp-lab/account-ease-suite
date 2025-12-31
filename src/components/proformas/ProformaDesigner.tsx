import { useState, useEffect } from "react";
import { Plus, Trash2, Save, ChevronRight, FileText, Briefcase, Check, Settings2, PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Campo {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "date";
  options?: string[];
  required: boolean;
  category?: string;
}

interface Plantilla {
  id: string;
  nombre: string;
  tipo: "contabilidad" | "tramites";
  descripcion: string | null;
  campos: Campo[];
  activa: boolean;
}

interface ProformaDesignerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fieldTypes = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "select", label: "Selección" },
  { value: "textarea", label: "Área de texto" },
  { value: "date", label: "Fecha" },
];

interface ServicioFromDB {
  id: string;
  tipo: string;
  categoria: string;
  servicio: string;
  producto: string | null;
  variante: string | null;
  precio: number;
  activo: boolean;
}

interface ServiceCategory {
  category: string;
  services: { label: string; precio: number }[];
}

export function ProformaDesigner({ open, onOpenChange }: ProformaDesignerProps) {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [selectedPlantilla, setSelectedPlantilla] = useState<Plantilla | null>(null);
  const [activeType, setActiveType] = useState<"contabilidad" | "tramites">("contabilidad");
  const [loading, setLoading] = useState(false);
  const [showCustomFieldForm, setShowCustomFieldForm] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<Campo["type"]>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [serviciosDB, setServiciosDB] = useState<ServiceCategory[]>([]);
  const [showNewPlantillaForm, setShowNewPlantillaForm] = useState(false);
  const [newPlantillaNombre, setNewPlantillaNombre] = useState("");
  const [newPlantillaTipo, setNewPlantillaTipo] = useState<"contabilidad" | "tramites">("contabilidad");
  const [newPlantillaDescripcion, setNewPlantillaDescripcion] = useState("");

  useEffect(() => {
    if (open) {
      fetchPlantillas();
      fetchServicios();
    }
  }, [open]);

  const fetchServicios = async () => {
    const { data, error } = await supabase
      .from("servicios")
      .select("*")
      .eq("activo", true)
      .order("categoria", { ascending: true })
      .order("servicio", { ascending: true });

    if (error) {
      console.error("Error fetching servicios:", error);
      return;
    }

    // Group services by category for the active type
    const groupedContabilidad: Record<string, { label: string; precio: number }[]> = {};
    const groupedTramites: Record<string, { label: string; precio: number }[]> = {};

    (data || []).forEach((s: ServicioFromDB) => {
      // Build label with producto and variante if available
      let label = s.servicio;
      if (s.producto) {
        label += ` - ${s.producto}`;
      }
      if (s.variante) {
        label += ` (${s.variante})`;
      }

      const serviceItem = { label, precio: s.precio };

      if (s.tipo === "contabilidad") {
        if (!groupedContabilidad[s.categoria]) {
          groupedContabilidad[s.categoria] = [];
        }
        groupedContabilidad[s.categoria].push(serviceItem);
      } else if (s.tipo === "tramites") {
        if (!groupedTramites[s.categoria]) {
          groupedTramites[s.categoria] = [];
        }
        groupedTramites[s.categoria].push(serviceItem);
      }
    });

    // Convert to array format
    const contabilidadArray: ServiceCategory[] = Object.entries(groupedContabilidad).map(([category, services]) => ({
      category,
      services,
    }));

    const tramitesArray: ServiceCategory[] = Object.entries(groupedTramites).map(([category, services]) => ({
      category,
      services,
    }));

    // Store both in state based on active type
    setServiciosDB(activeType === "contabilidad" ? contabilidadArray : tramitesArray);
  };

  useEffect(() => {
    if (open) {
      fetchServicios();
    }
  }, [activeType, open]);

  const fetchPlantillas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("proforma_plantillas")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Error al cargar plantillas");
      console.error(error);
    } else {
      const parsed = (data || []).map((p) => ({
        ...p,
        tipo: p.tipo as "contabilidad" | "tramites",
        campos: (Array.isArray(p.campos) ? p.campos : []) as unknown as Campo[],
      }));
      setPlantillas(parsed);
      const firstOfType = parsed.find((pl) => pl.tipo === activeType);
      if (firstOfType) setSelectedPlantilla(firstOfType);
    }
    setLoading(false);
  };

  const handleSelectPlantilla = (plantilla: Plantilla) => {
    setSelectedPlantilla(plantilla);
    setActiveType(plantilla.tipo);
  };

  const isServiceSelected = (serviceLabel: string) => {
    return selectedPlantilla?.campos.some((c) => c.label === serviceLabel) || false;
  };

  const handleToggleService = (serviceLabel: string, category: string) => {
    if (!selectedPlantilla) return;

    if (isServiceSelected(serviceLabel)) {
      // Remove service
      setSelectedPlantilla({
        ...selectedPlantilla,
        campos: selectedPlantilla.campos.filter((c) => c.label !== serviceLabel),
      });
    } else {
      // Add service
      const newField: Campo = {
        id: crypto.randomUUID(),
        label: serviceLabel,
        type: "number",
        required: false,
        category,
      };
      setSelectedPlantilla({
        ...selectedPlantilla,
        campos: [...selectedPlantilla.campos, newField],
      });
    }
  };

  const handleAddCustomField = () => {
    if (!selectedPlantilla || !newFieldLabel.trim()) {
      toast.error("Ingrese un nombre para el campo");
      return;
    }

    const newField: Campo = {
      id: crypto.randomUUID(),
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: newFieldRequired,
      category: "Personalizado",
      ...(newFieldType === "select" && {
        options: newFieldOptions.split(",").map((o) => o.trim()).filter(Boolean),
      }),
    };

    setSelectedPlantilla({
      ...selectedPlantilla,
      campos: [...selectedPlantilla.campos, newField],
    });

    setNewFieldLabel("");
    setNewFieldType("text");
    setNewFieldRequired(false);
    setNewFieldOptions("");
    setShowCustomFieldForm(false);
    toast.success("Campo agregado");
  };

  const handleRemoveField = (fieldId: string) => {
    if (!selectedPlantilla) return;
    setSelectedPlantilla({
      ...selectedPlantilla,
      campos: selectedPlantilla.campos.filter((c) => c.id !== fieldId),
    });
  };

  const handleSavePlantilla = async () => {
    if (!selectedPlantilla) return;

    setLoading(true);
    const { error } = await supabase
      .from("proforma_plantillas")
      .update({
        nombre: selectedPlantilla.nombre,
        descripcion: selectedPlantilla.descripcion,
        campos: JSON.parse(JSON.stringify(selectedPlantilla.campos)),
        activa: selectedPlantilla.activa,
      })
      .eq("id", selectedPlantilla.id);

    if (error) {
      toast.error("Error al guardar plantilla");
      console.error(error);
    } else {
      toast.success("Plantilla guardada correctamente");
      fetchPlantillas();
    }
    setLoading(false);
  };

  const handleCreatePlantilla = async () => {
    if (!newPlantillaNombre.trim()) {
      toast.error("Ingrese un nombre para la plantilla");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("proforma_plantillas")
      .insert({
        nombre: newPlantillaNombre.trim(),
        tipo: newPlantillaTipo,
        descripcion: newPlantillaDescripcion.trim() || null,
        campos: [],
        activa: true,
      })
      .select()
      .single();

    if (error) {
      toast.error("Error al crear plantilla");
      console.error(error);
    } else {
      toast.success("Plantilla creada correctamente");
      setNewPlantillaNombre("");
      setNewPlantillaDescripcion("");
      setShowNewPlantillaForm(false);
      await fetchPlantillas();
      // Select the new template
      if (data) {
        const newPlantilla: Plantilla = {
          ...data,
          tipo: data.tipo as "contabilidad" | "tramites",
          campos: [] as Campo[],
        };
        setSelectedPlantilla(newPlantilla);
        setActiveType(newPlantilla.tipo);
      }
    }
    setLoading(false);
  };

  const handleDeletePlantilla = async () => {
    if (!selectedPlantilla) return;
    
    if (!confirm(`¿Está seguro de eliminar la plantilla "${selectedPlantilla.nombre}"?`)) {
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("proforma_plantillas")
      .delete()
      .eq("id", selectedPlantilla.id);

    if (error) {
      toast.error("Error al eliminar plantilla");
      console.error(error);
    } else {
      toast.success("Plantilla eliminada");
      setSelectedPlantilla(null);
      fetchPlantillas();
    }
    setLoading(false);
  };

  const currentServices = serviciosDB;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Diseñador de Proformas
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Configura los servicios disponibles para cada tipo de proforma
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex">
          {/* Sidebar - Lista de plantillas */}
          <div className="w-64 border-r bg-muted/30 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                Plantillas
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowNewPlantillaForm(true)}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>

            {/* Form para nueva plantilla */}
            {showNewPlantillaForm && (
              <div className="mb-4 p-3 border rounded-lg bg-background space-y-3">
                <h4 className="font-medium text-sm">Nueva Plantilla</h4>
                <div>
                  <Label className="text-xs">Nombre</Label>
                  <Input
                    value={newPlantillaNombre}
                    onChange={(e) => setNewPlantillaNombre(e.target.value)}
                    placeholder="Nombre de la plantilla"
                    className="mt-1 h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={newPlantillaTipo}
                    onValueChange={(v) => setNewPlantillaTipo(v as "contabilidad" | "tramites")}
                  >
                    <SelectTrigger className="mt-1 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contabilidad">Contabilidad</SelectItem>
                      <SelectItem value="tramites">Trámites</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Descripción (opcional)</Label>
                  <Textarea
                    value={newPlantillaDescripcion}
                    onChange={(e) => setNewPlantillaDescripcion(e.target.value)}
                    placeholder="Descripción..."
                    className="mt-1 resize-none"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowNewPlantillaForm(false);
                      setNewPlantillaNombre("");
                      setNewPlantillaDescripcion("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleCreatePlantilla}
                    disabled={loading}
                  >
                    Crear
                  </Button>
                </div>
              </div>
            )}

            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {plantillas.map((plantilla) => (
                  <button
                    key={plantilla.id}
                    onClick={() => handleSelectPlantilla(plantilla)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedPlantilla?.id === plantilla.id
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-transparent bg-background hover:bg-background/80"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {plantilla.tipo === "contabilidad" ? (
                        <FileText className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Briefcase className="h-4 w-4 text-emerald-500" />
                      )}
                      <span className="font-medium text-sm truncate">{plantilla.nombre}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          plantilla.tipo === "contabilidad" 
                            ? "bg-blue-100 text-blue-700" 
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {plantilla.tipo === "contabilidad" ? "Contabilidad" : "Trámites"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {plantilla.campos.length} servicios
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Main content */}
          {selectedPlantilla ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header de plantilla */}
              <div className="px-6 py-4 border-b bg-background">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nombre de la plantilla</Label>
                      <Input
                        value={selectedPlantilla.nombre}
                        onChange={(e) =>
                          setSelectedPlantilla({
                            ...selectedPlantilla,
                            nombre: e.target.value,
                          })
                        }
                        className="mt-1 max-w-md font-medium"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Descripción</Label>
                      <Textarea
                        value={selectedPlantilla.descripcion || ""}
                        onChange={(e) =>
                          setSelectedPlantilla({
                            ...selectedPlantilla,
                            descripcion: e.target.value,
                          })
                        }
                        className="mt-1 max-w-md resize-none"
                        rows={2}
                        placeholder="Descripción de la plantilla..."
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDeletePlantilla}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-hidden flex">
                {/* Servicios disponibles */}
                <div className="flex-1 border-r overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b bg-muted/30">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Servicios Disponibles
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Marca los servicios que deseas incluir
                    </p>
                  </div>
                  <ScrollArea className="flex-1">
                    <Accordion type="multiple" defaultValue={currentServices.map((_, i) => `cat-${i}`)} className="px-4 py-2">
                      {currentServices.map((category, catIndex) => (
                        <AccordionItem key={catIndex} value={`cat-${catIndex}`} className="border-b-0">
                          <AccordionTrigger className="py-3 hover:no-underline">
                            <span className="font-medium text-sm">{category.category}</span>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4">
                            <div className="space-y-2">
                              {category.services.map((service, svcIndex) => {
                                const isSelected = isServiceSelected(service.label);
                                return (
                                  <label
                                    key={svcIndex}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                      isSelected
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:bg-muted/50"
                                    }`}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => handleToggleService(service.label, category.category)}
                                    />
                                    <span className="text-sm flex-1">{service.label}</span>
                                    <span className="text-xs text-muted-foreground">
                                      S/ {service.precio.toLocaleString()}
                                    </span>
                                    {isSelected && (
                                      <Check className="h-4 w-4 text-primary" />
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>

                    {/* Custom field section */}
                    <div className="px-4 pb-4">
                      <Separator className="my-4" />
                      {!showCustomFieldForm ? (
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => setShowCustomFieldForm(true)}
                        >
                          <Plus className="h-4 w-4" />
                          Agregar campo personalizado
                        </Button>
                      ) : (
                        <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                          <h5 className="font-medium text-sm">Nuevo campo personalizado</h5>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Nombre</Label>
                              <Input
                                value={newFieldLabel}
                                onChange={(e) => setNewFieldLabel(e.target.value)}
                                placeholder="Ej: Número de trabajadores"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Tipo</Label>
                              <Select
                                value={newFieldType}
                                onValueChange={(v) => setNewFieldType(v as Campo["type"])}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {fieldTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {newFieldType === "select" && (
                            <div>
                              <Label className="text-xs">Opciones (separadas por coma)</Label>
                              <Input
                                value={newFieldOptions}
                                onChange={(e) => setNewFieldOptions(e.target.value)}
                                placeholder="Opción 1, Opción 2, Opción 3"
                                className="mt-1"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={newFieldRequired}
                              onCheckedChange={setNewFieldRequired}
                            />
                            <Label className="text-xs">Campo requerido</Label>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowCustomFieldForm(false)}
                              className="flex-1"
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleAddCustomField}
                              className="flex-1"
                            >
                              Agregar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Servicios seleccionados */}
                <div className="w-80 overflow-hidden flex flex-col bg-muted/20">
                  <div className="px-4 py-3 border-b bg-muted/30">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      Servicios Incluidos ({selectedPlantilla.campos.length})
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Estos aparecerán en la proforma
                    </p>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-2">
                      {selectedPlantilla.campos.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            No hay servicios seleccionados
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Selecciona servicios de la lista
                          </p>
                        </div>
                      ) : (
                        selectedPlantilla.campos.map((campo) => (
                          <div
                            key={campo.id}
                            className="flex items-start gap-2 p-3 bg-background rounded-lg border group"
                          >
                            <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-tight">{campo.label}</p>
                              {campo.category && (
                                <p className="text-xs text-muted-foreground mt-1">{campo.category}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveField(campo.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t bg-background flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSavePlantilla} disabled={loading} className="gap-2">
                  <Save className="h-4 w-4" />
                  Guardar plantilla
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecciona una plantilla para editarla</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

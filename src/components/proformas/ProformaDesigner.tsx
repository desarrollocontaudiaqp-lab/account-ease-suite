import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical, Save, X } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Campo {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "date";
  options?: string[];
  required: boolean;
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

export function ProformaDesigner({ open, onOpenChange }: ProformaDesignerProps) {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [selectedPlantilla, setSelectedPlantilla] = useState<Plantilla | null>(null);
  const [activeTab, setActiveTab] = useState<"contabilidad" | "tramites">("contabilidad");
  const [loading, setLoading] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<Campo["type"]>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState("");

  useEffect(() => {
    if (open) {
      fetchPlantillas();
    }
  }, [open]);

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
      // Auto-select first plantilla of active tab
      const firstOfType = parsed.find((pl) => pl.tipo === activeTab);
      if (firstOfType) setSelectedPlantilla(firstOfType);
    }
    setLoading(false);
  };

  const handleSelectPlantilla = (plantilla: Plantilla) => {
    setSelectedPlantilla(plantilla);
  };

  const handleAddField = () => {
    if (!selectedPlantilla || !newFieldLabel.trim()) {
      toast.error("Ingrese un nombre para el campo");
      return;
    }

    const newField: Campo = {
      id: crypto.randomUUID(),
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: newFieldRequired,
      ...(newFieldType === "select" && {
        options: newFieldOptions.split(",").map((o) => o.trim()).filter(Boolean),
      }),
    };

    setSelectedPlantilla({
      ...selectedPlantilla,
      campos: [...selectedPlantilla.campos, newField],
    });

    // Reset form
    setNewFieldLabel("");
    setNewFieldType("text");
    setNewFieldRequired(false);
    setNewFieldOptions("");
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

  const filteredPlantillas = plantillas.filter((p) => p.tipo === activeTab);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Diseñador de Proformas
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as "contabilidad" | "tramites");
            const firstOfType = plantillas.find((p) => p.tipo === v);
            if (firstOfType) setSelectedPlantilla(firstOfType);
          }}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contabilidad">Contabilidad</TabsTrigger>
            <TabsTrigger value="tramites">Trámites</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="flex-1 overflow-hidden mt-4">
            <div className="grid grid-cols-3 gap-4 h-full">
              {/* Sidebar - Lista de plantillas */}
              <div className="border rounded-lg p-4 space-y-3 overflow-y-auto">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Plantillas
                </h3>
                {filteredPlantillas.map((plantilla) => (
                  <div
                    key={plantilla.id}
                    onClick={() => handleSelectPlantilla(plantilla)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPlantilla?.id === plantilla.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <p className="font-medium text-sm">{plantilla.nombre}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {plantilla.campos.length} campos
                    </p>
                  </div>
                ))}
              </div>

              {/* Main - Editor de campos */}
              <div className="col-span-2 border rounded-lg p-4 overflow-y-auto space-y-4">
                {selectedPlantilla ? (
                  <>
                    {/* Plantilla info */}
                    <div className="space-y-3">
                      <div>
                        <Label>Nombre de la plantilla</Label>
                        <Input
                          value={selectedPlantilla.nombre}
                          onChange={(e) =>
                            setSelectedPlantilla({
                              ...selectedPlantilla,
                              nombre: e.target.value,
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Descripción</Label>
                        <Textarea
                          value={selectedPlantilla.descripcion || ""}
                          onChange={(e) =>
                            setSelectedPlantilla({
                              ...selectedPlantilla,
                              descripcion: e.target.value,
                            })
                          }
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Campos existentes */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Campos personalizados</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedPlantilla.campos.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            No hay campos personalizados. Agrega uno abajo.
                          </p>
                        ) : (
                          selectedPlantilla.campos.map((campo) => (
                            <div
                              key={campo.id}
                              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                              <div className="flex-1">
                                <p className="font-medium text-sm">{campo.label}</p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {fieldTypes.find((t) => t.value === campo.type)?.label}
                                  </Badge>
                                  {campo.required && (
                                    <Badge variant="secondary" className="text-xs">
                                      Requerido
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveField(campo.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Agregar nuevo campo */}
                    <div className="border-t pt-4 space-y-3">
                      <h4 className="font-semibold text-sm">Agregar nuevo campo</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Nombre del campo</Label>
                          <Input
                            value={newFieldLabel}
                            onChange={(e) => setNewFieldLabel(e.target.value)}
                            placeholder="Ej: Número de trabajadores"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Tipo de campo</Label>
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
                          <Label>Opciones (separadas por coma)</Label>
                          <Input
                            value={newFieldOptions}
                            onChange={(e) => setNewFieldOptions(e.target.value)}
                            placeholder="Opción 1, Opción 2, Opción 3"
                            className="mt-1"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={newFieldRequired}
                            onCheckedChange={setNewFieldRequired}
                          />
                          <Label>Campo requerido</Label>
                        </div>
                        <Button onClick={handleAddField} size="sm" className="gap-2">
                          <Plus className="h-4 w-4" />
                          Agregar campo
                        </Button>
                      </div>
                    </div>

                    {/* Save button */}
                    <div className="border-t pt-4 flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSavePlantilla}
                        disabled={loading}
                        className="gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Guardar plantilla
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Selecciona una plantilla para editarla
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

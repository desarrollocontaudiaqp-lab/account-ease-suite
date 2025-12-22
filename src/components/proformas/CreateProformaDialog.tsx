import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
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
  campos: Campo[];
}

interface Cliente {
  id: string;
  razon_social: string;
  codigo: string;
  direccion: string | null;
  email: string | null;
  telefono: string | null;
}

interface ProformaItem {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface CreateProformaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tipo: "contabilidad" | "tramites";
}

export function CreateProformaDialog({
  open,
  onOpenChange,
  onSuccess,
  tipo,
}: CreateProformaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [selectedPlantilla, setSelectedPlantilla] = useState<Plantilla | null>(null);
  const [camposValues, setCamposValues] = useState<Record<string, string>>({});
  const [items, setItems] = useState<ProformaItem[]>([
    { descripcion: "", cantidad: 1, precio_unitario: 0, subtotal: 0 },
  ]);
  const [notas, setNotas] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, tipo]);

  const fetchData = async () => {
    // Fetch clientes
    const { data: clientesData } = await supabase
      .from("clientes")
      .select("id, razon_social, codigo, direccion, email, telefono")
      .eq("activo", true)
      .order("razon_social");

    if (clientesData) setClientes(clientesData);

    // Fetch plantillas
    const { data: plantillasData } = await supabase
      .from("proforma_plantillas")
      .select("*")
      .eq("tipo", tipo)
      .eq("activa", true);

    if (plantillasData) {
      const parsed = plantillasData.map((p) => ({
        ...p,
        tipo: p.tipo as "contabilidad" | "tramites",
        campos: (Array.isArray(p.campos) ? p.campos : []) as unknown as Campo[],
      }));
      setPlantillas(parsed);
      if (parsed.length > 0) {
        setSelectedPlantilla(parsed[0]);
      }
    }
  };

  const handlePlantillaChange = (plantillaId: string) => {
    const plantilla = plantillas.find((p) => p.id === plantillaId);
    setSelectedPlantilla(plantilla || null);
    setCamposValues({});
  };

  const handleCampoChange = (campoId: string, value: string) => {
    setCamposValues((prev) => ({ ...prev, [campoId]: value }));
  };

  const handleItemChange = (
    index: number,
    field: keyof ProformaItem,
    value: string | number
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate subtotal
    if (field === "cantidad" || field === "precio_unitario") {
      newItems[index].subtotal =
        Number(newItems[index].cantidad) * Number(newItems[index].precio_unitario);
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { descripcion: "", cantidad: 1, precio_unitario: 0, subtotal: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
    const igv = subtotal * 0.18;
    const total = subtotal + igv;
    return { subtotal, igv, total };
  };

  const generateProformaNumber = () => {
    const prefix = tipo === "contabilidad" ? "PC" : "PT";
    const date = new Date();
    const year = date.getFullYear();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `${prefix}-${year}-${random}`;
  };

  const handleSubmit = async () => {
    if (!selectedCliente) {
      toast.error("Seleccione un cliente");
      return;
    }

    if (!fechaVencimiento) {
      toast.error("Ingrese la fecha de vencimiento");
      return;
    }

    // Validate required fields
    if (selectedPlantilla) {
      for (const campo of selectedPlantilla.campos) {
        if (campo.required && !camposValues[campo.id]) {
          toast.error(`El campo "${campo.label}" es requerido`);
          return;
        }
      }
    }

    // Validate items
    const validItems = items.filter((item) => item.descripcion.trim() !== "");
    if (validItems.length === 0) {
      toast.error("Agregue al menos un item");
      return;
    }

    setLoading(true);
    const { subtotal, igv, total } = calculateTotals();

    // Create proforma
    const { data: proforma, error: proformaError } = await supabase
      .from("proformas")
      .insert({
        numero: generateProformaNumber(),
        cliente_id: selectedCliente,
        tipo: tipo,
        fecha_vencimiento: fechaVencimiento,
        subtotal,
        igv,
        total,
        notas,
        campos_personalizados: camposValues,
        status: "borrador",
      })
      .select()
      .single();

    if (proformaError) {
      toast.error("Error al crear la proforma");
      console.error(proformaError);
      setLoading(false);
      return;
    }

    // Create proforma items
    const proformaItems = validItems.map((item) => ({
      proforma_id: proforma.id,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
    }));

    const { error: itemsError } = await supabase
      .from("proforma_items")
      .insert(proformaItems);

    if (itemsError) {
      toast.error("Error al crear los items");
      console.error(itemsError);
    } else {
      toast.success("Proforma creada correctamente");
      onSuccess();
      onOpenChange(false);
      resetForm();
    }

    setLoading(false);
  };

  const resetForm = () => {
    setSelectedCliente("");
    setCamposValues({});
    setItems([{ descripcion: "", cantidad: 1, precio_unitario: 0, subtotal: 0 }]);
    setNotas("");
    setFechaVencimiento("");
  };

  const selectedClienteData = clientes.find((c) => c.id === selectedCliente);
  const { subtotal, igv, total } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Nueva Proforma de {tipo === "contabilidad" ? "Contabilidad" : "Trámites"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Datos del cliente */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Datos del Cliente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Cliente</Label>
                <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.razon_social} - {cliente.codigo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClienteData && (
                <>
                  <div>
                    <Label className="text-muted-foreground">RUC/DNI</Label>
                    <p className="font-medium">{selectedClienteData.codigo}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Dirección</Label>
                    <p className="font-medium">{selectedClienteData.direccion || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedClienteData.email || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Teléfono</Label>
                    <p className="font-medium">{selectedClienteData.telefono || "-"}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Campos personalizados de la plantilla */}
          {selectedPlantilla && selectedPlantilla.campos.length > 0 && (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Campos Específicos</h3>
                <Select
                  value={selectedPlantilla.id}
                  onValueChange={handlePlantillaChange}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {plantillas.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedPlantilla.campos.map((campo) => (
                  <div key={campo.id}>
                    <Label>
                      {campo.label}
                      {campo.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {campo.type === "select" ? (
                      <Select
                        value={camposValues[campo.id] || ""}
                        onValueChange={(v) => handleCampoChange(campo.id, v)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {campo.options?.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : campo.type === "textarea" ? (
                      <Textarea
                        value={camposValues[campo.id] || ""}
                        onChange={(e) => handleCampoChange(campo.id, e.target.value)}
                        className="mt-1"
                        rows={2}
                      />
                    ) : (
                      <Input
                        type={campo.type}
                        value={camposValues[campo.id] || ""}
                        onChange={(e) => handleCampoChange(campo.id, e.target.value)}
                        className="mt-1"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Items / Servicios */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Servicios</h3>
              <Button onClick={addItem} size="sm" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar servicio
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <Input
                      placeholder="Descripción del servicio"
                      value={item.descripcion}
                      onChange={(e) => handleItemChange(index, "descripcion", e.target.value)}
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      placeholder="Cant."
                      value={item.cantidad}
                      onChange={(e) => handleItemChange(index, "cantidad", Number(e.target.value))}
                      min={1}
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      placeholder="Precio"
                      value={item.precio_unitario}
                      onChange={(e) =>
                        handleItemChange(index, "precio_unitario", Number(e.target.value))
                      }
                      min={0}
                      step={0.01}
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      value={`S/ ${item.subtotal.toFixed(2)}`}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>S/ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IGV (18%):</span>
                  <span>S/ {igv.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total:</span>
                  <span>S/ {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fecha y notas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fecha de Vencimiento</Label>
              <Input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Notas adicionales..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Guardando..." : "Crear Proforma"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

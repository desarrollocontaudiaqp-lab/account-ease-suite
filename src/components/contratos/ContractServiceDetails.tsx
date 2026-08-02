import { useState } from "react";
import { ListChecks, Plus, Trash2, Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ServiceDetalle {
  id: string;
  descripcion: string;
}

interface ServiceLike {
  id: string;
  descripcion: string;
  color?: string;
  detalles?: ServiceDetalle[];
}

interface ContractServiceDetailsProps {
  services: ServiceLike[];
  onChange: (serviceIndex: number, detalles: ServiceDetalle[]) => void;
}

export const ContractServiceDetails = ({ services, onChange }: ContractServiceDetailsProps) => {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<{ key: string; value: string } | null>(null);

  const addDetalle = (index: number) => {
    const service = services[index];
    const text = (drafts[service.id] || "").trim();
    if (!text) return;
    const detalles = [...(service.detalles || []), { id: crypto.randomUUID(), descripcion: text }];
    onChange(index, detalles);
    setDrafts((prev) => ({ ...prev, [service.id]: "" }));
  };

  const removeDetalle = (index: number, detalleId: string) => {
    const service = services[index];
    onChange(index, (service.detalles || []).filter((d) => d.id !== detalleId));
  };

  const saveEdit = (index: number, detalleId: string) => {
    if (!editing) return;
    const service = services[index];
    const text = editing.value.trim();
    if (!text) return;
    onChange(
      index,
      (service.detalles || []).map((d) => (d.id === detalleId ? { ...d, descripcion: text } : d))
    );
    setEditing(null);
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <div className="bg-muted/30 px-4 py-3 border-b border-border">
        <h3 className="font-semibold flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          Detalles por Servicio
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Agrega, edita o elimina los detalles que incluye cada servicio contratado.
        </p>
      </div>

      <div className="divide-y divide-border max-h-[320px] overflow-y-auto">
        {services.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No hay servicios registrados.</p>
        )}
        {services.map((service, index) => {
          const detalles = service.detalles || [];
          return (
            <div key={service.id} className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", service.color || "bg-primary")} />
                <span className="text-sm font-medium truncate">
                  {service.descripcion || `Servicio ${index + 1}`}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {detalles.length} {detalles.length === 1 ? "detalle" : "detalles"}
                </span>
              </div>

              {detalles.length > 0 && (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border/60">
                    {detalles.map((detalle, i) => {
                      const key = `${service.id}:${detalle.id}`;
                      const isEditing = editing?.key === key;
                      return (
                        <tr key={detalle.id} className="hover:bg-muted/30">
                          <td className="py-1.5 pr-2 w-8 text-xs text-muted-foreground align-middle">{i + 1}.</td>
                          <td className="py-1.5 pr-2 align-middle">
                            {isEditing ? (
                              <Input
                                autoFocus
                                value={editing.value}
                                onChange={(e) => setEditing({ key, value: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit(index, detalle.id);
                                  if (e.key === "Escape") setEditing(null);
                                }}
                                className="h-8 text-xs"
                              />
                            ) : (
                              <span className="text-xs">{detalle.descripcion}</span>
                            )}
                          </td>
                          <td className="py-1.5 w-[70px] text-right align-middle">
                            {isEditing ? (
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveEdit(index, detalle.id)}>
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(null)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setEditing({ key, value: detalle.descripcion })}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => removeDetalle(index, detalle.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              <div className="flex items-center gap-2">
                <Input
                  value={drafts[service.id] || ""}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [service.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDetalle(index);
                    }
                  }}
                  placeholder="Nuevo detalle del servicio..."
                  className="h-8 text-xs"
                />
                <Button variant="outline" size="sm" className="gap-1 h-8" onClick={() => addDetalle(index)}>
                  <Plus className="h-3.5 w-3.5" />
                  Agregar
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

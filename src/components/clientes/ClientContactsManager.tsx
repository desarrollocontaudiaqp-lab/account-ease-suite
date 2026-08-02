import { Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ClientContact {
  id?: string;
  nombre: string;
  cargo: string;
  telefono: string;
  email: string;
}

export const emptyContact = (): ClientContact => ({
  nombre: "",
  cargo: "",
  telefono: "",
  email: "",
});

interface ClientContactsManagerProps {
  contacts: ClientContact[];
  onChange: (contacts: ClientContact[]) => void;
}

export function ClientContactsManager({ contacts, onChange }: ClientContactsManagerProps) {
  const update = (index: number, patch: Partial<ClientContact>) => {
    onChange(contacts.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const remove = (index: number) => {
    onChange(contacts.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Personas de Contacto</Label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="Agregar contacto"
          aria-label="Agregar contacto"
          onClick={() => onChange([...contacts, emptyContact()])}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {contacts.length === 0 ? (
        <button
          type="button"
          onClick={() => onChange([emptyContact()])}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <UserRound className="h-4 w-4" />
          Agregar una persona de contacto
        </button>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact, index) => (
            <div
              key={contact.id ?? index}
              className="space-y-3 rounded-lg border border-border bg-muted/30 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Contacto {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  title="Eliminar contacto"
                  aria-label="Eliminar contacto"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre</Label>
                  <Input
                    value={contact.nombre}
                    placeholder="María García"
                    onChange={(e) => update(index, { nombre: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cargo del Contacto</Label>
                  <Input
                    value={contact.cargo}
                    placeholder="Gerente de Administración"
                    onChange={(e) => update(index, { cargo: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Teléfono</Label>
                  <Input
                    value={contact.telefono}
                    placeholder="951-123456"
                    onChange={(e) => update(index, { telefono: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={contact.email}
                    placeholder="contacto@empresa.com"
                    onChange={(e) => update(index, { email: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export async function saveClientContacts(
  supabase: any,
  clienteId: string,
  contacts: ClientContact[],
) {
  const valid = contacts.filter((c) => c.nombre.trim().length > 0);
  await supabase.from("cliente_contactos").delete().eq("cliente_id", clienteId);
  if (valid.length === 0) return;
  await supabase.from("cliente_contactos").insert(
    valid.map((c, i) => ({
      cliente_id: clienteId,
      nombre: c.nombre.trim(),
      cargo: c.cargo?.trim() || null,
      telefono: c.telefono?.trim() || null,
      email: c.email?.trim() || null,
      principal: i === 0,
      orden: i,
    })),
  );
}
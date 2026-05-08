import { useState } from 'react';
import { Check, ChevronsUpDown, Building2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useSedes } from '@/hooks/useSedes';

interface MultiSedeSelectProps {
  value: string[];
  onChange: (sedeIds: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MultiSedeSelect = ({ value, onChange, disabled, placeholder = 'Selecciona una o más sedes' }: MultiSedeSelectProps) => {
  const { sedes } = useSedes();
  const [open, setOpen] = useState(false);
  const activeSedes = sedes.filter((s) => s.activa);
  const selectedSedes = activeSedes.filter((s) => value.includes(s.id));

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              {selectedSedes.length === 0
                ? placeholder
                : `${selectedSedes.length} sede${selectedSedes.length > 1 ? 's' : ''} seleccionada${selectedSedes.length > 1 ? 's' : ''}`}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar sede..." />
            <CommandList>
              <CommandEmpty>No se encontraron sedes.</CommandEmpty>
              <CommandGroup>
                {activeSedes.map((s) => {
                  const checked = value.includes(s.id);
                  return (
                    <CommandItem key={s.id} onSelect={() => toggle(s.id)} className="cursor-pointer">
                      <Check className={cn('mr-2 h-4 w-4', checked ? 'opacity-100' : 'opacity-0')} />
                      <span className="flex-1">{s.nombre}</span>
                      <span className="text-xs text-muted-foreground">{s.codigo}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedSedes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedSedes.map((s) => (
            <Badge key={s.id} variant="secondary" className="gap-1 pr-1">
              {s.nombre} ({s.codigo})
              <button
                type="button"
                onClick={() => toggle(s.id)}
                disabled={disabled}
                className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiSedeSelect;
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  exportBaseMaestra,
  DEFAULT_SECTIONS,
  type BaseMaestraSections,
} from "@/lib/exportBaseMaestra";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sedes: { id: string; nombre: string }[];
  canViewAllSedes: boolean;
  activeSedeId: string | null;
  includeSunat: boolean;
}

const SECCIONES: {
  key: keyof BaseMaestraSections;
  titulo: string;
  detalle: string;
}[] = [
  {
    key: "clientes",
    titulo: "Clientes",
    detalle: "Total, Activos, Inactivos, Empresas, Personas Naturales, PN con Empresa",
  },
  {
    key: "proformas",
    titulo: "Proformas",
    detalle: "Total, Aprobadas, En Proceso, Rechazadas, Anuladas",
  },
  {
    key: "contratos",
    titulo: "Contratos",
    detalle: "Total, Aprobados, En Gestión, Borradores, Anulados",
  },
  {
    key: "asignaciones",
    titulo: "Asignaciones",
    detalle: "Total, En gestión, Finalizados, Sin Asignar",
  },
  {
    key: "pagos",
    titulo: "Pagos",
    detalle: "Total, Pagados, Pendientes, Vencidos",
  },
  {
    key: "carteras",
    titulo: "Carteras",
    detalle: "Total, Activas, Inactivas",
  },
];

export function BaseMaestraDialog({
  open,
  onOpenChange,
  sedes,
  canViewAllSedes,
  activeSedeId,
  includeSunat,
}: Props) {
  const [scope, setScope] = useState<string>(
    canViewAllSedes ? "all" : activeSedeId ?? "all"
  );
  const [sections, setSections] = useState<BaseMaestraSections>({ ...DEFAULT_SECTIONS });
  const [detallesPorContrato, setDetallesPorContrato] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = (key: keyof BaseMaestraSections) =>
    setSections((s) => ({ ...s, [key]: !s[key] }));

  const handleExport = async () => {
    if (!Object.values(sections).some(Boolean)) {
      toast.error("Selecciona al menos una sección");
      return;
    }
    setLoading(true);
    try {
      const res = await exportBaseMaestra({
        sedeId: scope === "all" ? null : scope,
        sections,
        detallesPorContrato,
        includeSunat,
      });
      toast.success(
        `Base maestra generada: ${res.clientes} clientes, ${res.contratos} contratos, ${res.proformas} proformas`
      );
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Error al generar la base maestra: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" /> Base Maestra
          </DialogTitle>
          <DialogDescription>
            Escoge el alcance y la información que deseas consolidar en el Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Alcance</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una sede" />
              </SelectTrigger>
              <SelectContent>
                {canViewAllSedes && <SelectItem value="all">Todas las Sedes</SelectItem>}
                {sedes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Secciones a incluir</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {SECCIONES.map((s) => (
                <label
                  key={s.key}
                  className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={sections[s.key]}
                    onCheckedChange={() => toggle(s.key)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-sm font-medium">{s.titulo}</span>
                    <span className="block text-xs text-muted-foreground">{s.detalle}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Detalles asignados por contrato</p>
              <p className="text-xs text-muted-foreground">
                Agrega una hoja con cada detalle del contrato y su responsable.
              </p>
            </div>
            <Switch
              checked={detallesPorContrato}
              onCheckedChange={setDetallesPorContrato}
              disabled={!sections.asignaciones}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Generar Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

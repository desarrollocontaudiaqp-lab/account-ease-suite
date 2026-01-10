import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ParsedServicio {
  grupo_servicio: string | null;
  tipo: string;
  regimen_tributario: string | null;
  compras_ventas_mensual_soles: string | null;
  compras_ventas_anual_soles: string | null;
  valoracion: string | null;
  entidad: string | null;
  tramite: string | null;
  servicio: string;
  base_imponible: number | null;
  igv_monto: number | null;
  precio_servicio: number | null;
  activo: boolean;
}

const COLUMN_HEADERS = [
  "GRUPO DE SERVICIO",
  "TIPO DE SERVICIO",
  "REGIMEN TRIBUTARIO",
  "COMPRAS/VENTAS MENSUAL SOLES",
  "COMPRAS/VENTAS ANUAL SOLES",
  "VALORACION",
  "ENTIDAD",
  "TRAMITE",
  "DESCRIPCION_SERVICIO",
  "BASE IMPONIBLE",
  "IGV",
  "PRECIO DEL SERVICIO",
];

export function ImportServiciosDialog() {
  const [open, setOpen] = useState(false);
  const [pastedData, setPastedData] = useState("");
  const [parsedData, setParsedData] = useState<ParsedServicio[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"paste" | "preview">("paste");
  const queryClient = useQueryClient();

  const parseNumber = (value: string): number | null => {
    if (!value || value.trim() === "") return null;
    const cleaned = value.replace(/,/g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const normalizeTipo = (value: string): string => {
    const lower = value.toLowerCase().trim();
    if (lower.includes("contab")) return "contabilidad";
    if (lower.includes("tramit") || lower.includes("trámit")) return "tramites";
    if (lower.includes("audit") || lower.includes("control")) return "auditoria";
    return "contabilidad"; // default
  };

  const parseExcelData = () => {
    const lines = pastedData.trim().split("\n");
    const newErrors: string[] = [];
    const parsed: ParsedServicio[] = [];

    if (lines.length === 0) {
      setErrors(["No se encontraron datos para importar"]);
      return;
    }

    // Check if first line is header
    const firstLine = lines[0].toLowerCase();
    const startIndex = firstLine.includes("grupo") || firstLine.includes("tipo") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Split by tab (Excel default) or multiple spaces
      const columns = line.split(/\t/);

      if (columns.length < 9) {
        newErrors.push(`Fila ${i + 1}: Número insuficiente de columnas (${columns.length} de 12 requeridas)`);
        continue;
      }

      const descripcionServicio = columns[8]?.trim();
      if (!descripcionServicio) {
        newErrors.push(`Fila ${i + 1}: La descripción del servicio es obligatoria`);
        continue;
      }

      const tipoServicio = columns[1]?.trim();
      if (!tipoServicio) {
        newErrors.push(`Fila ${i + 1}: El tipo de servicio es obligatorio`);
        continue;
      }

      parsed.push({
        grupo_servicio: columns[0]?.trim() || null,
        tipo: normalizeTipo(tipoServicio),
        regimen_tributario: columns[2]?.trim() || null,
        compras_ventas_mensual_soles: columns[3]?.trim() || null,
        compras_ventas_anual_soles: columns[4]?.trim() || null,
        valoracion: columns[5]?.trim() || null,
        entidad: columns[6]?.trim() || null,
        tramite: columns[7]?.trim() || null,
        servicio: descripcionServicio,
        base_imponible: parseNumber(columns[9] || ""),
        igv_monto: parseNumber(columns[10] || ""),
        precio_servicio: parseNumber(columns[11] || ""),
        activo: true,
      });
    }

    setErrors(newErrors);
    setParsedData(parsed);

    if (parsed.length > 0) {
      setStep("preview");
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from("servicios").insert(parsedData);

      if (error) throw error;

      toast.success(`${parsedData.length} servicios importados correctamente`);
      queryClient.invalidateQueries({ queryKey: ["servicios"] });
      handleClose();
    } catch (error: any) {
      console.error("Error importing services:", error);
      toast.error(`Error al importar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPastedData("");
    setParsedData([]);
    setErrors([]);
    setStep("paste");
  };

  const getTipoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case "contabilidad":
        return "bg-blue-100 text-blue-800";
      case "tramites":
        return "bg-green-100 text-green-800";
      case "auditoria":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Servicios desde Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Servicios desde Excel
          </DialogTitle>
          <DialogDescription>
            Copia y pega los datos desde Excel respetando el orden de las columnas
          </DialogDescription>
        </DialogHeader>

        {step === "paste" ? (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Orden de columnas requerido:</strong>
                <div className="mt-2 flex flex-wrap gap-1">
                  {COLUMN_HEADERS.map((header, index) => (
                    <Badge key={header} variant="outline" className="text-xs">
                      {index + 1}. {header}
                    </Badge>
                  ))}
                </div>
              </AlertDescription>
            </Alert>

            <Textarea
              placeholder="Pega aquí los datos copiados desde Excel (Ctrl+V)..."
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              className="flex-1 min-h-[200px] font-mono text-sm"
            />

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-1">
                    {errors.slice(0, 5).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {errors.length > 5 && <li>...y {errors.length - 5} errores más</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={parseExcelData} disabled={!pastedData.trim()}>
                Procesar Datos
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Se encontraron <strong>{parsedData.length}</strong> servicios para importar
                {errors.length > 0 && ` (${errors.length} filas con errores fueron omitidas)`}
              </AlertDescription>
            </Alert>

            <ScrollArea className="flex-1 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Régimen</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((servicio, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {servicio.servicio}
                      </TableCell>
                      <TableCell>
                        <Badge className={getTipoBadgeColor(servicio.tipo)}>
                          {servicio.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {servicio.grupo_servicio || "-"}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {servicio.regimen_tributario || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {servicio.precio_servicio != null
                          ? `S/ ${servicio.precio_servicio.toFixed(2)}`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("paste")}>
                Volver
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button onClick={handleImport} disabled={isLoading}>
                  {isLoading ? "Importando..." : `Importar ${parsedData.length} Servicios`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

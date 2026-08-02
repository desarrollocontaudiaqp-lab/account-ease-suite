import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ExportPayment {
  id: string;
  monto: number;
  fecha_vencimiento: string;
  fecha_pago: string | null;
  status: string;
  metodo_pago: string | null;
  referencia: string | null;
  servicio: string | null;
  cuota: number | null;
  isProjected: boolean;
  contrato: {
    numero: string;
    moneda: string;
    cliente: { razon_social: string; codigo: string };
  };
}

interface Props {
  payments: ExportPayment[];
}

const today = () => new Date().toISOString().split("T")[0];
const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const autoSize = (ws: XLSX.WorkSheet, rows: Record<string, unknown>[], headers: string[]) => {
  ws["!cols"] = headers.map((h) => ({
    wch: Math.min(
      Math.max(h.length + 2, ...rows.map((r) => String(r[h] ?? "").length + 2), 10),
      50
    ),
  }));
};

export function ExportRangoDialog({ payments }: Props) {
  const [open, setOpen] = useState(false);
  const [desde, setDesde] = useState(firstOfMonth());
  const [hasta, setHasta] = useState(today());

  const inRange = useMemo(() => {
    if (!desde || !hasta) return [];
    return payments.filter((p) => {
      const ref = p.status === "pagado" && p.fecha_pago ? p.fecha_pago : p.fecha_vencimiento;
      if (!ref) return false;
      const d = ref.split("T")[0];
      return d >= desde && d <= hasta;
    });
  }, [payments, desde, hasta]);

  const pagados = inRange.filter((p) => p.status === "pagado");
  const deudores = inRange.filter((p) => p.status === "pendiente" || p.status === "vencido" || p.status === "parcial");
  const sum = (arr: ExportPayment[]) => arr.reduce((s, p) => s + Number(p.monto || 0), 0);

  const handleExport = () => {
    if (desde > hasta) {
      toast.error("La fecha inicial no puede ser mayor a la final");
      return;
    }
    if (inRange.length === 0) {
      toast.error("No hay pagos en el rango seleccionado");
      return;
    }

    const wb = XLSX.utils.book_new();

    // Resumen
    const resumenRows = [
      { Concepto: "Periodo", Valor: `${desde} a ${hasta}` },
      { Concepto: "Total registros", Valor: inRange.length },
      { Concepto: "Clientes que pagaron", Valor: new Set(pagados.map((p) => p.contrato?.cliente?.codigo)).size },
      { Concepto: "Clientes deudores", Valor: new Set(deudores.map((p) => p.contrato?.cliente?.codigo)).size },
      { Concepto: "Total cobrado", Valor: Number(sum(pagados).toFixed(2)) },
      { Concepto: "Total deuda", Valor: Number(sum(deudores).toFixed(2)) },
      { Concepto: "Total proyectado", Valor: Number(sum(inRange.filter((p) => p.status === "proyectado")).toFixed(2)) },
    ];
    const wsResumen = XLSX.utils.json_to_sheet(resumenRows);
    autoSize(wsResumen, resumenRows as any, ["Concepto", "Valor"]);
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

    // Agrupado por cliente
    const buildClientes = (arr: ExportPayment[], montoLabel: string) => {
      const map = new Map<string, { Cliente: string; "RUC/DNI": string; Documentos: number; [k: string]: any }>();
      arr.forEach((p) => {
        const key = p.contrato?.cliente?.codigo || p.contrato?.cliente?.razon_social || "-";
        const prev = map.get(key) || {
          Cliente: p.contrato?.cliente?.razon_social || "-",
          "RUC/DNI": p.contrato?.cliente?.codigo || "-",
          Documentos: 0,
          [montoLabel]: 0,
        };
        prev.Documentos += 1;
        prev[montoLabel] = Number((prev[montoLabel] + Number(p.monto || 0)).toFixed(2));
        map.set(key, prev);
      });
      return Array.from(map.values()).sort((a, b) => b[montoLabel] - a[montoLabel]);
    };

    const clientesPagaron = buildClientes(pagados, "Total Pagado");
    const headPag = ["Cliente", "RUC/DNI", "Documentos", "Total Pagado"];
    const wsPag = XLSX.utils.json_to_sheet(clientesPagaron, { header: headPag });
    autoSize(wsPag, clientesPagaron as any, headPag);
    XLSX.utils.book_append_sheet(wb, wsPag, "Clientes que Pagaron");

    const clientesDeuda = buildClientes(deudores, "Total Deuda");
    const headDeu = ["Cliente", "RUC/DNI", "Documentos", "Total Deuda"];
    const wsDeu = XLSX.utils.json_to_sheet(clientesDeuda, { header: headDeu });
    autoSize(wsDeu, clientesDeuda as any, headDeu);
    XLSX.utils.book_append_sheet(wb, wsDeu, "Clientes Deudores");

    // Detalle
    const detalle = inRange.map((p) => ({
      Contrato: p.contrato?.numero ?? "",
      Cliente: p.contrato?.cliente?.razon_social ?? "",
      "RUC/DNI": p.contrato?.cliente?.codigo ?? "",
      Servicio: p.servicio ?? "",
      Cuota: p.cuota ?? "",
      "Fecha Vencimiento": p.fecha_vencimiento ?? "",
      "Fecha Pago": p.fecha_pago ?? "",
      Moneda: p.contrato?.moneda ?? "",
      Monto: Number(p.monto || 0),
      Estado: p.status,
      "Método Pago": p.metodo_pago ?? "",
      Referencia: p.referencia ?? "",
      Tipo: p.isProjected ? "Proyectado" : "Real",
    }));
    const headDet = Object.keys(detalle[0]);
    const wsDet = XLSX.utils.json_to_sheet(detalle, { header: headDet });
    autoSize(wsDet, detalle as any, headDet);
    XLSX.utils.book_append_sheet(wb, wsDet, "Detalle");

    XLSX.writeFile(wb, `reporte_pagos_${desde}_a_${hasta}.xlsx`);
    toast.success("Reporte generado correctamente");
    setOpen(false);
  };

  const fmt = (n: number) => `S/ ${n.toFixed(2)}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Reporte por Fechas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reporte de Pagos por Fechas</DialogTitle>
          <DialogDescription>
            Genera un Excel con el resumen de deuda, pagos, clientes que pagaron y clientes deudores.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="desde">Desde</Label>
            <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hasta">Hasta</Label>
            <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Registros en el rango</span>
            <span className="font-medium">{inRange.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total cobrado</span>
            <span className="font-medium text-green-700">{fmt(sum(pagados))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total deuda</span>
            <span className="font-medium text-red-700">{fmt(sum(deudores))}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
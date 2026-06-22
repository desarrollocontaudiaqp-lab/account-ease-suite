import { useMemo, useState } from "react";
import { Banknote, Calendar, CalendarIcon, Eye, Loader2, Wallet, Download } from "lucide-react";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useCajaCierres, type CajaCierre } from "@/hooks/useCajaCierres";
import { CierreCajaDialog } from "@/components/caja/CierreCajaDialog";
import { BlurredValue } from "@/components/ui/BlurredValue";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmt = (n: number, c = "PEN") =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: c }).format(n || 0);

const fmtDate = (s: string) => {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

const fmtDateTime = (s: string) => new Date(s).toLocaleString("es-PE");

const Caja = () => {
  const { cierres, ingresosHoy, egresosHoy, loading, refresh, fecha, setFecha } = useCajaCierres();
  const [openDialog, setOpenDialog] = useState<null | "parcial" | "diario">(null);
  const [detail, setDetail] = useState<CajaCierre | null>(null);

  const pad = (n: number) => String(n).padStart(2, "0");
  const toLocalISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fechaDate = parse(fecha, "yyyy-MM-dd", new Date());

  const totals = useMemo(() => {
    const dia = cierres.filter((c) => c.fecha === fecha);
    const ti = ingresosHoy.reduce((a, x) => a + Number(x.monto || 0), 0);
    const te = egresosHoy.reduce((a, x) => a + Number(x.total || 0), 0);
    return {
      hoyIngresos: ti,
      hoyEgresos: te,
      hoySaldo: ti - te,
      cierresHoy: dia.length,
      totalCierres: cierres.length,
    };
  }, [cierres, ingresosHoy, egresosHoy, fecha]);

  const exportPDF = (c: CajaCierre) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Cierre de Caja ${c.tipo.toUpperCase()} — ${c.codigo}`, 14, 18);
    doc.setFontSize(10);
    doc.text(`Fecha: ${fmtDate(c.fecha)}   Periodo: ${fmtDateTime(c.hora_inicio)} → ${fmtDateTime(c.hora_fin)}`, 14, 26);

    autoTable(doc, {
      startY: 34,
      head: [["Concepto", "Cantidad", "Monto"]],
      body: [
        ["Ingresos", String(c.cantidad_ingresos), fmt(Number(c.total_ingresos))],
        ["Egresos", String(c.cantidad_egresos), fmt(Number(c.total_egresos))],
        ["Saldo", "", fmt(Number(c.saldo))],
      ],
    });

    const ing = c.detalle?.ingresos || [];
    const eg = c.detalle?.egresos || [];
    if (ing.length) {
      autoTable(doc, {
        head: [["Cliente", "Contrato", "Método", "Referencia", "Monto"]],
        body: ing.map((x: any) => [x.cliente || "—", x.contrato || "—", x.metodo_pago || "—", x.referencia || "—", fmt(Number(x.monto))]),
        didDrawPage: (data) => { doc.text("Detalle de Ingresos", 14, data.settings.startY ? Number(data.settings.startY) - 4 : 10); },
      });
    }
    if (eg.length) {
      autoTable(doc, {
        head: [["Código", "Proveedor", "Método", "Descripción", "Total"]],
        body: eg.map((x: any) => [x.codigo || "—", x.proveedor || "—", x.metodo_pago || "—", x.descripcion || "—", fmt(Number(x.total))]),
        didDrawPage: (data) => { doc.text("Detalle de Egresos", 14, data.settings.startY ? Number(data.settings.startY) - 4 : 10); },
      });
    }
    if (c.observaciones) {
      doc.text(`Observaciones: ${c.observaciones}`, 14, (doc as any).lastAutoTable.finalY + 10);
    }
    doc.save(`${c.codigo}.pdf`);
  };

  return (
    <div className="p-6 space-y-6 font-jakarta">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Banknote className="h-7 w-7 text-primary" />
            Caja
          </h1>
          <p className="text-sm text-muted-foreground">Cierres de caja parciales y diarios con ingresos y egresos del día</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenDialog("parcial")}>
            <Wallet className="h-4 w-4 mr-2" /> Cierre Parcial
          </Button>
          <Button onClick={() => setOpenDialog("diario")}>
            <Calendar className="h-4 w-4 mr-2" /> Cierre Diario
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="text-xs text-muted-foreground">Ingresos hoy ({ingresosHoy.length})</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1"><BlurredValue>{fmt(totals.hoyIngresos)}</BlurredValue></div>
        </Card>
        <Card className="p-4 border-l-4 border-l-rose-500">
          <div className="text-xs text-muted-foreground">Egresos hoy ({egresosHoy.length})</div>
          <div className="text-2xl font-bold text-rose-600 mt-1"><BlurredValue>{fmt(totals.hoyEgresos)}</BlurredValue></div>
        </Card>
        <Card className="p-4 border-l-4 border-l-primary">
          <div className="text-xs text-muted-foreground">Saldo del día</div>
          <div className="text-2xl font-bold text-primary mt-1"><BlurredValue>{fmt(totals.hoySaldo)}</BlurredValue></div>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="text-xs text-muted-foreground">Cierres ({totals.cierresHoy} hoy)</div>
          <div className="text-2xl font-bold mt-1">{totals.totalCierres}</div>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Periodo</TableHead>
              <TableHead className="text-right">Ingresos</TableHead>
              <TableHead className="text-right">Egresos</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={8} className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>
            )}
            {!loading && cierres.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Sin cierres registrados</TableCell></TableRow>
            )}
            {cierres.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.codigo}</TableCell>
                <TableCell>
                  <Badge variant={c.tipo === "diario" ? "default" : "secondary"}>{c.tipo}</Badge>
                </TableCell>
                <TableCell>{fmtDate(c.fecha)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(c.hora_inicio).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })} →{" "}
                  {new Date(c.hora_fin).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                </TableCell>
                <TableCell className="text-right font-mono text-emerald-600"><BlurredValue>{fmt(Number(c.total_ingresos))}</BlurredValue></TableCell>
                <TableCell className="text-right font-mono text-rose-600"><BlurredValue>{fmt(Number(c.total_egresos))}</BlurredValue></TableCell>
                <TableCell className={`text-right font-mono font-bold ${Number(c.saldo) >= 0 ? "text-primary" : "text-amber-600"}`}>
                  <BlurredValue>{fmt(Number(c.saldo))}</BlurredValue>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setDetail(c)}><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => exportPDF(c)}><Download className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {openDialog && (
        <CierreCajaDialog
          open={!!openDialog}
          tipo={openDialog}
          onClose={() => setOpenDialog(null)}
          onSaved={refresh}
        />
      )}

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto font-jakarta">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>Detalle del Cierre {detail.codigo}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Card className="p-3"><div className="text-xs text-muted-foreground">Ingresos</div><div className="text-xl font-bold text-emerald-600">{fmt(Number(detail.total_ingresos))}</div></Card>
                <Card className="p-3"><div className="text-xs text-muted-foreground">Egresos</div><div className="text-xl font-bold text-rose-600">{fmt(Number(detail.total_egresos))}</div></Card>
                <Card className="p-3"><div className="text-xs text-muted-foreground">Saldo</div><div className="text-xl font-bold text-primary">{fmt(Number(detail.saldo))}</div></Card>
              </div>
              <h3 className="font-semibold mb-2">Ingresos ({detail.detalle?.ingresos?.length || 0})</h3>
              <Table>
                <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Contrato</TableHead><TableHead>Método</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(detail.detalle?.ingresos || []).map((x: any, i: number) => (
                    <TableRow key={i}><TableCell>{x.cliente || "—"}</TableCell><TableCell>{x.contrato || "—"}</TableCell><TableCell>{x.metodo_pago || "—"}</TableCell><TableCell className="text-right font-mono">{fmt(Number(x.monto))}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
              <h3 className="font-semibold mt-4 mb-2">Egresos ({detail.detalle?.egresos?.length || 0})</h3>
              <Table>
                <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Proveedor</TableHead><TableHead>Método</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(detail.detalle?.egresos || []).map((x: any, i: number) => (
                    <TableRow key={i}><TableCell className="font-mono text-xs">{x.codigo}</TableCell><TableCell>{x.proveedor || "—"}</TableCell><TableCell>{x.metodo_pago || "—"}</TableCell><TableCell className="text-right font-mono">{fmt(Number(x.total))}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
              {detail.observaciones && <p className="mt-4 text-sm text-muted-foreground">Observaciones: {detail.observaciones}</p>}
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => exportPDF(detail)}><Download className="h-4 w-4 mr-2" /> PDF</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Caja;

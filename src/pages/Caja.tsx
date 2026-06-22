import { useMemo, useState } from "react";
import { Banknote, Calendar, CalendarIcon, Eye, Loader2, Wallet, Download, Save, PiggyBank } from "lucide-react";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const {
    cierres,
    ingresosHoy,
    egresosHoy,
    loading,
    refresh,
    fecha,
    setFecha,
    saldoInicial,
    ingresosMes,
    egresosMes,
    saveSaldoInicial,
  } = useCajaCierres();
  const [openDialog, setOpenDialog] = useState<null | "parcial" | "diario">(null);
  const [detail, setDetail] = useState<CajaCierre | null>(null);
  const [saldoInput, setSaldoInput] = useState<string>("");
  const [saldoObs, setSaldoObs] = useState<string>("");
  const [savingSaldo, setSavingSaldo] = useState(false);

  const pad = (n: number) => String(n).padStart(2, "0");
  const toLocalISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fechaDate = parse(fecha, "yyyy-MM-dd", new Date());
  const mesLabel = format(fechaDate, "MMMM yyyy", { locale: es });

  // sync input when month/saldo changes
  useMemo(() => {
    setSaldoInput(String(saldoInicial ?? 0));
  }, [saldoInicial, fecha.slice(0, 7)]);

  const saldoMes = (Number(saldoInicial) || 0) + (ingresosMes || 0) - (egresosMes || 0);

  const handleSaveSaldo = async () => {
    setSavingSaldo(true);
    await saveSaldoInicial(Number(saldoInput || 0), saldoObs);
    setSavingSaldo(false);
  };

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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {format(fechaDate, "PPP", { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarPicker
                mode="single"
                selected={fechaDate}
                onSelect={(d) => d && setFecha(toLocalISO(d))}
                initialFocus
                locale={es}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
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
          <div className="text-xs text-muted-foreground">Ingresos ({ingresosHoy.length})</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1"><BlurredValue>{fmt(totals.hoyIngresos)}</BlurredValue></div>
        </Card>
        <Card className="p-4 border-l-4 border-l-rose-500">
          <div className="text-xs text-muted-foreground">Egresos ({egresosHoy.length})</div>
          <div className="text-2xl font-bold text-rose-600 mt-1"><BlurredValue>{fmt(totals.hoyEgresos)}</BlurredValue></div>
        </Card>
        <Card className="p-4 border-l-4 border-l-primary">
          <div className="text-xs text-muted-foreground">Saldo del día ({format(fechaDate, "dd/MM", { locale: es })})</div>
          <div className="text-2xl font-bold text-primary mt-1"><BlurredValue>{fmt(totals.hoySaldo)}</BlurredValue></div>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="text-xs text-muted-foreground">Cierres ({totals.cierresHoy} en fecha)</div>
          <div className="text-2xl font-bold mt-1">{totals.totalCierres}</div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <PiggyBank className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold capitalize">Saldo inicial de {mesLabel}</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Configura el saldo con el que arranca el mes. Se descuentan los egresos pagados y se suman los ingresos cobrados durante el mes para obtener el saldo acumulado.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3">
            <Label htmlFor="saldo-inicial">Saldo inicial (S/)</Label>
            <Input
              id="saldo-inicial"
              type="number"
              step="0.01"
              value={saldoInput}
              onChange={(e) => setSaldoInput(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="md:col-span-5">
            <Label htmlFor="saldo-obs">Observaciones (opcional)</Label>
            <Textarea
              id="saldo-obs"
              rows={1}
              value={saldoObs}
              onChange={(e) => setSaldoObs(e.target.value)}
              placeholder="Apertura de mes, traspaso, etc."
            />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <Button onClick={handleSaveSaldo} disabled={savingSaldo}>
              {savingSaldo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar saldo del mes
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">
          <Card className="p-3 bg-muted/40">
            <div className="text-xs text-muted-foreground">Saldo inicial</div>
            <div className="text-xl font-bold mt-1"><BlurredValue>{fmt(Number(saldoInicial) || 0)}</BlurredValue></div>
          </Card>
          <Card className="p-3 bg-emerald-50 dark:bg-emerald-950/30">
            <div className="text-xs text-muted-foreground">+ Ingresos del mes</div>
            <div className="text-xl font-bold text-emerald-600 mt-1"><BlurredValue>{fmt(ingresosMes)}</BlurredValue></div>
          </Card>
          <Card className="p-3 bg-rose-50 dark:bg-rose-950/30">
            <div className="text-xs text-muted-foreground">− Egresos del mes</div>
            <div className="text-xl font-bold text-rose-600 mt-1"><BlurredValue>{fmt(egresosMes)}</BlurredValue></div>
          </Card>
          <Card className={`p-3 border-2 ${saldoMes >= 0 ? "border-primary" : "border-amber-500"}`}>
            <div className="text-xs text-muted-foreground">Saldo acumulado</div>
            <div className={`text-xl font-bold mt-1 ${saldoMes >= 0 ? "text-primary" : "text-amber-600"}`}>
              <BlurredValue>{fmt(saldoMes)}</BlurredValue>
            </div>
          </Card>
        </div>
      </Card>

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

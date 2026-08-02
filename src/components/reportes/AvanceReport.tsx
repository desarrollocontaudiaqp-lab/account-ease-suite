import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Download, Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import { AvanceRow, useAvanceData } from "@/hooks/useAvanceData";
import {
  DOC_TIPOS,
  DocTipoKey,
  MESES,
  PeriodState,
  PeriodType,
  defaultPeriodState,
  docTipoLabel,
  resolvePeriod,
  weeksInYear,
} from "@/lib/reportPeriods";

export type AvanceGroupBy = "cliente" | "contrato" | "asesor" | "cartera";

interface Props {
  groupBy: AvanceGroupBy;
  title: string;
  description: string;
}

const GROUP_LABEL: Record<AvanceGroupBy, string> = {
  cliente: "Cliente",
  contrato: "Contrato",
  asesor: "Asesor",
  cartera: "Cartera",
};

const money = (n: number) => `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface GroupSummary {
  key: string;
  nombre: string;
  detalle: string;
  documentos: number;
  cobrado: number;
  pendiente: number;
  total: number;
  avance: number;
}

export function AvanceReport({ groupBy, title, description }: Props) {
  const { rows, loading, refresh } = useAvanceData();
  const [period, setPeriod] = useState<PeriodState>(defaultPeriodState());
  const [docTipos, setDocTipos] = useState<DocTipoKey[]>([]);
  const [search, setSearch] = useState("");

  const range = useMemo(() => resolvePeriod(period), [period]);
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => current + 1 - i);
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!r.fecha) return false;
      if (r.fecha < range.desde || r.fecha > range.hasta) return false;
      if (docTipos.length > 0 && !docTipos.includes(r.docTipo)) return false;
      if (term) {
        const hay = `${r.clienteNombre} ${r.clienteCodigo} ${r.contratoNumero} ${r.asesorNombre} ${r.carteraNombre}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [rows, range, docTipos, search]);

  const groups = useMemo<GroupSummary[]>(() => {
    const map = new Map<string, GroupSummary>();
    filtered.forEach((r) => {
      let key: string, nombre: string, detalle: string;
      if (groupBy === "cliente") {
        key = r.clienteId || r.clienteNombre;
        nombre = r.clienteNombre;
        detalle = r.clienteCodigo;
      } else if (groupBy === "contrato") {
        key = r.contratoId || r.contratoNumero;
        nombre = r.contratoNumero;
        detalle = r.clienteNombre;
      } else if (groupBy === "asesor") {
        key = r.asesorId || r.asesorNombre;
        nombre = r.asesorNombre;
        detalle = "";
      } else {
        key = r.carteraNombre;
        nombre = r.carteraNombre;
        detalle = "";
      }
      const prev =
        map.get(key) ||
        { key, nombre, detalle, documentos: 0, cobrado: 0, pendiente: 0, total: 0, avance: 0 };
      prev.documentos += 1;
      prev.total += r.monto;
      if (r.status === "pagado") prev.cobrado += r.monto;
      else prev.pendiente += r.monto;
      map.set(key, prev);
    });
    return Array.from(map.values())
      .map((g) => ({ ...g, avance: g.total > 0 ? (g.cobrado / g.total) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [filtered, groupBy]);

  const totals = useMemo(() => {
    const cobrado = filtered.filter((r) => r.status === "pagado").reduce((s, r) => s + r.monto, 0);
    const total = filtered.reduce((s, r) => s + r.monto, 0);
    return { cobrado, pendiente: total - cobrado, total, avance: total > 0 ? (cobrado / total) * 100 : 0 };
  }, [filtered]);

  const porDocumento = useMemo(() => {
    return DOC_TIPOS.map((d) => {
      const arr = filtered.filter((r) => r.docTipo === d.key);
      const cobrado = arr.filter((r) => r.status === "pagado").reduce((s, r) => s + r.monto, 0);
      const total = arr.reduce((s, r) => s + r.monto, 0);
      return { tipo: d.label, documentos: arr.length, cobrado, pendiente: total - cobrado, total };
    }).filter((d) => d.documentos > 0);
  }, [filtered]);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("No hay datos para exportar en el periodo seleccionado");
      return;
    }
    const wb = XLSX.utils.book_new();
    const round = (n: number) => Number(n.toFixed(2));

    const resumen = [
      { Concepto: "Reporte", Valor: title },
      { Concepto: "Periodo", Valor: range.label },
      { Concepto: "Rango", Valor: `${range.desde} a ${range.hasta}` },
      {
        Concepto: "Tipos de documento",
        Valor: docTipos.length ? docTipos.map(docTipoLabel).join(", ") : "Todos",
      },
      { Concepto: "Documentos", Valor: filtered.length },
      { Concepto: "Total cobrado", Valor: round(totals.cobrado) },
      { Concepto: "Total pendiente", Valor: round(totals.pendiente) },
      { Concepto: "Total facturado", Valor: round(totals.total) },
      { Concepto: "% Avance", Valor: round(totals.avance) },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), "Resumen");

    const resumenGrupo = groups.map((g) => ({
      [GROUP_LABEL[groupBy]]: g.nombre,
      Referencia: g.detalle,
      Documentos: g.documentos,
      Cobrado: round(g.cobrado),
      Pendiente: round(g.pendiente),
      Total: round(g.total),
      "% Avance": round(g.avance),
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(resumenGrupo),
      `Avance por ${GROUP_LABEL[groupBy]}`.slice(0, 31)
    );

    const porDoc = porDocumento.map((d) => ({
      "Tipo Documento": d.tipo,
      Documentos: d.documentos,
      Cobrado: round(d.cobrado),
      Pendiente: round(d.pendiente),
      Total: round(d.total),
    }));
    if (porDoc.length)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porDoc), "Por Tipo Documento");

    const detalle = filtered.map((r) => ({
      Fecha: r.fecha,
      Cliente: r.clienteNombre,
      "RUC/DNI": r.clienteCodigo,
      Contrato: r.contratoNumero,
      Asesor: r.asesorNombre,
      Cartera: r.carteraNombre,
      "Tipo Documento": docTipoLabel(r.docTipo),
      Comprobante: r.comprobante,
      "Fecha Vencimiento": r.fecha_vencimiento,
      "Fecha Pago": r.fecha_pago ?? "",
      Estado: r.status,
      Moneda: r.moneda,
      Monto: round(r.monto),
      "Método Pago": r.metodo_pago ?? "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalle), "Detalle");

    const safe = title.toLowerCase().replace(/[^\w]+/g, "_");
    XLSX.writeFile(wb, `${safe}_${range.desde}_a_${range.hasta}.xlsx`);
    toast.success("Reporte exportado correctamente");
  };

  const toggleDoc = (key: DocTipoKey) =>
    setDocTipos((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label>Periodo</Label>
              <ToggleGroup
                type="single"
                value={period.type}
                onValueChange={(v) => v && setPeriod({ ...period, type: v as PeriodType })}
                className="justify-start"
              >
                <ToggleGroupItem value="anio">Año</ToggleGroupItem>
                <ToggleGroupItem value="mes">Mes</ToggleGroupItem>
                <ToggleGroupItem value="semana">Semana</ToggleGroupItem>
                <ToggleGroupItem value="dia">Día</ToggleGroupItem>
                <ToggleGroupItem value="rango">Rango</ToggleGroupItem>
              </ToggleGroup>
            </div>

            {period.type !== "dia" && period.type !== "rango" && (
              <div className="space-y-2">
                <Label>Año</Label>
                <Select
                  value={String(period.anio)}
                  onValueChange={(v) => setPeriod({ ...period, anio: Number(v) })}
                >
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {period.type === "mes" && (
              <div className="space-y-2">
                <Label>Mes</Label>
                <Select
                  value={String(period.mes)}
                  onValueChange={(v) => setPeriod({ ...period, mes: Number(v) })}
                >
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => (
                      <SelectItem key={m} value={String(i)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {period.type === "semana" && (
              <div className="space-y-2">
                <Label>Semana</Label>
                <Select
                  value={String(period.semana)}
                  onValueChange={(v) => setPeriod({ ...period, semana: Number(v) })}
                >
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: weeksInYear(period.anio) }, (_, i) => i + 1).map((w) => (
                      <SelectItem key={w} value={String(w)}>Semana {w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {period.type === "dia" && (
              <div className="space-y-2">
                <Label>Día</Label>
                <Input
                  type="date"
                  className="w-44"
                  value={period.dia}
                  onChange={(e) => setPeriod({ ...period, dia: e.target.value })}
                />
              </div>
            )}

            {period.type === "rango" && (
              <>
                <div className="space-y-2">
                  <Label>Desde</Label>
                  <Input
                    type="date"
                    className="w-44"
                    value={period.desde}
                    onChange={(e) => setPeriod({ ...period, desde: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hasta</Label>
                  <Input
                    type="date"
                    className="w-44"
                    value={period.hasta}
                    onChange={(e) => setPeriod({ ...period, hasta: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="space-y-2 flex-1 min-w-[220px]">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Cliente, contrato, asesor o cartera"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de documento</Label>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={docTipos.length === 0 ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setDocTipos([])}
              >
                Todos
              </Badge>
              {DOC_TIPOS.map((d) => (
                <Badge
                  key={d.key}
                  variant={docTipos.includes(d.key) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleDoc(d.key)}
                >
                  {d.label}
                </Badge>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Periodo: <span className="font-medium text-foreground">{range.label}</span> ({range.desde} a {range.hasta}) ·{" "}
            {filtered.length} documentos
          </p>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total cobrado", value: money(totals.cobrado), cls: "text-emerald-600" },
          { label: "Total pendiente", value: money(totals.pendiente), cls: "text-red-600" },
          { label: "Total facturado", value: money(totals.total), cls: "text-foreground" },
          { label: "% Avance", value: `${totals.avance.toFixed(1)}%`, cls: "text-primary" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{k.label}</p>
              <p className={`text-2xl font-bold ${k.cls}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{GROUP_LABEL[groupBy]}</TableHead>
                  <TableHead className="text-right">Docs.</TableHead>
                  <TableHead className="text-right">Cobrado</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">% Avance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((g) => (
                  <TableRow key={g.key}>
                    <TableCell>
                      <div className="font-medium">{g.nombre}</div>
                      {g.detalle && (
                        <div className="text-xs text-muted-foreground">{g.detalle}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{g.documentos}</TableCell>
                    <TableCell className="text-right text-emerald-600">{money(g.cobrado)}</TableCell>
                    <TableCell className="text-right text-red-600">{money(g.pendiente)}</TableCell>
                    <TableCell className="text-right font-medium">{money(g.total)}</TableCell>
                    <TableCell className="text-right">{g.avance.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
                {groups.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No hay datos para el periodo y filtros seleccionados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
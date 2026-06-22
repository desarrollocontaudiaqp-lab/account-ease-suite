import { useMemo, useState } from "react";
import { BarChart3, Download, FileSpreadsheet, FileText, Loader2, TrendingDown, Calendar, Wallet, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useExpenses } from "@/hooks/useExpenses";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { BlurredValue } from "@/components/ui/BlurredValue";
import { exportRowsToExcel } from "@/lib/exportToExcel";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

const fmt = (n: number, c = "PEN") =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: c }).format(n || 0);

const parseLocal = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const STATUS_COLORS: Record<string, string> = {
  borrador: "#94a3b8",
  pendiente: "#f59e0b",
  aprobado: "#3b82f6",
  rechazado: "#ef4444",
  pagado: "#10b981",
  anulado: "#6b7280",
};
const CAT_PALETTE = ["#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#8b5cf6","#14b8a6","#f97316","#84cc16","#0ea5e9","#d946ef","#22c55e","#eab308"];

const todayISO = () => new Date().toISOString().slice(0, 10);
const firstOfYearISO = () => `${new Date().getFullYear()}-01-01`;

const EgresosReportes = () => {
  const { expenses, loading } = useExpenses();
  const { categories } = useExpenseCategories();

  const [from, setFrom] = useState(firstOfYearISO());
  const [to, setTo] = useState(todayISO());
  const [categoria, setCategoria] = useState("all");
  const [estado, setEstado] = useState("all");

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (e.fecha_egreso < from || e.fecha_egreso > to) return false;
      if (categoria !== "all" && e.categoria_id !== categoria) return false;
      if (estado !== "all" && e.estado !== estado) return false;
      return true;
    });
  }, [expenses, from, to, categoria, estado]);

  const kpis = useMemo(() => {
    const total = filtered.reduce((a, x) => a + Number(x.total || 0), 0);
    const pagado = filtered.filter((e) => e.estado === "pagado").reduce((a, x) => a + Number(x.total || 0), 0);
    const pendiente = filtered.filter((e) => e.estado === "pendiente").reduce((a, x) => a + Number(x.total || 0), 0);
    return { total, pagado, pendiente, count: filtered.length };
  }, [filtered]);

  // Por categoría
  const byCategoria = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((e) => {
      const name = categories.find((c) => c.id === e.categoria_id)?.nombre || "Sin categoría";
      map.set(name, (map.get(name) || 0) + Number(e.total || 0));
    });
    return Array.from(map.entries())
      .map(([nombre, total]) => ({ nombre, total: Number(total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total);
  }, [filtered, categories]);

  // Evolución mensual
  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((e) => {
      const d = parseLocal(e.fecha_egreso);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(k, (map.get(k) || 0) + Number(e.total || 0));
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, total]) => ({ mes, total: Number(total.toFixed(2)) }));
  }, [filtered]);

  // Por estado
  const byEstado = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((e) => map.set(e.estado, (map.get(e.estado) || 0) + Number(e.total || 0)));
    return Array.from(map.entries()).map(([estado, total]) => ({ estado, total: Number(total.toFixed(2)) }));
  }, [filtered]);

  // Top proveedores
  const topProveedores = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    filtered.forEach((e) => {
      const k = e.proveedor_nombre || "Sin proveedor";
      const cur = map.get(k) || { total: 0, count: 0 };
      cur.total += Number(e.total || 0);
      cur.count += 1;
      map.set(k, cur);
    });
    return Array.from(map.entries())
      .map(([nombre, v]) => ({ nombre, total: Number(v.total.toFixed(2)), count: v.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filtered]);

  const handleExportExcel = () => {
    if (filtered.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }
    exportRowsToExcel(
      filtered,
      [
        { header: "Código", accessor: (r) => r.codigo },
        { header: "Fecha", accessor: (r) => r.fecha_egreso },
        { header: "Proveedor", accessor: (r) => r.proveedor_nombre || "" },
        { header: "RUC/DNI", accessor: (r) => r.proveedor_documento || "" },
        { header: "Categoría", accessor: (r) => categories.find((c) => c.id === r.categoria_id)?.nombre || "" },
        { header: "Documento", accessor: (r) => [r.tipo_documento, r.serie_documento, r.numero_documento].filter(Boolean).join(" ") },
        { header: "Moneda", accessor: (r) => r.moneda },
        { header: "Subtotal", accessor: (r) => Number(r.subtotal || 0) },
        { header: "IGV", accessor: (r) => Number(r.igv || 0) },
        { header: "Total", accessor: (r) => Number(r.total || 0) },
        { header: "Estado", accessor: (r) => r.estado },
        { header: "Método pago", accessor: (r) => r.metodo_pago || "" },
        { header: "Descripción", accessor: (r) => r.descripcion || "" },
      ],
      "egresos"
    );
    toast.success("Excel exportado");
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) return toast.error("No hay datos para exportar");
    const headers = ["Código","Fecha","Proveedor","Categoría","Total","Estado"];
    const rows = filtered.map((r) => [
      r.codigo,
      r.fecha_egreso,
      (r.proveedor_nombre || "").replace(/"/g, '""'),
      (categories.find((c) => c.id === r.categoria_id)?.nombre || "").replace(/"/g, '""'),
      Number(r.total || 0).toFixed(2),
      r.estado,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `egresos_${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  const handleExportPDF = () => {
    if (filtered.length === 0) return toast.error("No hay datos para exportar");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Reporte de Egresos", 14, 14);
    doc.setFontSize(9);
    doc.text(`Periodo: ${from} a ${to}`, 14, 21);
    doc.text(`Total: ${fmt(kpis.total)}  |  Registros: ${kpis.count}`, 14, 27);
    autoTable(doc, {
      startY: 32,
      head: [["Código", "Fecha", "Proveedor", "Categoría", "Total", "Estado"]],
      body: filtered.map((r) => [
        r.codigo,
        r.fecha_egreso,
        r.proveedor_nombre || "—",
        categories.find((c) => c.id === r.categoria_id)?.nombre || "—",
        fmt(Number(r.total || 0), r.moneda),
        r.estado,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] },
    });
    doc.save(`egresos_${todayISO()}.pdf`);
    toast.success("PDF exportado");
  };

  return (
    <div className="p-6 space-y-6 font-jakarta">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            Reportes de Egresos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Análisis y exportación por categoría, periodo, estado y proveedor
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Desde</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Hasta</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Categoría</label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Estado</label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="aprobado">Aprobado</SelectItem>
                <SelectItem value="rechazado">Rechazado</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
                <SelectItem value="anulado">Anulado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase flex items-center gap-1"><Wallet className="h-3 w-3" /> Total</p>
          <p className="text-2xl font-bold mt-1"><BlurredValue>{fmt(kpis.total)}</BlurredValue></p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Pagado</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600"><BlurredValue>{fmt(kpis.pagado)}</BlurredValue></p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase flex items-center gap-1"><Calendar className="h-3 w-3" /> Pendiente</p>
          <p className="text-2xl font-bold mt-1 text-amber-600"><BlurredValue>{fmt(kpis.pendiente)}</BlurredValue></p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Registros</p>
          <p className="text-2xl font-bold mt-1">{kpis.count}</p>
        </Card>
      </div>

      {loading ? (
        <Card className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></Card>
      ) : (
        <Tabs defaultValue="categorias">
          <TabsList>
            <TabsTrigger value="categorias">Por categoría</TabsTrigger>
            <TabsTrigger value="evolucion">Evolución mensual</TabsTrigger>
            <TabsTrigger value="estados">Por estado</TabsTrigger>
            <TabsTrigger value="proveedores">Top proveedores</TabsTrigger>
          </TabsList>

          <TabsContent value="categorias">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Egresos por categoría</h3>
              {byCategoria.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">Sin datos</div>
              ) : (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byCategoria} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => fmt(v).replace("PEN", "S/")} />
                      <YAxis dataKey="nombre" type="category" width={150} />
                      <Tooltip formatter={(v: any) => fmt(Number(v))} />
                      <Bar dataKey="total" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="evolucion">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Evolución mensual</h3>
              {byMonth.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">Sin datos</div>
              ) : (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={byMonth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis tickFormatter={(v) => fmt(v).replace("PEN", "S/")} />
                      <Tooltip formatter={(v: any) => fmt(Number(v))} />
                      <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="estados">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Distribución por estado</h3>
              {byEstado.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">Sin datos</div>
              ) : (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byEstado} dataKey="total" nameKey="estado" cx="50%" cy="50%" outerRadius={130} label={(e: any) => `${e.estado}: ${fmt(e.total)}`}>
                        {byEstado.map((entry, i) => (
                          <Cell key={i} fill={STATUS_COLORS[entry.estado] || CAT_PALETTE[i % CAT_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(Number(v))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="proveedores">
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Building2 className="h-4 w-4" /> Top 10 proveedores</h3>
              {topProveedores.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">Sin datos</div>
              ) : (
                <div className="space-y-2">
                  {topProveedores.map((p, i) => {
                    const pct = kpis.total > 0 ? (p.total / kpis.total) * 100 : 0;
                    return (
                      <div key={p.nombre} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium truncate">{i + 1}. {p.nombre} <span className="text-muted-foreground">({p.count})</span></span>
                          <span className="font-semibold"><BlurredValue>{fmt(p.total)}</BlurredValue> · {pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default EgresosReportes;
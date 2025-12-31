import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  CreditCard,
  Search,
  Filter,
  Edit,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
  Loader2,
  DollarSign,
  TrendingUp,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Payment {
  id: string;
  contrato_id: string;
  monto: number;
  fecha_vencimiento: string;
  fecha_pago: string | null;
  status: "pendiente" | "pagado" | "vencido" | "parcial";
  metodo_pago: string | null;
  referencia: string | null;
  notas: string | null;
  contrato: {
    numero: string;
    moneda: string;
    cliente: {
      razon_social: string;
      codigo: string;
    };
  };
}

interface PaymentStats {
  total: number;
  pendientes: number;
  pagados: number;
  vencidos: number;
  montoPendiente: number;
  montoPagado: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  pagado: { label: "Pagado", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
  vencido: { label: "Vencido", color: "bg-red-100 text-red-800 border-red-200", icon: AlertTriangle },
  parcial: { label: "Parcial", color: "bg-blue-100 text-blue-800 border-blue-200", icon: TrendingUp },
};

export default function CalendarioPagos() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [stats, setStats] = useState<PaymentStats>({
    total: 0,
    pendientes: 0,
    pagados: 0,
    vencidos: 0,
    montoPendiente: 0,
    montoPagado: 0,
  });

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [editForm, setEditForm] = useState({
    status: "",
    fecha_pago: "",
    metodo_pago: "",
    referencia: "",
    notas: "",
  });
  const [saving, setSaving] = useState(false);

  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("pagos")
      .select(`
        *,
        contrato:contratos(
          numero,
          moneda,
          cliente:clientes(razon_social, codigo)
        )
      `)
      .order("fecha_vencimiento", { ascending: true });

    if (error) {
      console.error("Error fetching payments:", error);
      toast.error("Error al cargar los pagos");
    } else if (data) {
      // Check for overdue payments and update status
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const updatedPayments = data.map((payment) => {
        const dueDate = new Date(payment.fecha_vencimiento);
        dueDate.setHours(0, 0, 0, 0);
        
        if (payment.status === "pendiente" && dueDate < today) {
          return { ...payment, status: "vencido" as const };
        }
        return payment;
      });

      setPayments(updatedPayments as Payment[]);

      // Calculate stats
      const statsData: PaymentStats = {
        total: updatedPayments.length,
        pendientes: updatedPayments.filter((p) => p.status === "pendiente").length,
        pagados: updatedPayments.filter((p) => p.status === "pagado").length,
        vencidos: updatedPayments.filter((p) => p.status === "vencido").length,
        montoPendiente: updatedPayments
          .filter((p) => p.status !== "pagado")
          .reduce((sum, p) => sum + (p.monto || 0), 0),
        montoPagado: updatedPayments
          .filter((p) => p.status === "pagado")
          .reduce((sum, p) => sum + (p.monto || 0), 0),
      };
      setStats(statsData);
    }

    setLoading(false);
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.contrato?.numero?.toLowerCase().includes(search.toLowerCase()) ||
      payment.contrato?.cliente?.razon_social?.toLowerCase().includes(search.toLowerCase()) ||
      payment.contrato?.cliente?.codigo?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "todos" || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleEditPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setEditForm({
      status: payment.status,
      fecha_pago: payment.fecha_pago || "",
      metodo_pago: payment.metodo_pago || "",
      referencia: payment.referencia || "",
      notas: payment.notas || "",
    });
    setEditDialogOpen(true);
  };

  const handleViewDetail = (payment: Payment) => {
    setDetailPayment(payment);
    setDetailDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPayment) return;

    setSaving(true);

    const updateData: Record<string, unknown> = {
      status: editForm.status,
      metodo_pago: editForm.metodo_pago || null,
      referencia: editForm.referencia || null,
      notas: editForm.notas || null,
    };

    if (editForm.status === "pagado" && editForm.fecha_pago) {
      updateData.fecha_pago = editForm.fecha_pago;
    } else if (editForm.status !== "pagado") {
      updateData.fecha_pago = null;
    }

    const { error } = await supabase
      .from("pagos")
      .update(updateData)
      .eq("id", selectedPayment.id);

    if (error) {
      console.error("Error updating payment:", error);
      toast.error("Error al actualizar el pago");
    } else {
      toast.success("Pago actualizado correctamente");
      setEditDialogOpen(false);
      fetchPayments();
    }

    setSaving(false);
  };

  const formatCurrency = (amount: number, currency: string = "PEN") => {
    return `${currency === "PEN" ? "S/" : "$"} ${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendario de Pagos</h1>
          <p className="text-muted-foreground">
            Gestiona y da seguimiento a los pagos de los contratos
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pagos</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pendientes}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vencidos</p>
                <p className="text-2xl font-bold text-red-600">{stats.vencidos}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monto Pendiente</p>
                <p className="text-2xl font-bold">S/ {stats.montoPendiente.toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por contrato, cliente o RUC..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Pagos Registrados
            <Badge variant="secondary" className="ml-2">
              {filteredPayments.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay pagos registrados</p>
              <p className="text-sm">Los pagos se generan automáticamente al aprobar un contrato</p>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Pago</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => {
                    const StatusIcon = statusConfig[payment.status]?.icon || Clock;
                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.contrato?.numero}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {payment.contrato?.cliente?.razon_social}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {payment.contrato?.cliente?.codigo}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(payment.fecha_vencimiento), "dd MMM yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.monto, payment.contrato?.moneda)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`gap-1 ${statusConfig[payment.status]?.color}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig[payment.status]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.fecha_pago
                            ? format(new Date(payment.fecha_pago), "dd MMM yyyy", { locale: es })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                •••
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetail(payment)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditPayment(payment)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar Pago
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Payment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Pago</DialogTitle>
            <DialogDescription>
              Actualiza el estado y detalles del pago
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Estado del Pago</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editForm.status === "pagado" && (
              <div className="space-y-2">
                <Label>Fecha de Pago</Label>
                <Input
                  type="date"
                  value={editForm.fecha_pago}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, fecha_pago: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select
                value={editForm.metodo_pago}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, metodo_pago: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="yape">Yape</SelectItem>
                  <SelectItem value="plin">Plin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Referencia</Label>
              <Input
                value={editForm.referencia}
                onChange={(e) => setEditForm((prev) => ({ ...prev, referencia: e.target.value }))}
                placeholder="Número de operación, voucher, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                value={editForm.notas}
                onChange={(e) => setEditForm((prev) => ({ ...prev, notas: e.target.value }))}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del Pago</DialogTitle>
          </DialogHeader>

          {detailPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Contrato</p>
                  <p className="font-medium">{detailPayment.contrato?.numero}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge
                    variant="outline"
                    className={statusConfig[detailPayment.status]?.color}
                  >
                    {statusConfig[detailPayment.status]?.label}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Cliente</span>
                </div>
                <p className="font-medium">{detailPayment.contrato?.cliente?.razon_social}</p>
                <p className="text-sm text-muted-foreground">
                  RUC: {detailPayment.contrato?.cliente?.codigo}
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Monto</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(detailPayment.monto, detailPayment.contrato?.moneda)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vencimiento</p>
                  <p className="font-medium">
                    {format(new Date(detailPayment.fecha_vencimiento), "dd MMMM yyyy", { locale: es })}
                  </p>
                </div>
              </div>

              {detailPayment.fecha_pago && (
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Pago</p>
                  <p className="font-medium text-green-600">
                    {format(new Date(detailPayment.fecha_pago), "dd MMMM yyyy", { locale: es })}
                  </p>
                </div>
              )}

              {detailPayment.metodo_pago && (
                <div>
                  <p className="text-sm text-muted-foreground">Método de Pago</p>
                  <p className="font-medium capitalize">{detailPayment.metodo_pago}</p>
                </div>
              )}

              {detailPayment.referencia && (
                <div>
                  <p className="text-sm text-muted-foreground">Referencia</p>
                  <p className="font-medium">{detailPayment.referencia}</p>
                </div>
              )}

              {detailPayment.notas && (
                <div>
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="text-sm">{detailPayment.notas}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={() => {
              setDetailDialogOpen(false);
              if (detailPayment) handleEditPayment(detailPayment);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

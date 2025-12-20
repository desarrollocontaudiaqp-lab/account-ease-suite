import { Badge } from "@/components/ui/badge";
import { CalendarDays, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Payment {
  id: string;
  client: string;
  amount: number;
  dueDate: string;
  daysUntil: number;
  status: "pending" | "overdue" | "upcoming";
}

const payments: Payment[] = [
  {
    id: "P-001",
    client: "Empresa ABC S.A.C.",
    amount: 1500,
    dueDate: "22/12/2024",
    daysUntil: 2,
    status: "upcoming",
  },
  {
    id: "P-002",
    client: "Inversiones XYZ E.I.R.L.",
    amount: 2200,
    dueDate: "18/12/2024",
    daysUntil: -2,
    status: "overdue",
  },
  {
    id: "P-003",
    client: "Tech Solutions Perú",
    amount: 850,
    dueDate: "25/12/2024",
    daysUntil: 5,
    status: "pending",
  },
  {
    id: "P-004",
    client: "Comercial Delta S.A.",
    amount: 3100,
    dueDate: "28/12/2024",
    daysUntil: 8,
    status: "pending",
  },
];

const statusConfig = {
  pending: {
    badge: "status-progress",
    label: "Pendiente",
    dot: "bg-blue-500",
  },
  overdue: {
    badge: "status-overdue",
    label: "Vencido",
    dot: "bg-red-500",
  },
  upcoming: {
    badge: "status-pending",
    label: "Próximo",
    dot: "bg-amber-500",
  },
};

export function UpcomingPayments() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden animate-slide-up shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/10 ring-1 ring-secondary/20">
            <CalendarDays className="h-6 w-6 text-secondary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Pagos Próximos
            </h3>
            <p className="text-sm text-muted-foreground">Próximos 7 días</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/50">
        {payments.map((payment, index) => (
          <div
            key={payment.id}
            className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group cursor-pointer"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "h-2.5 w-2.5 rounded-full flex-shrink-0",
                statusConfig[payment.status].dot
              )}>
                {payment.status === "overdue" && (
                  <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
                )}
              </div>
              <div>
                <p className="font-medium text-foreground text-sm flex items-center gap-2">
                  {payment.client}
                  {payment.status === "overdue" && (
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vence: {payment.dueDate}
                </p>
              </div>
            </div>
            <div className="text-right flex items-center gap-4">
              <div>
                <p className="font-bold text-foreground">
                  S/ {payment.amount.toLocaleString()}
                </p>
                <span className={cn("status-badge text-xs mt-1", statusConfig[payment.status].badge)}>
                  {statusConfig[payment.status].label}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-muted/20 border-t border-border/50">
        <button className="text-sm text-primary font-semibold hover:text-primary/80 transition-colors flex items-center gap-2 group">
          Ver calendario completo
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

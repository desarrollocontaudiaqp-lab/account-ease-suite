import { Badge } from "@/components/ui/badge";
import { CalendarDays, AlertTriangle } from "lucide-react";

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

const statusStyles = {
  pending: {
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    label: "Pendiente",
  },
  overdue: {
    badge: "bg-red-100 text-red-800 border-red-200",
    label: "Vencido",
  },
  upcoming: {
    badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
    label: "Próximo",
  },
};

export function UpcomingPayments() {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-slide-up">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary/20">
            <CalendarDays className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Pagos Próximos
            </h3>
            <p className="text-sm text-muted-foreground">Próximos 7 días</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              {payment.status === "overdue" && (
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              )}
              <div>
                <p className="font-medium text-foreground text-sm">
                  {payment.client}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vence: {payment.dueDate}
                </p>
              </div>
            </div>
            <div className="text-right flex items-center gap-3">
              <div>
                <p className="font-semibold text-foreground">
                  S/ {payment.amount.toLocaleString()}
                </p>
                <Badge
                  variant="outline"
                  className={`text-xs ${statusStyles[payment.status].badge}`}
                >
                  {statusStyles[payment.status].label}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-muted/30 border-t border-border">
        <button className="text-sm text-primary font-medium hover:underline">
          Ver calendario completo →
        </button>
      </div>
    </div>
  );
}

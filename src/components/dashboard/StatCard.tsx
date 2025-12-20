import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "secondary" | "success" | "warning";
}

const variantStyles = {
  default: "bg-card",
  primary: "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
  secondary: "bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground",
  success: "bg-gradient-to-br from-status-completed/90 to-status-completed/70 text-primary-foreground",
  warning: "bg-gradient-to-br from-status-pending/90 to-status-pending/70 text-foreground",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: StatCardProps) {
  const isColoredVariant = variant !== "default";

  return (
    <div
      className={cn(
        "stat-card relative overflow-hidden animate-slide-up",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p
            className={cn(
              "text-sm font-medium",
              isColoredVariant ? "opacity-90" : "text-muted-foreground"
            )}
          >
            {title}
          </p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {subtitle && (
            <p
              className={cn(
                "text-sm mt-1",
                isColoredVariant ? "opacity-80" : "text-muted-foreground"
              )}
            >
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={cn(
                  "text-xs font-medium px-1.5 py-0.5 rounded",
                  trend.isPositive
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                )}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-xs opacity-70">vs mes anterior</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "p-3 rounded-xl",
            isColoredVariant ? "bg-white/20" : "bg-primary/10"
          )}
        >
          <Icon
            className={cn(
              "h-6 w-6",
              isColoredVariant ? "text-current" : "text-primary"
            )}
          />
        </div>
      </div>

      {/* Decorative element */}
      <div
        className={cn(
          "absolute -right-6 -bottom-6 h-24 w-24 rounded-full opacity-10",
          isColoredVariant ? "bg-white" : "bg-primary"
        )}
      />
    </div>
  );
}

import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

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
  delay?: number;
}

const variantStyles = {
  default: {
    card: "bg-card hover:shadow-lg",
    icon: "bg-muted text-primary",
    iconRing: "",
  },
  primary: {
    card: "bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25",
    icon: "bg-white/20 text-white backdrop-blur-sm",
    iconRing: "ring-2 ring-white/20",
  },
  secondary: {
    card: "bg-gradient-to-br from-secondary via-secondary to-secondary/90 text-secondary-foreground shadow-lg shadow-secondary/25",
    icon: "bg-white/20 text-white backdrop-blur-sm",
    iconRing: "ring-2 ring-white/20",
  },
  success: {
    card: "bg-gradient-to-br from-emerald-500 via-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25",
    icon: "bg-white/20 text-white backdrop-blur-sm",
    iconRing: "ring-2 ring-white/20",
  },
  warning: {
    card: "bg-gradient-to-br from-amber-400 via-amber-400 to-amber-500 text-amber-950 shadow-lg shadow-amber-400/25",
    icon: "bg-amber-950/10 text-amber-950 backdrop-blur-sm",
    iconRing: "ring-2 ring-amber-950/10",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  delay = 0,
}: StatCardProps) {
  const styles = variantStyles[variant];
  const isColoredVariant = variant !== "default";

  return (
    <div
      className={cn(
        "stat-card relative overflow-hidden group animate-slide-up",
        styles.card
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1 space-y-3">
          <p
            className={cn(
              "text-sm font-medium",
              isColoredVariant ? "opacity-80" : "text-muted-foreground"
            )}
          >
            {title}
          </p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          
          <div className="flex items-center gap-3">
            {trend && (
              <div className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
                isColoredVariant
                  ? trend.isPositive ? "bg-white/20" : "bg-white/20"
                  : trend.isPositive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              )}>
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend.isPositive ? "+" : ""}{trend.value}%
              </div>
            )}
            {subtitle && (
              <p className={cn(
                "text-xs",
                isColoredVariant ? "opacity-70" : "text-muted-foreground"
              )}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        <div className={cn(
          "p-3.5 rounded-2xl transition-transform duration-300 group-hover:scale-110",
          styles.icon,
          styles.iconRing
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {/* Decorative elements */}
      <div className={cn(
        "absolute -right-8 -bottom-8 h-32 w-32 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150",
        isColoredVariant ? "bg-white" : "bg-primary"
      )} />
      <div className={cn(
        "absolute -right-4 -bottom-4 h-20 w-20 rounded-full opacity-5 transition-transform duration-500 group-hover:scale-125",
        isColoredVariant ? "bg-white" : "bg-primary"
      )} />
    </div>
  );
}

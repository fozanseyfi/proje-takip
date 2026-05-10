import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl bg-white border border-border p-5 shadow-soft transition-all",
        "hover:border-border2 hover:shadow-medium",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "font-display text-xs font-bold text-text2 uppercase tracking-[1.5px] mb-4 flex items-center gap-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between mb-4 gap-3", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  );
}

// KPI Card — premium light variant
export function KpiCard({
  label,
  value,
  sub,
  barPct,
  barColor = "var(--accent)",
  className,
  valueClassName,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  barPct?: number;
  barColor?: string;
  className?: string;
  valueClassName?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-5 bg-white border border-border shadow-soft transition-all",
        "hover:-translate-y-0.5 hover:shadow-medium hover:border-border2",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-[10px] font-display uppercase tracking-[1.5px] text-text3">
          {label}
        </div>
        {icon && (
          <span className="text-text3">{icon}</span>
        )}
      </div>
      <div className={cn("font-mono text-3xl font-bold leading-none text-text", valueClassName)}>
        {value}
      </div>
      {sub && <div className="text-xs text-text2 mt-2">{sub}</div>}
      {typeof barPct === "number" && (
        <div className="h-1 bg-bg3 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, barPct))}%`, background: barColor }}
          />
        </div>
      )}
    </div>
  );
}

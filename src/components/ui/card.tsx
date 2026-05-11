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
        "rounded-2xl bg-white border border-border p-6 shadow-soft",
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
        "font-display text-sm font-bold text-text tracking-tight mb-4 flex items-center gap-2",
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
    <div className={cn("flex items-center justify-between mb-5 gap-3", className)} {...props}>
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

// KPI Card — modern, ferah
export function KpiCard({
  label,
  value,
  sub,
  barPct,
  barColor = "var(--accent)",
  className,
  valueClassName,
  icon,
  iconColor = "accent",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  barPct?: number;
  barColor?: string;
  className?: string;
  valueClassName?: string;
  icon?: React.ReactNode;
  iconColor?: "accent" | "blue" | "amber" | "red" | "purple";
}) {
  const iconStyles: Record<string, string> = {
    accent: "bg-accent/10 text-accent",
    blue: "bg-blue/10 text-blue",
    amber: "bg-yellow/10 text-yellow",
    red: "bg-red/10 text-red",
    purple: "bg-purple/10 text-purple",
  };
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 bg-white border border-border shadow-soft transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-medium",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] font-display uppercase tracking-wider text-text3 font-semibold">
          {label}
        </div>
        {icon && (
          <span className={cn("inline-flex items-center justify-center w-9 h-9 rounded-xl", iconStyles[iconColor])}>
            {icon}
          </span>
        )}
      </div>
      <div className={cn("font-mono text-[28px] font-bold leading-none text-text tracking-tight", valueClassName)}>
        {value}
      </div>
      {sub && <div className="text-xs text-text2 mt-2 font-medium">{sub}</div>}
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

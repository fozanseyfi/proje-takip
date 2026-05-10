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
        "rounded-xl bg-gradient-to-br from-bg3/90 to-bg2/90 border border-border2/80 p-5",
        "border-t-blue/10 transition-colors hover:border-accent/20",
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
        "font-display text-xs font-bold text-text2 uppercase tracking-[2px] mb-4 flex items-center gap-2",
        "before:content-[''] before:block before:w-[2px] before:h-3.5 before:bg-gradient-to-b before:from-accent before:to-transparent before:rounded-sm",
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

// KPI Card variant
export function KpiCard({
  label,
  value,
  sub,
  barPct,
  barColor = "var(--accent)",
  className,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  barPct?: number;
  barColor?: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-5 transition-all",
        "bg-gradient-to-br from-bg4/90 to-bg3/90 border border-border2/60",
        "before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px",
        "before:bg-gradient-to-r before:from-transparent before:via-blue/40 before:to-transparent",
        "hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
        className
      )}
    >
      <div className="text-[10px] font-display uppercase tracking-[2px] text-text3 mb-2.5">
        {label}
      </div>
      <div className={cn("font-mono text-3xl font-bold leading-none", valueClassName)}>
        {value}
      </div>
      {sub && <div className="text-xs text-text3 mt-2">{sub}</div>}
      {typeof barPct === "number" && (
        <div className="h-0.5 bg-white/5 rounded-sm mt-3.5 overflow-hidden">
          <div
            className="h-full rounded-sm transition-[width] duration-700 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, barPct))}%`, background: barColor }}
          />
        </div>
      )}
    </div>
  );
}

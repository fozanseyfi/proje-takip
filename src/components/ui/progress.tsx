import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  color = "var(--accent)",
  className,
}: {
  value: number;
  max?: number;
  color?: string;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("h-1.5 bg-bg3 rounded-full overflow-hidden", className)}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export function ProgressDouble({
  plan,
  real,
  max = 100,
  className,
}: {
  plan: number;
  real: number;
  max?: number;
  className?: string;
}) {
  const planPct = Math.min(100, Math.max(0, (plan / max) * 100));
  const realPct = Math.min(100, Math.max(0, (real / max) * 100));
  return (
    <div className={cn("relative h-2 bg-bg3 rounded-full overflow-hidden", className)}>
      <div
        className="absolute top-0 left-0 h-full rounded-full bg-planned/40 transition-[width] duration-500"
        style={{ width: `${planPct}%` }}
      />
      <div
        className="absolute top-0 left-0 h-full rounded-full bg-realized transition-[width] duration-500"
        style={{ width: `${realPct}%` }}
      />
    </div>
  );
}

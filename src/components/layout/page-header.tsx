import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ size?: number }>;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3", className)}>
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-text tracking-tight flex items-center gap-3">
          {Icon && (
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent">
              <Icon size={20} />
            </span>
          )}
          {title}
        </h1>
        {description && <p className="text-sm text-text3 mt-1 ml-13">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";
import { Info, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

type Variant = "info" | "success" | "warning" | "error";

const variants: Record<Variant, { bg: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  info: {
    bg: "bg-blue/8 border-blue/20 text-blue2",
    icon: Info,
  },
  success: {
    bg: "bg-green/8 border-green/20 text-green",
    icon: CheckCircle2,
  },
  warning: {
    bg: "bg-yellow/8 border-yellow/30 text-yellow",
    icon: AlertTriangle,
  },
  error: {
    bg: "bg-red/8 border-red/20 text-red",
    icon: AlertCircle,
  },
};

export function Alert({
  variant = "info",
  className,
  children,
}: {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  const { bg, icon: Icon } = variants[variant];
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 px-4 py-3 rounded-lg border text-sm",
        bg,
        className
      )}
    >
      <Icon size={16} className="shrink-0 mt-0.5" />
      <div className="flex-1 text-text">{children}</div>
    </div>
  );
}

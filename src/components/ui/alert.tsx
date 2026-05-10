import * as React from "react";
import { cn } from "@/lib/utils";
import { Info, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

type Variant = "info" | "success" | "warning" | "error";

const variants: Record<Variant, { bg: string; icon: React.ComponentType<{ size?: number }> }> = {
  info: {
    bg: "bg-blue/10 border-blue/30 text-blue-200",
    icon: Info,
  },
  success: {
    bg: "bg-green/10 border-green/30 text-green",
    icon: CheckCircle2,
  },
  warning: {
    bg: "bg-yellow/10 border-yellow/30 text-yellow",
    icon: AlertTriangle,
  },
  error: {
    bg: "bg-red/10 border-red/30 text-red",
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
        "flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border text-sm",
        bg,
        className
      )}
    >
      <Icon size={16} />
      <div className="flex-1">{children}</div>
    </div>
  );
}

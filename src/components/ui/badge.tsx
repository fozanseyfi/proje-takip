import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "green" | "yellow" | "red" | "blue" | "purple" | "accent" | "gray";

const variants: Record<Variant, string> = {
  green: "bg-green/15 text-green border border-green/20",
  yellow: "bg-yellow/15 text-yellow border border-yellow/20",
  red: "bg-red/15 text-red border border-red/20",
  blue: "bg-blue/15 text-blue border border-blue/20",
  purple: "bg-purple/15 text-purple border border-purple/20",
  accent: "bg-accent/15 text-accent border border-accent/20",
  gray: "bg-bg4 text-text2 border border-border",
};

export function Badge({
  className,
  variant = "gray",
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

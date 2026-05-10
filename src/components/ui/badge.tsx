import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "green" | "yellow" | "red" | "blue" | "purple" | "accent" | "gray";

const variants: Record<Variant, string> = {
  green: "bg-green/10 text-green ring-1 ring-green/20",
  yellow: "bg-yellow/10 text-yellow ring-1 ring-yellow/20",
  red: "bg-red/10 text-red ring-1 ring-red/20",
  blue: "bg-blue/10 text-blue ring-1 ring-blue/20",
  purple: "bg-purple/10 text-purple ring-1 ring-purple/20",
  accent: "bg-accent/10 text-accent ring-1 ring-accent/20",
  gray: "bg-bg3 text-text2 ring-1 ring-border",
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
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

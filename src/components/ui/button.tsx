"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "accent" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-blue/15 text-blue border border-blue/30 hover:bg-blue/25 hover:border-blue hover:shadow-[0_0_15px_rgba(61,142,240,0.25)]",
  accent:
    "bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 hover:border-accent hover:shadow-[0_0_20px_rgba(0,212,255,0.25)]",
  ghost:
    "bg-bg4 text-text2 border border-border hover:bg-bg3 hover:text-text",
  outline:
    "bg-transparent text-text2 border border-border2 hover:bg-bg3 hover:text-text",
  danger:
    "bg-red/15 text-red border border-red/30 hover:bg-red/25",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-9 px-4 text-xs",
  lg: "h-10 px-5 text-sm",
  icon: "h-9 w-9 p-0",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "ghost", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold tracking-wide transition-all",
        "disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";

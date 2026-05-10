"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "accent" | "ghost" | "danger" | "outline" | "soft";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  // Filled accent (primary action) — navy
  accent:
    "bg-accent text-white border border-accent hover:bg-accent2 hover:border-accent2 shadow-soft",
  // Filled primary — blue
  primary:
    "bg-blue text-white border border-blue hover:bg-blue2 hover:border-blue2 shadow-soft",
  // Outline
  outline:
    "bg-white text-text border border-border2 hover:bg-bg3 hover:border-text3",
  // Ghost (subtle)
  ghost:
    "bg-bg3 text-text2 border border-border hover:bg-bg4 hover:text-text",
  // Soft accent
  soft:
    "bg-accent/8 text-accent border border-accent/20 hover:bg-accent/15 hover:border-accent/30",
  // Danger
  danger:
    "bg-red text-white border border-red hover:bg-red/90",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
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
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold tracking-tight transition-all",
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

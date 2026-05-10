import * as React from "react";
import { cn } from "@/lib/utils";

export function TableWrap({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border border-border", className)}>
      {children}
    </div>
  );
}

export function Table({
  className,
  children,
}: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn("w-full border-collapse text-sm", className)}>
      {children}
    </table>
  );
}

export function THead({ className, children }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn(className)}>{children}</thead>;
}

export function TH({
  className,
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "bg-bg4/80 text-left px-3 py-2.5 text-text3 text-[10px] uppercase tracking-[1.5px] font-display font-semibold border-b border-border2 whitespace-nowrap",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TBody({ className, children }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn(className)}>{children}</tbody>;
}

export function TR({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("hover:bg-bg3/60 transition-colors group", className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TD({
  className,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-3 py-2 border-b border-border text-text align-middle", className)}
      {...props}
    >
      {children}
    </td>
  );
}

export function Empty({ children, colSpan }: { children: React.ReactNode; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-text3 text-sm">
        {children}
      </td>
    </tr>
  );
}

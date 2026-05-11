"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tek başlıklı collapsible card.
 * - Card görünümü (rounded-2xl, beyaz, border, shadow)
 * - Summary = clickable header (icon + title + opsiyonel badge + opsiyonel link + chevron)
 * - Default açık
 */
export function CollapsibleCard({
  title,
  icon,
  link,
  badge,
  defaultOpen = true,
  className,
  bodyClassName,
  children,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  link?: { href: string; label: string };
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        "group rounded-2xl bg-white border border-border shadow-soft overflow-hidden",
        className
      )}
    >
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden px-5 py-3.5 hover:bg-bg2/40 flex items-center gap-2 group-open:border-b group-open:border-border transition-colors">
        {icon}
        <span className="font-display text-sm font-bold text-text tracking-tight">{title}</span>
        {badge}
        {link && (
          <Link
            href={link.href}
            onClick={(e) => e.stopPropagation()}
            className="ml-auto text-[11px] text-accent font-bold hover:underline"
          >
            {link.label}
          </Link>
        )}
        <ChevronDown
          size={14}
          className={cn(
            "text-text3 transition-transform group-open:rotate-180 shrink-0",
            !link && "ml-auto"
          )}
        />
      </summary>
      <div className={cn(bodyClassName)}>{children}</div>
    </details>
  );
}

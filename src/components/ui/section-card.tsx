import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Kurumsal, her zaman açık bölüm kartı. CollapsibleCard ile aynı prop yüzeyini
 * kabul eder (drop-in) ancak açılır-kapanır davranışı ve renkli gradient başlığı
 * yoktur — üst yönetim panosu için sakin, nötr bir görünüm sağlar.
 *
 * `tone` ve `defaultOpen` prop'ları geriye dönük uyumluluk için kabul edilir ama
 * bilinçli olarak yok sayılır (renk azaltma / her zaman açık).
 */
export function SectionCard({
  title,
  icon,
  link,
  badge,
  className,
  bodyClassName,
  children,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  link?: { href: string; label: string };
  badge?: React.ReactNode;
  /** kabul edilir, yok sayılır */
  tone?: string;
  /** kabul edilir, yok sayılır — kart her zaman açıktır */
  defaultOpen?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-xl bg-white border border-border shadow-sm overflow-hidden",
        className
      )}
    >
      <div className="px-5 py-3 flex items-center gap-2.5 border-b border-border bg-bg2/30">
        {icon && (
          <span className="text-text3 shrink-0 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
        )}
        <h3 className="text-[13px] font-semibold text-text tracking-tight">{title}</h3>
        {badge && <span className="text-text3">{badge}</span>}
        {link && (
          <Link
            href={link.href}
            className="ml-auto text-[11px] font-medium text-accent hover:underline whitespace-nowrap"
          >
            {link.label}
          </Link>
        )}
      </div>
      <div className={cn(bodyClassName)}>{children}</div>
    </section>
  );
}

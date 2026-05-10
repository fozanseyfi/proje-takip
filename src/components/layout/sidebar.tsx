"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups } from "./nav-config";
import { useCurrentUser } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const user = useCurrentUser();

  return (
    <aside className="hidden md:block w-60 shrink-0 border-r border-border bg-bg2/40 overflow-y-auto sticky top-15 h-[calc(100vh-3.75rem)]">
      <nav className="py-3 px-2 space-y-4">
        {navGroups.map((group) => {
          const items = group.items.filter(
            (i) => !i.superAdminOnly || user?.isSuperAdmin
          );
          if (items.length === 0) return null;
          return (
            <div key={group.title}>
              <div className="px-3 mb-1 text-[9px] font-display uppercase tracking-[2px] text-text3">
                {group.title}
              </div>
              {items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-all",
                      active
                        ? "bg-accent/10 text-accent border-l-2 border-accent shadow-[inset_0_0_20px_rgba(0,212,255,0.05)]"
                        : "text-text2 hover:bg-bg3 hover:text-text border-l-2 border-transparent"
                    )}
                  >
                    <Icon size={14} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

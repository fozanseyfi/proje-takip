"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { navGroups } from "./nav-config";
import { useCurrentUser } from "@/lib/store";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

function NavList({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();
  const user = useCurrentUser();

  return (
    <nav className="py-4 px-3 space-y-5">
      {navGroups.map((group) => {
        const items = group.items.filter((i) => !i.superAdminOnly || user?.isSuperAdmin);
        if (items.length === 0) return null;
        return (
          <div key={group.title}>
            <div className="px-2.5 mb-1.5 text-[10px] font-display uppercase tracking-[1.5px] text-text3 font-semibold">
              {group.title}
            </div>
            {items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onItemClick}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all relative",
                    active
                      ? "bg-accent/8 text-accent font-semibold"
                      : "text-text2 hover:bg-bg3 hover:text-text"
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-accent" />
                  )}
                  <Icon size={16} className={active ? "text-accent" : "text-text3"} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:block w-64 shrink-0 border-r border-border bg-bg2 overflow-y-auto sticky top-16 h-[calc(100vh-4rem)]">
      <NavList />
    </aside>
  );
}

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="md:hidden fixed inset-0 z-40 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute top-0 left-0 bottom-0 w-72 bg-white border-r border-border shadow-large overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between px-4 h-16 border-b border-border bg-white z-10">
          <Logo size={26} textClassName="text-base tracking-[2px]" />
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-bg3 text-text3 hover:text-text">
            <X size={16} />
          </button>
        </div>
        <NavList onItemClick={onClose} />
      </div>
    </div>
  );
}

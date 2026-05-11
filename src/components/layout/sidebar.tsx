"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { navGroups } from "./nav-config";
import { useCurrentUser, useCurrentProject } from "@/lib/store";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

function NavList({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();
  const user = useCurrentUser();

  return (
    <nav className="py-4 px-3 space-y-6">
      {navGroups.map((group) => {
        const items = group.items.filter((i) => !i.superAdminOnly || user?.isSuperAdmin);
        if (items.length === 0) return null;
        return (
          <div key={group.title}>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[1.5px] text-text3">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onItemClick}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all relative group",
                      active
                        ? "bg-accent/10 text-accent font-semibold"
                        : "text-text2 hover:bg-bg2 hover:text-text font-medium"
                    )}
                  >
                    <Icon size={16} className={cn(active ? "text-accent" : "text-text3 group-hover:text-text2")} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function BrandBlock() {
  const project = useCurrentProject();
  const user = useCurrentUser();
  return (
    <div className="px-4 py-4 border-b border-border">
      <Link href="/dashboard" className="block">
        <Logo size={32} compact textClassName="text-base" />
      </Link>
      {project && (
        <div className="mt-3 px-2.5 py-2 rounded-lg bg-bg2 border border-border">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-text3">Aktif Proje</div>
          <div className="text-xs font-semibold text-text truncate mt-0.5">{project.name}</div>
          {user?.isSuperAdmin && (
            <div className="text-[10px] text-text3 mt-0.5">{user.fullName}</div>
          )}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-white sticky top-0 h-screen overflow-y-auto">
      <BrandBlock />
      <NavList />
    </aside>
  );
}

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="md:hidden fixed inset-0 z-40 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute top-0 left-0 bottom-0 w-72 bg-white border-r border-border shadow-large overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between px-4 h-16 border-b border-border bg-white z-10">
          <Logo size={28} compact textClassName="text-base" />
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg3 text-text3 hover:text-text">
            <X size={16} />
          </button>
        </div>
        <NavList onItemClick={onClose} />
      </div>
    </div>
  );
}

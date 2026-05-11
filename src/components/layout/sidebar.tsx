"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { navGroups } from "./nav-config";
import { useCurrentUser, useCurrentProject } from "@/lib/store";
import { Logo, LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

function NavList({
  onItemClick,
  collapsed = false,
}: {
  onItemClick?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const user = useCurrentUser();

  return (
    <nav className={cn("py-4 space-y-6", collapsed ? "px-2" : "px-3")}>
      {navGroups.map((group) => {
        const items = group.items.filter((i) => !i.superAdminOnly || user?.isSuperAdmin);
        if (items.length === 0) return null;
        return (
          <div key={group.title}>
            {!collapsed && (
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[1.5px] text-text3">
                {group.title}
              </div>
            )}
            {collapsed && (
              <div className="h-px bg-border mx-2 mb-2 first:hidden" />
            )}
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onItemClick}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center rounded-lg text-sm transition-all relative group",
                      collapsed
                        ? "justify-center w-12 h-10 mx-auto"
                        : "gap-3 px-3 py-2",
                      active
                        ? "bg-accent/10 text-accent font-semibold"
                        : "text-text2 hover:bg-bg2 hover:text-text font-medium"
                    )}
                  >
                    <Icon
                      size={16}
                      className={cn(active ? "text-accent" : "text-text3 group-hover:text-text2", "shrink-0")}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                      </>
                    )}
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

function BrandBlock({ collapsed }: { collapsed: boolean }) {
  const project = useCurrentProject();
  const user = useCurrentUser();
  return (
    <div className={cn("py-4 border-b border-border", collapsed ? "px-2" : "px-4")}>
      <Link
        href="/dashboard"
        className={cn("block", collapsed && "flex justify-center")}
        title={collapsed ? "GES Takip" : undefined}
      >
        {collapsed ? <LogoMark size={32} /> : <Logo size={32} compact textClassName="text-base" />}
      </Link>
      {!collapsed && project && (
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

export function Sidebar({
  collapsed = false,
  onToggleCollapsed,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  return (
    <aside
      className={cn(
        "hidden md:flex flex-col shrink-0 border-r border-border bg-white sticky top-0 h-screen transition-[width] duration-200 ease-out relative",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <BrandBlock collapsed={collapsed} />
        <NavList collapsed={collapsed} />
      </div>

      {/* Toggle butonu — sidebar'ın sağ kenarında ortalı */}
      {onToggleCollapsed && (
        <button
          onClick={onToggleCollapsed}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -right-3 z-10",
            "w-6 h-6 rounded-full bg-white border border-border shadow-soft",
            "flex items-center justify-center text-text3 hover:text-accent hover:border-accent transition-all"
          )}
          title={collapsed ? "Aç" : "Daralt"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      )}
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

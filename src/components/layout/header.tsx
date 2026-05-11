"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, LogOut, User as UserIcon, Menu, FolderKanban } from "lucide-react";
import { useStore, useCurrentProject, useCurrentUser } from "@/lib/store";
import { computeProgress } from "@/lib/calc/progress";
import { spiLevel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { allNavItems } from "./nav-config";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const projects = useStore((s) => s.projects);
  const currentProject = useCurrentProject();
  const setCurrentProject = useStore((s) => s.setCurrentProject);
  const wbsAll = useStore((s) => s.wbs);
  const plannedAll = useStore((s) => s.planned);
  const realizedAll = useStore((s) => s.realized);
  const currentUser = useCurrentUser();
  const notifications = useStore((s) => s.notifications).filter((n) => !n.readAt);
  const pathname = usePathname();

  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const stats = useMemo(() => {
    if (!currentProject) return null;
    const items = wbsAll
      .filter((w) => w.projectId === currentProject.id && !w.deletedAt)
      .map((w) => ({ code: w.code, isLeaf: w.isLeaf, quantity: w.quantity, weight: w.weight }));
    const planned = plannedAll[currentProject.id] || {};
    const realized = realizedAll[currentProject.id] || {};
    const { planPct, realPct, spi } = computeProgress(items, planned, realized, currentProject.reportDate);
    return { planPct, realPct, spi };
  }, [currentProject, wbsAll, plannedAll, realizedAll]);

  const spiClass = stats?.spi != null
    ? { good: "text-green", warn: "text-yellow", bad: "text-red" }[spiLevel(stats.spi)!]
    : "text-text3";

  // Current page label
  const currentNav = allNavItems.find((n) => pathname === n.href || pathname?.startsWith(n.href + "/"));

  const userInitial = currentUser?.fullName?.[0]?.toUpperCase() ?? "K";

  return (
    <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 flex items-center gap-3 sm:gap-5 bg-white/90 border-b border-border backdrop-blur-xl">
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg hover:bg-bg3 text-text2"
          aria-label="Menü"
        >
          <Menu size={18} />
        </button>
      )}

      {/* Current page / project context */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={() => setProjectMenuOpen((v) => !v)}
          onBlur={() => setTimeout(() => setProjectMenuOpen(false), 150)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-bg2 text-sm transition-colors relative"
        >
          <FolderKanban size={14} className="text-text3" />
          <span className="text-text3 hidden lg:inline">Proje:</span>
          <strong className="text-text font-semibold">{currentProject?.name ?? "—"}</strong>
          <ChevronDown size={14} className={cn("text-text3 transition-transform", projectMenuOpen && "rotate-180")} />
          {projectMenuOpen && (
            <div className="absolute top-10 left-0 z-40">
              <ProjectDropdown
                projects={projects}
                currentId={currentProject?.id}
                onPick={(id) => {
                  setCurrentProject(id);
                  setProjectMenuOpen(false);
                }}
              />
            </div>
          )}
        </button>

        {/* Page title on mobile */}
        <div className="md:hidden flex-1 min-w-0">
          {currentNav ? (
            <div className="text-sm font-bold text-text truncate">{currentNav.label}</div>
          ) : (
            <div className="text-sm font-bold text-text truncate">{currentProject?.name}</div>
          )}
        </div>
      </div>

      {/* Stats — desktop only */}
      {currentProject && stats && (
        <div className="hidden lg:flex items-center gap-5 px-4">
          <Stat label="Plan" value={`${(stats.planPct * 100).toFixed(1)}%`} valueClass="text-planned" />
          <Stat label="Real" value={`${(stats.realPct * 100).toFixed(1)}%`} valueClass="text-realized" />
          <Stat label="SPI" value={stats.spi == null ? "—" : stats.spi.toFixed(3)} valueClass={spiClass} />
        </div>
      )}

      {/* Mobile SPI badge */}
      {currentProject && stats?.spi != null && (
        <div className="lg:hidden font-mono text-xs px-2.5 py-1 rounded-md bg-bg2 border border-border">
          <span className="text-text3">SPI </span>
          <span className={spiClass}>{stats.spi.toFixed(2)}</span>
        </div>
      )}

      <div className="flex items-center gap-1 sm:gap-2">
        <button className="relative p-2 rounded-lg hover:bg-bg3 text-text2 hover:text-text transition-colors">
          <Bell size={18} />
          {notifications.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red ring-2 ring-white" />
          )}
        </button>
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            onBlur={() => setTimeout(() => setUserMenuOpen(false), 150)}
            className="flex items-center gap-2.5 pl-1 pr-2 sm:pr-3 py-1 rounded-lg hover:bg-bg2 transition-colors"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)" }}
            >
              {userInitial}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-text leading-tight">{currentUser?.fullName ?? "—"}</div>
              <div className="text-[10px] text-text3 leading-tight">{currentUser?.isSuperAdmin ? "Yönetici" : "Kullanıcı"}</div>
            </div>
            <ChevronDown size={14} className="text-text3 hidden sm:block" />
          </button>
          {userMenuOpen && (
            <div className="absolute top-12 right-0 min-w-[200px] py-1 rounded-xl bg-white border border-border shadow-medium z-40">
              <Link href="/account" className="flex items-center gap-2 px-3 py-2 text-sm text-text2 hover:bg-bg2 hover:text-text">
                <UserIcon size={14} /> Profilim
              </Link>
              <div className="border-t border-border my-1" />
              <Link href="/login" className="flex items-center gap-2 px-3 py-2 text-sm text-text2 hover:bg-bg2 hover:text-text">
                <LogOut size={14} /> Çıkış
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-wider font-bold text-text3">{label}</span>
      <span className={cn("font-mono text-sm font-bold tabular-nums", valueClass)}>{value}</span>
    </div>
  );
}

function ProjectDropdown({
  projects,
  currentId,
  onPick,
}: {
  projects: { id: string; name: string; location: string }[];
  currentId?: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="min-w-[280px] py-1 rounded-xl bg-white border border-border shadow-medium">
      {projects.map((p) => (
        <button
          key={p.id}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(p.id)}
          className={cn(
            "block w-full text-left px-3 py-2 text-sm hover:bg-bg2 transition-colors",
            p.id === currentId ? "text-accent bg-accent/5" : "text-text2"
          )}
        >
          <div className="font-semibold">{p.name}</div>
          <div className="text-[11px] text-text3">{p.location}</div>
        </button>
      ))}
      <div className="border-t border-border my-1" />
      <Link href="/projects" className="block px-3 py-2 text-sm text-accent font-semibold hover:bg-bg2">
        + Tüm projeler / yeni proje
      </Link>
    </div>
  );
}

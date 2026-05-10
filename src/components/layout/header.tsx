"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { useStore, useCurrentProject, useCurrentUser } from "@/lib/store";
import { computeProgress } from "@/lib/calc/progress";
import { formatDate, spiLevel } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Header() {
  const projects = useStore((s) => s.projects);
  const currentProject = useCurrentProject();
  const setCurrentProject = useStore((s) => s.setCurrentProject);
  const wbsAll = useStore((s) => s.wbs);
  const plannedAll = useStore((s) => s.planned);
  const realizedAll = useStore((s) => s.realized);
  const currentUser = useCurrentUser();
  const notifications = useStore((s) => s.notifications).filter((n) => !n.readAt);

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

  return (
    <header className="sticky top-0 z-30 h-15 px-4 sm:px-6 flex items-center gap-3 sm:gap-5 bg-gradient-to-r from-bg2/95 to-bg3/95 border-b border-accent/15 backdrop-blur-xl shadow-[0_1px_0_rgba(0,212,255,0.1),0_4px_30px_rgba(0,0,0,0.4)]">
      <Link
        href="/dashboard"
        className="font-display text-lg sm:text-xl font-extrabold tracking-[3px] text-accent text-glow-cyan whitespace-nowrap"
      >
        GES TAKİP
      </Link>

      {/* Project selector */}
      <div className="relative hidden md:block border-l border-border pl-4">
        <button
          onClick={() => setProjectMenuOpen((v) => !v)}
          onBlur={() => setTimeout(() => setProjectMenuOpen(false), 150)}
          className="flex items-center gap-2 text-xs text-text2 hover:text-text transition-colors"
        >
          <span className="text-text3">Proje:</span>
          <strong className="text-text font-medium">
            {currentProject?.name ?? "—"}
          </strong>
          <ChevronDown size={14} className={cn("transition-transform", projectMenuOpen && "rotate-180")} />
        </button>
        {projectMenuOpen && (
          <div className="absolute top-10 left-0 min-w-[260px] py-1 rounded-lg bg-bg2 border border-border2 shadow-2xl">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setCurrentProject(p.id);
                  setProjectMenuOpen(false);
                }}
                className={cn(
                  "block w-full text-left px-3 py-2 text-xs hover:bg-bg3 transition-colors",
                  p.id === currentProject?.id ? "text-accent" : "text-text2"
                )}
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-[10px] text-text3">{p.location}</div>
              </button>
            ))}
            <div className="border-t border-border my-1" />
            <Link
              href="/projects"
              className="block px-3 py-2 text-xs text-accent hover:bg-bg3"
            >
              + Tüm projeler / yeni proje
            </Link>
          </div>
        )}
      </div>

      {/* Stats */}
      {currentProject && stats && (
        <div className="ml-auto hidden lg:flex items-center gap-6">
          <Stat label="Rapor Günü" value={formatDate(currentProject.reportDate)} />
          <Stat label="Plan %" value={`${(stats.planPct * 100).toFixed(1)}%`} valueClass="text-planned" />
          <Stat label="Real %" value={`${(stats.realPct * 100).toFixed(1)}%`} valueClass="text-realized" />
          <Stat
            label="SPI"
            value={stats.spi == null ? "—" : stats.spi.toFixed(3)}
            valueClass={spiClass}
          />
        </div>
      )}

      {/* Right side: notifications + user */}
      <div className={cn("flex items-center gap-2", !currentProject && "ml-auto")}>
        <button className="relative p-2 rounded-md hover:bg-bg3 text-text2 hover:text-text transition-colors">
          <Bell size={16} />
          {notifications.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red text-[10px] font-bold text-white flex items-center justify-center">
              {notifications.length}
            </span>
          )}
        </button>
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            onBlur={() => setTimeout(() => setUserMenuOpen(false), 150)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-bg3 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
              <UserIcon size={14} />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-medium text-text">{currentUser?.fullName ?? "—"}</div>
              <div className="text-[10px] text-text3">{currentUser?.isSuperAdmin ? "Süper Admin" : "Kullanıcı"}</div>
            </div>
          </button>
          {userMenuOpen && (
            <div className="absolute top-12 right-0 min-w-[200px] py-1 rounded-lg bg-bg2 border border-border2 shadow-2xl">
              <Link
                href="/account"
                className="block px-3 py-2 text-xs text-text2 hover:bg-bg3"
              >
                Profilim
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-2 px-3 py-2 text-xs text-text2 hover:bg-bg3"
              >
                <LogOut size={14} /> Çıkış
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="text-right">
      <div className="text-[9px] uppercase tracking-[2px] font-display text-text3">{label}</div>
      <div className={cn("font-mono text-sm font-semibold", valueClass)}>{value}</div>
    </div>
  );
}

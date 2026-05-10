"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Globe, ArrowUpDown, MapPin, TrendingUp } from "lucide-react";
import { useStore, useCurrentUser } from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle, KpiCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { computeProgress } from "@/lib/calc/progress";
import { formatDate, formatPct, spiLevel, cn, daysBetween } from "@/lib/utils";

export default function PortfolioPage() {
  const user = useCurrentUser();
  const projects = useStore((s) => s.projects);
  const allWbs = useStore((s) => s.wbs);
  const allPlanned = useStore((s) => s.planned);
  const allRealized = useStore((s) => s.realized);
  const lookahead = useStore((s) => s.lookahead);
  const setCurrentProject = useStore((s) => s.setCurrentProject);

  const [sortBy, setSortBy] = useState<"name" | "spi" | "progress">("spi");

  const rows = useMemo(() => {
    return projects.map((p) => {
      const items = allWbs
        .filter((w) => w.projectId === p.id && !w.deletedAt)
        .map((w) => ({ code: w.code, isLeaf: w.isLeaf, quantity: w.quantity, weight: w.weight }));
      const planned = allPlanned[p.id] || {};
      const realized = allRealized[p.id] || {};
      const { planPct, realPct, spi } = computeProgress(items, planned, realized, p.reportDate);
      const elapsed = Math.max(0, daysBetween(p.startDate, p.reportDate) + 1);
      const critOpen = lookahead.filter((l) => l.projectId === p.id && !l.done && l.priority === "critical").length;
      return { project: p, planPct, realPct, spi, elapsed, criticalOpen: critOpen };
    });
  }, [projects, allWbs, allPlanned, allRealized, lookahead]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (sortBy === "name") return a.project.name.localeCompare(b.project.name);
      if (sortBy === "spi") {
        const aSpi = a.spi ?? 1;
        const bSpi = b.spi ?? 1;
        return aSpi - bSpi; // en kritik (düşük SPI) en üstte
      }
      return a.realPct - b.realPct;
    });
  }, [rows, sortBy]);

  const totals = useMemo(() => {
    const active = rows.filter((r) => r.project.status === "active").length;
    const avgSpi = rows.filter((r) => r.spi != null).reduce((s, r, _, arr) => s + (r.spi! / arr.length), 0);
    const avgReal =
      rows.length > 0
        ? rows.reduce((s, r) => s + r.realPct, 0) / rows.length
        : 0;
    return { total: rows.length, active, avgSpi, avgReal };
  }, [rows]);

  if (!user?.isSuperAdmin) {
    return (
      <Card>
        <CardTitle>Yetki Yok</CardTitle>
        <Alert variant="warning">Portfolio Dashboard sadece Süper Admin tarafından erişilebilir.</Alert>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title="Portfolio Dashboard"
        description="Tüm projelerin tek-bakışta sağlık görünümü"
        icon={Globe}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Toplam Proje" value={`${totals.total}`} sub={`${totals.active} aktif`} />
        <KpiCard
          label="Ort. SPI"
          value={totals.avgSpi ? totals.avgSpi.toFixed(3) : "—"}
          valueClassName={
            totals.avgSpi >= 0.95 ? "text-green" : totals.avgSpi >= 0.8 ? "text-yellow" : "text-red"
          }
        />
        <KpiCard
          label="Ort. İlerleme"
          value={formatPct(totals.avgReal, 1)}
          valueClassName="text-realized"
        />
        <KpiCard
          label="Görüntüleme"
          value={`${user.fullName}`}
          sub="Süper Admin"
          valueClassName="!text-sm !leading-tight"
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-sm font-bold text-text uppercase tracking-wider">
          Proje Listesi
        </h2>
        <button
          onClick={() => setSortBy((s) => (s === "spi" ? "name" : s === "name" ? "progress" : "spi"))}
          className="flex items-center gap-1.5 text-xs text-text2 hover:text-text"
        >
          <ArrowUpDown size={12} />
          Sırala: {sortBy === "spi" ? "Kritik" : sortBy === "name" ? "İsim" : "İlerleme"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedRows.map((r) => {
          const lvl = spiLevel(r.spi);
          return (
            <Link
              key={r.project.id}
              href="/dashboard"
              onClick={() => setCurrentProject(r.project.id)}
              className={cn(
                "block rounded-xl p-5 border transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
                "bg-gradient-to-br from-bg3/90 to-bg2/90 border-border2/80",
                lvl === "bad" && "border-red/40 hover:border-red/60",
                lvl === "warn" && "border-yellow/30 hover:border-yellow/50",
                lvl === "good" && "border-green/30 hover:border-green/50"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <div className="font-display font-bold text-base text-text truncate">
                    {r.project.name}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-text3 mt-0.5">
                    <MapPin size={11} />
                    {r.project.location}
                  </div>
                </div>
                <Badge
                  variant={
                    r.project.status === "active"
                      ? "green"
                      : r.project.status === "completed"
                      ? "blue"
                      : "gray"
                  }
                >
                  {r.project.status}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 my-4">
                <div>
                  <div className="text-[9px] uppercase tracking-wider font-display text-text3 mb-0.5">
                    Plan
                  </div>
                  <div className="font-mono text-sm text-planned">{formatPct(r.planPct, 0)}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider font-display text-text3 mb-0.5">
                    Real
                  </div>
                  <div className="font-mono text-sm text-realized">{formatPct(r.realPct, 0)}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider font-display text-text3 mb-0.5">
                    SPI
                  </div>
                  <div
                    className={cn(
                      "font-mono text-sm",
                      lvl === "good" && "text-green",
                      lvl === "warn" && "text-yellow",
                      lvl === "bad" && "text-red"
                    )}
                  >
                    {r.spi == null ? "—" : r.spi.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="h-1.5 bg-bg4 rounded-full overflow-hidden mb-2 relative">
                <div
                  className="absolute h-full bg-planned/50"
                  style={{ width: `${r.planPct * 100}%` }}
                />
                <div className="absolute h-full bg-realized" style={{ width: `${r.realPct * 100}%` }} />
              </div>

              <div className="flex items-center justify-between text-[11px] text-text3">
                <span>📅 {formatDate(r.project.reportDate)}</span>
                {r.criticalOpen > 0 && (
                  <Badge variant="red">{r.criticalOpen} kritik</Badge>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {rows.length === 0 && (
        <Card>
          <CardTitle>Proje yok</CardTitle>
          <p className="text-sm text-text2">Henüz proje oluşturulmamış.</p>
        </Card>
      )}
    </>
  );
}

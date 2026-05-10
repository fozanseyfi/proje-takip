"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Truck,
  Activity,
  ArrowRight,
} from "lucide-react";
import {
  useStore,
  useCurrentProject,
  useProjectWbs,
  useProjectPlanned,
  useProjectRealized,
} from "@/lib/store";
import { computeProgress, buildSCurve } from "@/lib/calc/progress";
import { Card, CardTitle, KpiCard } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { SCurveChart } from "@/components/charts/s-curve-chart";
import { formatDate, daysBetween, spiLevel } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";

export default function DashboardPage() {
  const project = useCurrentProject();
  const wbs = useProjectWbs(project?.id);
  const planned = useProjectPlanned(project?.id);
  const realized = useProjectRealized(project?.id);
  const personnelAttendance = useStore((s) => s.personnelAttendance);
  const machineAttendance = useStore((s) => s.machineAttendance);
  const lookahead = useStore((s) => s.lookahead);

  const stats = useMemo(() => {
    if (!project)
      return { planPct: 0, realPct: 0, spi: null as number | null, sCurve: [] as ReturnType<typeof buildSCurve> };
    const items = wbs.map((w) => ({
      code: w.code,
      isLeaf: w.isLeaf,
      quantity: w.quantity,
      weight: w.weight,
    }));
    const { planPct, realPct, spi } = computeProgress(items, planned, realized, project.reportDate);
    const sCurve = buildSCurve(items, planned, realized, project.reportDate);
    return { planPct, realPct, spi, sCurve };
  }, [project, wbs, planned, realized]);

  if (!project) return <NoProject />;

  const elapsed = Math.max(0, daysBetween(project.startDate, project.reportDate) + 1);
  const remaining = Math.max(0, project.durationDays - elapsed);
  const spiL = spiLevel(stats.spi);

  // Bugünkü puantaj sayıları
  const today = project.reportDate;
  const personnelToday = personnelAttendance.filter(
    (a) => a.projectId === project.id && a.date === today && a.present
  ).length;
  const machinesToday = machineAttendance.filter(
    (a) => a.projectId === project.id && a.date === today && a.present
  ).length;

  // Açık kritik işler
  const criticalOpen = lookahead.filter(
    (l) => l.projectId === project.id && !l.done && l.priority === "critical"
  ).length;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${project.name} — ${project.location}`}
        icon={LayoutDashboard}
      />

      {/* KPI'lar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <KpiCard
          label="Planlanan %"
          value={`${(stats.planPct * 100).toFixed(1)}%`}
          sub={`Rapor: ${formatDate(project.reportDate)}`}
          barPct={stats.planPct * 100}
          barColor="var(--planned)"
          valueClassName="text-planned"
        />
        <KpiCard
          label="Gerçekleşen %"
          value={`${(stats.realPct * 100).toFixed(1)}%`}
          sub={
            <span className="flex items-center gap-1">
              {stats.realPct >= stats.planPct ? (
                <><TrendingUp size={11} className="text-green" /> Planın üzerinde</>
              ) : (
                <><TrendingDown size={11} className="text-red" /> Planın altında</>
              )}
            </span>
          }
          barPct={stats.realPct * 100}
          barColor="var(--realized)"
          valueClassName="text-realized"
        />
        <KpiCard
          label="SPI"
          value={stats.spi == null ? "—" : stats.spi.toFixed(3)}
          sub={
            spiL === "good"
              ? "İyi (>= 0.95)"
              : spiL === "warn"
              ? "Uyarı (0.80 — 0.95)"
              : spiL === "bad"
              ? "Kritik (< 0.80)"
              : "Veri yok"
          }
          valueClassName={
            spiL === "good" ? "text-green" : spiL === "warn" ? "text-yellow" : spiL === "bad" ? "text-red" : ""
          }
        />
        <KpiCard
          label="Geçen / Kalan"
          value={`${elapsed} / ${remaining}`}
          sub={`${project.durationDays} gün hedef`}
          barPct={(elapsed / project.durationDays) * 100}
          barColor="var(--accent)"
        />
      </div>

      {/* Critical alert */}
      {criticalOpen > 0 && (
        <Alert variant="error" className="mb-4">
          <strong>{criticalOpen}</strong> açık kritik iş var.{" "}
          <Link href="/lookahead" className="underline">
            15-Gün Kritik İşler &rarr;
          </Link>
        </Alert>
      )}

      {/* S-Curve */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <CardTitle>S-Eğrisi (Plan vs Gerçekleşme)</CardTitle>
          <div className="flex items-center gap-4 text-[11px] text-text3">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-planned" /> Planlanan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-realized" /> Gerçekleşen
            </span>
          </div>
        </div>
        {stats.sCurve.length > 0 ? (
          <SCurveChart data={stats.sCurve} reportDate={project.reportDate} />
        ) : (
          <div className="h-48 flex items-center justify-center text-text3 text-sm">
            Henüz planlama / gerçekleşme verisi yok.{" "}
            <Link href="/planning" className="ml-2 text-accent underline">
              Planlamaya geç
            </Link>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickInfo
          title="Bugün Sahada"
          icon={<Users size={18} />}
          value={`${personnelToday}`}
          sub="çalışan personel"
          href="/personnel"
        />
        <QuickInfo
          title="Bugün Makine"
          icon={<Truck size={18} />}
          value={`${machinesToday}`}
          sub="aktif makine"
          href="/machines"
        />
        <QuickInfo
          title="15-Gün Kritik"
          icon={<Activity size={18} />}
          value={`${lookahead.filter((l) => l.projectId === project.id && !l.done).length}`}
          sub="açık iş"
          href="/lookahead"
        />
      </div>

      <Card className="mt-6">
        <CardTitle>Proje Bilgisi</CardTitle>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <InfoItem label="Başlangıç" value={formatDate(project.startDate)} />
          <InfoItem label="Planlanan Bitiş" value={formatDate(project.plannedEnd)} />
          <InfoItem label="Sözleşme Bitiş" value={formatDate(project.contractEnd)} />
          <InfoItem label="Süre" value={`${project.durationDays} gün`} />
          <InfoItem label="Konum" value={project.location} />
          <InfoItem label="Kurulu Güç" value={project.installedCapacityMw ? `${project.installedCapacityMw} MW` : "—"} />
          <InfoItem label="Toplam Bütçe" value={project.totalBudget ? `${project.totalBudget.toLocaleString("tr-TR")} ${project.budgetCurrency}` : "—"} />
          <InfoItem label="Durum" value={project.status} />
        </dl>
      </Card>
    </>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider font-display text-text3">{label}</dt>
      <dd className="text-text font-medium">{value}</dd>
    </div>
  );
}

function QuickInfo({
  title,
  icon,
  value,
  sub,
  href,
}: {
  title: string;
  icon: React.ReactNode;
  value: string;
  sub: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl bg-bg3/60 border border-border2 hover:border-accent/30 p-5 transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase font-display tracking-wider text-text3">{title}</div>
        <span className="text-text3 group-hover:text-accent transition-colors">{icon}</span>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-mono font-bold text-text">{value}</span>
        <span className="text-xs text-text3">{sub}</span>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-accent uppercase tracking-wider font-display opacity-0 group-hover:opacity-100 transition-opacity">
        Detay <ArrowRight size={10} />
      </div>
    </Link>
  );
}

function NoProject() {
  return (
    <Card>
      <CardTitle>Proje Seçilmedi</CardTitle>
      <p className="text-sm text-text2">
        Aktif proje yok.{" "}
        <Link href="/projects" className="text-accent underline">
          Tüm projeler →
        </Link>
      </p>
    </Card>
  );
}

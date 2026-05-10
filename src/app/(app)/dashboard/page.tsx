"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Truck,
  Activity,
  ArrowRight,
  Zap,
  Sun,
  MapPin,
  Calendar,
  Target,
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
import { SCurveChart } from "@/components/charts/s-curve-chart";
import { formatDate, daysBetween, spiLevel, cn } from "@/lib/utils";
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

  const today = project.reportDate;
  const personnelToday = personnelAttendance.filter(
    (a) => a.projectId === project.id && a.date === today && a.present
  ).length;
  const machinesToday = machineAttendance.filter(
    (a) => a.projectId === project.id && a.date === today && a.present
  ).length;

  const criticalOpen = lookahead.filter(
    (l) => l.projectId === project.id && !l.done && l.priority === "critical"
  ).length;

  return (
    <>
      {/* HERO — kurumsal light */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-border bg-white shadow-soft animate-slide-up">
        {/* Soft branded gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-white to-accent3/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent3/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative px-6 sm:px-8 py-6 sm:py-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-bold tracking-[1.5px] uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Aktif Proje
              </span>
              <span className="text-xs text-text3">{formatDate(project.reportDate)} raporu</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-text leading-tight tracking-tight">
              {project.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-text2">
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="text-text3" />
                {project.location}
              </span>
              {project.installedCapacityMw != null && (
                <span className="flex items-center gap-1.5">
                  <Sun size={14} className="text-accent3" />
                  <span className="font-mono font-semibold">{project.installedCapacityMw}</span> MW
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-text3" />
                {formatDate(project.startDate)} → {formatDate(project.plannedEnd)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:flex lg:items-center lg:gap-3">
            <div className={cn(
              "px-5 py-3 rounded-xl border bg-white shadow-soft text-center",
              spiL === "good" && "border-green/30 bg-green/5",
              spiL === "warn" && "border-yellow/30 bg-yellow/5",
              spiL === "bad" && "border-red/30 bg-red/5",
              !spiL && "border-border"
            )}>
              <div className="text-[9px] uppercase tracking-[1.5px] font-display text-text3 font-semibold">SPI</div>
              <div className={cn(
                "font-mono text-2xl font-bold leading-tight mt-0.5",
                spiL === "good" && "text-green",
                spiL === "warn" && "text-yellow",
                spiL === "bad" && "text-red",
                !spiL && "text-text3"
              )}>
                {stats.spi == null ? "—" : stats.spi.toFixed(3)}
              </div>
            </div>
            <div className="px-5 py-3 rounded-xl border border-border bg-white shadow-soft text-center">
              <div className="text-[9px] uppercase tracking-[1.5px] font-display text-text3 font-semibold">Geçen · Kalan</div>
              <div className="font-mono text-2xl font-bold leading-tight mt-0.5 text-text">
                {elapsed}
                <span className="text-text3 mx-1">/</span>
                <span className="text-text2">{remaining}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="animate-slide-up-delay-1">
          <KpiCard
            label="Planlanan İlerleme"
            value={`${(stats.planPct * 100).toFixed(1)}%`}
            sub={`Rapor: ${formatDate(project.reportDate)}`}
            barPct={stats.planPct * 100}
            barColor="var(--planned)"
            valueClassName="text-planned"
            icon={<Target size={16} />}
          />
        </div>
        <div className="animate-slide-up-delay-2">
          <KpiCard
            label="Gerçekleşen İlerleme"
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
            icon={<Zap size={16} />}
          />
        </div>
        <div className="animate-slide-up-delay-3">
          <KpiCard
            label="Bugün Sahada"
            value={`${personnelToday}`}
            sub={<span className="text-text3">aktif personel</span>}
            icon={<Users size={16} />}
          />
        </div>
        <div className="animate-slide-up-delay-4">
          <KpiCard
            label="Bugün Makine"
            value={`${machinesToday}`}
            sub={<span className="text-text3">aktif ekipman</span>}
            icon={<Truck size={16} />}
          />
        </div>
      </div>

      {criticalOpen > 0 && (
        <Alert variant="error" className="mb-4 animate-pulse-glow">
          <strong>{criticalOpen}</strong> açık kritik iş var.{" "}
          <Link href="/lookahead" className="underline ml-1">
            15-Gün Kritik İşler →
          </Link>
        </Alert>
      )}

      <Card className="mb-6 animate-slide-up">
        <div className="flex items-center justify-between mb-2">
          <CardTitle>S-Eğrisi · Plan vs Gerçekleşme</CardTitle>
          <div className="flex items-center gap-4 text-[11px] text-text2">
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
          <div className="h-48 flex flex-col items-center justify-center text-text3 text-sm gap-2 border-2 border-dashed border-border rounded-lg">
            <Activity size={28} className="text-text3" />
            <span>Henüz planlama / gerçekleşme verisi yok</span>
            <Link href="/planning" className="text-accent text-xs font-semibold hover:underline">
              Planlamaya geç →
            </Link>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up">
        <QuickInfo
          title="Personel"
          icon={<Users size={18} />}
          value={`${personnelToday}`}
          sub="bugün sahada"
          href="/personnel"
          color="blue"
        />
        <QuickInfo
          title="Makine"
          icon={<Truck size={18} />}
          value={`${machinesToday}`}
          sub="aktif ekipman"
          href="/machines"
          color="purple"
        />
        <QuickInfo
          title="Kritik İşler"
          icon={<Activity size={18} />}
          value={`${lookahead.filter((l) => l.projectId === project.id && !l.done).length}`}
          sub="açık iş"
          href="/lookahead"
          color="amber"
        />
      </div>

      <Card className="mt-6 animate-slide-up">
        <CardTitle>Proje Künyesi</CardTitle>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 text-sm">
          <InfoItem label="Başlangıç" value={formatDate(project.startDate)} />
          <InfoItem label="Planlanan Bitiş" value={formatDate(project.plannedEnd)} />
          <InfoItem label="Sözleşme Bitiş" value={formatDate(project.contractEnd)} />
          <InfoItem label="Süre" value={`${project.durationDays} gün`} />
          <InfoItem label="Konum" value={project.location} />
          <InfoItem label="Kurulu Güç" value={project.installedCapacityMw ? `${project.installedCapacityMw} MW` : "—"} />
          <InfoItem
            label="Toplam Bütçe"
            value={project.totalBudget ? `${project.totalBudget.toLocaleString("tr-TR")} ${project.budgetCurrency}` : "—"}
          />
          <InfoItem label="Durum" value={<span className="capitalize">{project.status}</span>} />
        </dl>
      </Card>
    </>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider font-display text-text3 font-semibold mb-1">{label}</dt>
      <dd className="text-text font-semibold">{value}</dd>
    </div>
  );
}

const colorMap: Record<string, { ring: string; iconBg: string; iconText: string }> = {
  blue: { ring: "hover:border-blue/40", iconBg: "bg-blue/10", iconText: "text-blue" },
  purple: { ring: "hover:border-purple/40", iconBg: "bg-purple/10", iconText: "text-purple" },
  amber: { ring: "hover:border-yellow/40", iconBg: "bg-yellow/10", iconText: "text-yellow" },
};

function QuickInfo({
  title,
  icon,
  value,
  sub,
  href,
  color = "blue",
}: {
  title: string;
  icon: React.ReactNode;
  value: string;
  sub: string;
  href: string;
  color?: string;
}) {
  const c = colorMap[color];
  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-xl bg-white border border-border p-5 shadow-soft transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-medium",
        c.ring
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase font-display tracking-wider text-text3 font-semibold">{title}</div>
        <span className={cn("inline-flex items-center justify-center w-9 h-9 rounded-lg", c.iconBg, c.iconText)}>{icon}</span>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-mono font-bold text-text">{value}</span>
        <span className="text-xs text-text2">{sub}</span>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-accent uppercase tracking-wider font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
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
        <Link href="/projects" className="text-accent font-semibold hover:underline">
          Tüm projeler →
        </Link>
      </p>
    </Card>
  );
}

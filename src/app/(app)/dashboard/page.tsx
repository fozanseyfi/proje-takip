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
  Sun,
  MapPin,
  Calendar,
  Target,
  Zap,
  Telescope,
  ListChecks,
  ShoppingCart,
  Receipt,
  Camera,
  Clock,
  AlertTriangle,
  FileText,
  Building2,
} from "lucide-react";
import {
  useStore,
  useCurrentProject,
  useProjectWbs,
  useProjectPlanned,
  useProjectRealized,
} from "@/lib/store";
import { computeProgress, buildSCurve, getAllDates } from "@/lib/calc/progress";
import {
  computeSectionProgress,
  buildSectionSCurve,
  headcountByDate,
  machineCountByDate,
  manhourByDiscipline,
  getDisciplineLabel,
  billingSummary,
  procurementFollowup,
} from "@/lib/calc/sections";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { SCurveChart } from "@/components/charts/s-curve-chart";
import { MiniSCurve } from "@/components/charts/section-scurve";
import { HeadcountBar } from "@/components/charts/headcount-bar";
import { TrendLine } from "@/components/charts/trend-line";
import { BillingDetailWidget } from "@/components/dashboard/billing-detail";
import { ManhourDetailWidget } from "@/components/dashboard/manhour-detail";
import {
  formatDate,
  daysBetween,
  spiLevel,
  cn,
  toISODate,
  addDays,
  formatMoney,
  formatNumber,
} from "@/lib/utils";

export default function DashboardPage() {
  const project = useCurrentProject();
  const wbs = useProjectWbs(project?.id);
  const planned = useProjectPlanned(project?.id);
  const realized = useProjectRealized(project?.id);
  const personnelAttendance = useStore((s) => s.personnelAttendance);
  const machineAttendance = useStore((s) => s.machineAttendance);
  const personnel = useStore((s) => s.personnelMaster).filter((p) => !p.deletedAt);
  const procurement = useStore((s) => s.procurement);
  const billing = useStore((s) => s.billing);
  const lookahead = useStore((s) => s.lookahead);
  const dailyReports = useStore((s) => s.dailyReports);

  if (!project) {
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

  const stats = useMemo(() => {
    const items = wbs.map((w) => ({
      code: w.code,
      isLeaf: w.isLeaf,
      quantity: w.quantity,
      weight: w.weight,
    }));
    const { planPct, realPct, spi } = computeProgress(items, planned, realized, project.reportDate);
    const sCurve = buildSCurve(items, planned, realized, project.reportDate);
    const sections = computeSectionProgress(wbs, planned, realized, project.reportDate, 1);
    const allDates = getAllDates(planned, realized);
    return { planPct, realPct, spi, sCurve, sections, allDates };
  }, [wbs, planned, realized, project.reportDate]);

  const elapsed = Math.max(0, daysBetween(project.startDate, project.reportDate) + 1);
  const remaining = Math.max(0, project.durationDays - elapsed);
  const spiL = spiLevel(stats.spi);

  const today = project.reportDate;
  const projectId = project.id;

  // Bugün metrikleri
  const personnelTodayList = personnelAttendance.filter(
    (a) => a.projectId === projectId && a.date === today && a.present
  );
  const personnelToday = personnelTodayList.length;
  const machinesTodayList = machineAttendance.filter(
    (a) => a.projectId === projectId && a.date === today && a.present
  );
  const machinesToday = machinesTodayList.length;

  // To-date toplam
  const allPersonnelAttForProject = personnelAttendance.filter(
    (a) => a.projectId === projectId && a.present
  );
  const totalManhours = allPersonnelAttForProject.reduce((s, a) => s + (a.hours || 0), 0);
  const totalManDays = totalManhours / 9;
  const uniquePersonnel = new Set(allPersonnelAttForProject.map((a) => a.personnelMasterId)).size;

  const allMachineAttForProject = machineAttendance.filter(
    (a) => a.projectId === projectId && a.present
  );
  const totalMachineHours = allMachineAttForProject.reduce((s, a) => s + (a.hours || 0), 0);
  const uniqueMachines = new Set(allMachineAttForProject.map((a) => a.machineMasterId)).size;

  // Son 7 gün headcount
  const last7Days = headcountByDate(
    personnelAttendance,
    projectId,
    toISODate(addDays(today, -6)),
    today
  );

  // Son 30 gün trendler
  const last30Personnel = headcountByDate(
    personnelAttendance,
    projectId,
    toISODate(addDays(today, -29)),
    today
  );
  const last30Machines = machineCountByDate(
    machineAttendance,
    projectId,
    toISODate(addDays(today, -29)),
    today
  );

  // Procurement follow-up
  const procFollow = procurementFollowup(
    procurement.filter((p) => p.projectId === projectId),
    today
  );

  // 15-Gün kritik işler
  const fifteen = toISODate(addDays(today, 15));
  const lookahead15 = lookahead
    .filter((l) => l.projectId === projectId && !l.done && l.date <= fifteen)
    .sort((a, b) => a.date.localeCompare(b.date));
  const openActions = lookahead.filter((l) => l.projectId === projectId && !l.done);
  const criticalOpen = openActions.filter((l) => l.priority === "critical").length;

  // Son 5 gün faaliyet
  const fiveDaysAgo = toISODate(addDays(today, -4));
  const recentRealizations: { date: string; code: string; qty: number; unit: string; name: string }[] = [];
  for (const [code, byDate] of Object.entries(planned)) {
    void code;
    void byDate;
  }
  for (const [code, byDate] of Object.entries(realized)) {
    for (const [d, qty] of Object.entries(byDate)) {
      if (d >= fiveDaysAgo && d <= today) {
        const w = wbs.find((x) => x.code === code);
        if (w) recentRealizations.push({ date: d, code, qty, unit: w.unit, name: w.name });
      }
    }
  }
  recentRealizations.sort((a, b) => b.date.localeCompare(a.date));

  // Drone foto: son daily report'taki ilk foto
  const latestReport = [...dailyReports]
    .filter((d) => d.projectId === projectId)
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate))[0];
  const dronePhoto = latestReport?.photos?.[0];

  return (
    <>
      {/* HERO */}
      <div className="mb-6 animate-slide-up">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[11px] font-bold tracking-tight">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-soft" />
                Aktif
              </span>
              <span className="text-xs text-text3 font-medium">
                Rapor tarihi · {formatDate(project.reportDate)}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-[28px] font-extrabold text-text leading-tight tracking-tight">
              {project.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-text2">
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="text-text3" />
                {project.location}
              </span>
              {project.installedCapacityMw != null && (
                <span className="flex items-center gap-1.5">
                  <Sun size={14} className="text-yellow" />
                  <span className="font-mono font-semibold tabular-nums">{project.installedCapacityMw}</span> MW
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-text3" />
                {formatDate(project.startDate)} → {formatDate(project.plannedEnd)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SpiBlock spi={stats.spi} level={spiL} />
            <div className="px-5 py-3 rounded-xl border border-border bg-white shadow-soft text-center">
              <div className="text-[10px] uppercase tracking-wider font-bold text-text3">Geçen · Kalan</div>
              <div className="font-mono text-2xl font-bold leading-tight mt-0.5 text-text tabular-nums">
                {elapsed}
                <span className="text-text3 mx-1">·</span>
                <span className="text-text2">{remaining}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <KpiBig
          icon={<Target size={16} />}
          iconBg="blue"
          label="Planlanan İlerleme"
          value={`${(stats.planPct * 100).toFixed(1)}%`}
          valueColor="text-planned"
          bar={stats.planPct * 100}
          barColor="var(--planned)"
          delay={1}
        />
        <KpiBig
          icon={<Zap size={16} />}
          iconBg="accent"
          label="Gerçekleşen İlerleme"
          value={`${(stats.realPct * 100).toFixed(1)}%`}
          valueColor="text-realized"
          bar={stats.realPct * 100}
          barColor="var(--realized)"
          sub={
            <span className="flex items-center gap-1">
              {stats.realPct >= stats.planPct ? (
                <><TrendingUp size={11} className="text-green" /> Plan üzerinde</>
              ) : (
                <><TrendingDown size={11} className="text-red" /> Plan altında</>
              )}
            </span>
          }
          delay={2}
        />
        <KpiBig
          icon={<Users size={16} />}
          iconBg="purple"
          label="Personel · Bugün / To-Date"
          value={`${personnelToday}`}
          valueRight={
            <div className="text-right">
              <div className="text-[10px] text-text3 font-bold">TO-DATE</div>
              <div className="font-mono text-base font-bold text-purple tabular-nums">
                {formatNumber(totalManhours, 0)}
                <span className="text-xs text-text3 ml-1">a-s</span>
              </div>
              <div className="text-[10px] text-text3 font-mono">
                {uniquePersonnel} kişi · {formatNumber(totalManDays, 0)} a-g
              </div>
            </div>
          }
          delay={3}
        />
        <KpiBig
          icon={<Truck size={16} />}
          iconBg="amber"
          label="Makine · Bugün / To-Date"
          value={`${machinesToday}`}
          valueRight={
            <div className="text-right">
              <div className="text-[10px] text-text3 font-bold">TO-DATE</div>
              <div className="font-mono text-base font-bold text-yellow tabular-nums">
                {formatNumber(totalMachineHours, 0)}
                <span className="text-xs text-text3 ml-1">m-s</span>
              </div>
              <div className="text-[10px] text-text3 font-mono">{uniqueMachines} makine</div>
            </div>
          }
          delay={4}
        />
      </div>

      {criticalOpen > 0 && (
        <Alert variant="error" className="mb-4">
          <strong>{criticalOpen}</strong> açık kritik iş var.{" "}
          <Link href="/lookahead" className="underline ml-1 font-semibold">
            15-Gün Kritik İşler →
          </Link>
        </Alert>
      )}

      {/* MASTER S-CURVE */}
      <Card className="mb-6 animate-slide-up">
        <div className="flex items-center justify-between mb-2">
          <CardTitle>
            <Activity size={14} className="text-accent" />
            Genel S-Eğrisi · Plan vs Gerçekleşme
          </CardTitle>
          <div className="flex items-center gap-4 text-[11px] text-text2 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-planned rounded-full" /> Planlanan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-realized rounded-full" /> Gerçekleşen
            </span>
          </div>
        </div>
        {stats.sCurve.length > 0 ? (
          <SCurveChart data={stats.sCurve} reportDate={project.reportDate} />
        ) : (
          <EmptyChart label="Henüz planlama / gerçekleşme verisi yok" href="/planning" linkLabel="Planlamaya geç" />
        )}
      </Card>

      {/* SECTION S-CURVES */}
      {stats.sections.length > 0 && (
        <Card className="mb-6 animate-slide-up">
          <CardTitle>
            <Activity size={14} className="text-accent" />
            Bölüm S-Eğrileri · L1
          </CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.sections.map((sec) => {
              const sCurve = buildSectionSCurve(
                wbs,
                planned,
                realized,
                sec.code,
                project.reportDate,
                stats.allDates
              );
              const spiL = spiLevel(sec.spi);
              return (
                <div key={sec.code} className="rounded-xl border border-border p-3 bg-bg2/40">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-bold text-text truncate">
                      <span className="font-mono text-text3 mr-1.5">{sec.code}</span>
                      {sec.name}
                    </div>
                    {sec.spi != null && (
                      <Badge variant={spiL === "good" ? "green" : spiL === "warn" ? "yellow" : "red"}>
                        {sec.spi.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-3 mb-1 text-[11px]">
                    <span className="text-planned font-mono font-semibold">
                      P {(sec.planPct * 100).toFixed(0)}%
                    </span>
                    <span className="text-realized font-mono font-semibold">
                      G {(sec.realPct * 100).toFixed(0)}%
                    </span>
                    <span className="text-text3 ml-auto">{sec.leafCount} kalem</span>
                  </div>
                  {sCurve.length > 0 ? (
                    <MiniSCurve data={sCurve} reportDate={project.reportDate} />
                  ) : (
                    <div className="h-[110px] flex items-center justify-center text-text3 text-[10px]">
                      veri yok
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* İMALAT BÖLÜM ÖZETİ */}
      <Card className="mb-6 animate-slide-up">
        <CardTitle>
          <ListChecks size={14} className="text-accent" />
          İmalat Bölüm Özeti
        </CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="pb-2 text-[10px] uppercase tracking-wider font-bold text-text3">Bölüm</th>
                <th className="pb-2 text-[10px] uppercase tracking-wider font-bold text-text3 text-right">Kalem</th>
                <th className="pb-2 text-[10px] uppercase tracking-wider font-bold text-text3 text-right">Plan</th>
                <th className="pb-2 text-[10px] uppercase tracking-wider font-bold text-text3 text-right">Gerçek</th>
                <th className="pb-2 text-[10px] uppercase tracking-wider font-bold text-text3">İlerleme</th>
                <th className="pb-2 text-[10px] uppercase tracking-wider font-bold text-text3 text-right">SPI</th>
              </tr>
            </thead>
            <tbody>
              {stats.sections.map((sec) => {
                const spiL = spiLevel(sec.spi);
                return (
                  <tr key={sec.code} className="hover:bg-bg2/40">
                    <td className="py-2.5">
                      <span className="font-mono text-xs text-text3 mr-2">{sec.code}</span>
                      <span className="font-semibold">{sec.name}</span>
                    </td>
                    <td className="py-2.5 text-right text-text2 font-mono text-xs tabular-nums">
                      {sec.leafCount}
                    </td>
                    <td className="py-2.5 text-right text-planned font-mono font-semibold tabular-nums">
                      {(sec.planPct * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-right text-realized font-mono font-semibold tabular-nums">
                      {(sec.realPct * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5">
                      <div className="relative h-2 bg-bg3 rounded-full overflow-hidden w-32">
                        <div
                          className="absolute h-full bg-planned/40 rounded-full"
                          style={{ width: `${sec.planPct * 100}%` }}
                        />
                        <div
                          className="absolute h-full bg-realized rounded-full"
                          style={{ width: `${sec.realPct * 100}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 text-right">
                      {sec.spi == null ? (
                        <span className="text-text3 text-xs">—</span>
                      ) : (
                        <Badge variant={spiL === "good" ? "green" : spiL === "warn" ? "yellow" : "red"}>
                          {sec.spi.toFixed(3)}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* HEADCOUNT + TRENDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 animate-slide-up">
        <Card>
          <CardTitle>
            <Users size={14} className="text-accent" />
            Personel Headcount · Son 7 Gün
          </CardTitle>
          {last7Days.some((d) => d.count > 0) ? (
            <HeadcountBar data={last7Days} />
          ) : (
            <EmptyChart label="Son 7 gün puantaj kaydı yok" href="/personnel" linkLabel="Puantaja git" small />
          )}
        </Card>
        <Card>
          <CardTitle>
            <TrendingUp size={14} className="text-accent" />
            Personel Günlük Trend · 30 Gün
          </CardTitle>
          {last30Personnel.some((d) => d.count > 0) ? (
            <TrendLine data={last30Personnel} color="#10b981" fillId="trendGreen" label="Personel" />
          ) : (
            <EmptyChart label="Trend için yeterli veri yok" href="/personnel" linkLabel="Puantaja git" small />
          )}
        </Card>
        <Card>
          <CardTitle>
            <Truck size={14} className="text-accent3" />
            Makine Günlük Trend · 30 Gün
          </CardTitle>
          {last30Machines.some((d) => d.count > 0) ? (
            <TrendLine data={last30Machines} color="#f59e0b" fillId="trendAmber" label="Makine" />
          ) : (
            <EmptyChart label="Trend için yeterli veri yok" href="/machines" linkLabel="Puantaja git" small />
          )}
        </Card>
      </div>

      {/* ADAM-SAAT DETAY (yeni) */}
      <div className="mb-6 animate-slide-up">
        <ManhourDetailWidget />
      </div>

      {/* FATURALANDIRMA DETAY (yeni) */}
      <div className="mb-6 animate-slide-up">
        <BillingDetailWidget />
      </div>

      {/* PROCUREMENT + LOOKAHEAD-15 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 animate-slide-up">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="mb-0">
              <ShoppingCart size={14} className="text-accent" />
              Procurement Takibi
            </CardTitle>
            <Link href="/procurement" className="text-[11px] text-accent font-bold hover:underline">
              Tümü →
            </Link>
          </div>
          {procFollow.length === 0 ? (
            <p className="text-sm text-text3 py-4 text-center">Yolda/siparişte malzeme yok.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {procFollow.slice(0, 8).map((p) => (
                <div
                  key={p.item.id}
                  className={cn(
                    "flex items-start justify-between gap-2 p-2.5 rounded-lg border",
                    p.overdue ? "border-red/20 bg-red/5" : "border-border bg-white"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{p.item.material}</div>
                    <div className="text-[11px] text-text3 truncate">
                      {p.item.category} · {p.item.supplier ?? "—"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={p.item.status === "yolda" ? "blue" : "yellow"}>
                      {p.item.status}
                    </Badge>
                    <div className={cn("text-[10px] mt-0.5 font-mono", p.overdue ? "text-red" : "text-text3")}>
                      {p.daysUntilExpected == null
                        ? "tarih yok"
                        : p.overdue
                        ? `${-p.daysUntilExpected}g gecikme`
                        : `${p.daysUntilExpected}g kaldı`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="mb-0">
              <Telescope size={14} className="text-accent" />
              15 Günün Kritik İşleri
            </CardTitle>
            <Link href="/lookahead" className="text-[11px] text-accent font-bold hover:underline">
              Tümü →
            </Link>
          </div>
          {lookahead15.length === 0 ? (
            <p className="text-sm text-text3 py-4 text-center">15 gün içinde kritik iş yok.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {lookahead15.slice(0, 8).map((l) => {
                const days = daysBetween(today, l.date);
                const overdue = days < 0;
                return (
                  <div
                    key={l.id}
                    className={cn(
                      "flex items-start justify-between gap-2 p-2.5 rounded-lg border",
                      overdue ? "border-red/20 bg-red/5" : "border-border bg-white"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{l.task}</div>
                      <div className="text-[11px] text-text3 mt-0.5">
                        {formatDate(l.date)}
                        {l.owner && <span> · {l.owner}</span>}
                      </div>
                    </div>
                    <Badge
                      variant={
                        l.priority === "critical"
                          ? "red"
                          : l.priority === "high"
                          ? "yellow"
                          : l.priority === "medium"
                          ? "blue"
                          : "gray"
                      }
                    >
                      {overdue ? `${-days}g gecikme` : `${days}g`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* AÇIK AKSİYONLAR + SON 5 GÜN FAALİYET ÖZETİ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 animate-slide-up">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="mb-0">
              <AlertTriangle size={14} className="text-yellow" />
              Açık Aksiyonlar ({openActions.length})
            </CardTitle>
            <Link href="/lookahead" className="text-[11px] text-accent font-bold hover:underline">
              Tümü →
            </Link>
          </div>
          {openActions.length === 0 ? (
            <p className="text-sm text-text3 py-4 text-center">Tüm aksiyonlar kapalı 🎉</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {openActions.slice(0, 10).map((l) => (
                <div key={l.id} className="flex items-center gap-2 py-1.5 px-2 hover:bg-bg2 rounded">
                  <Badge
                    variant={
                      l.priority === "critical"
                        ? "red"
                        : l.priority === "high"
                        ? "yellow"
                        : l.priority === "medium"
                        ? "blue"
                        : "gray"
                    }
                  >
                    {l.priority.charAt(0).toUpperCase()}
                  </Badge>
                  <span className="text-sm flex-1 truncate">{l.task}</span>
                  <span className="text-[11px] text-text3 font-mono whitespace-nowrap">
                    {formatDate(l.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="mb-0">
              <FileText size={14} className="text-accent" />
              Son 5 Günün Faaliyet Özeti
            </CardTitle>
            <Link href="/realization" className="text-[11px] text-accent font-bold hover:underline">
              Tümü →
            </Link>
          </div>
          {recentRealizations.length === 0 ? (
            <p className="text-sm text-text3 py-4 text-center">Son 5 günde gerçekleşme kaydı yok.</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {recentRealizations.slice(0, 12).map((r, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 px-2 hover:bg-bg2 rounded text-sm">
                  <span className="text-[10px] font-mono text-text3 w-14 shrink-0">{formatDate(r.date).slice(0, 5)}</span>
                  <span className="font-mono text-xs text-text3 shrink-0">{r.code}</span>
                  <span className="truncate flex-1">{r.name}</span>
                  <span className="font-mono font-semibold text-realized text-xs whitespace-nowrap tabular-nums">
                    +{formatNumber(r.qty, 1)} {r.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* DRONE FOTO + PROJE KÜNYESİ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 animate-slide-up">
        <Card className="lg:col-span-2 !p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <CardTitle className="mb-0">
              <Camera size={14} className="text-accent" />
              Saha Fotoğrafı
              {latestReport && (
                <span className="text-text3 font-normal tracking-normal text-xs ml-2">
                  · {formatDate(latestReport.reportDate)}
                </span>
              )}
            </CardTitle>
            <Link href="/daily-report" className="text-[11px] text-accent font-bold hover:underline">
              Günlük rapor →
            </Link>
          </div>
          {dronePhoto ? (
            <div className="relative aspect-video bg-bg2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dronePhoto.url}
                alt={dronePhoto.caption || "Saha fotoğrafı"}
                className="w-full h-full object-cover"
              />
              {latestReport?.summary && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/85 to-transparent p-4">
                  <p className="text-sm text-white font-medium line-clamp-2">{latestReport.summary}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video flex flex-col items-center justify-center text-text3 gap-2 bg-bg-soft">
              <Camera size={36} className="opacity-50" />
              <span className="text-sm">Henüz fotoğraf yok</span>
              <Link href="/daily-report" className="text-xs text-accent font-semibold hover:underline">
                Günlük rapor ekle →
              </Link>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>
            <Building2 size={14} className="text-accent" />
            Proje Künyesi
          </CardTitle>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <InfoItem label="Başlangıç" value={formatDate(project.startDate)} />
            <InfoItem label="Bitiş" value={formatDate(project.plannedEnd)} />
            <InfoItem label="Sözleşme" value={formatDate(project.contractEnd)} />
            <InfoItem label="Süre" value={`${project.durationDays}g`} />
            <InfoItem label="Konum" value={project.location} />
            <InfoItem
              label="Kurulu Güç"
              value={project.installedCapacityMw ? `${project.installedCapacityMw} MW` : "—"}
            />
            <InfoItem
              label="Bütçe"
              value={project.totalBudget ? formatMoney(project.totalBudget, project.budgetCurrency, 0) : "—"}
            />
            <InfoItem label="Durum" value={<span className="capitalize">{project.status}</span>} />
          </dl>
        </Card>
      </div>
    </>
  );
}

function SpiBlock({ spi, level }: { spi: number | null; level: ReturnType<typeof spiLevel> }) {
  return (
    <div
      className={cn(
        "px-5 py-3 rounded-xl border bg-white shadow-soft text-center",
        level === "good" && "border-green/30",
        level === "warn" && "border-yellow/30",
        level === "bad" && "border-red/30",
        !level && "border-border"
      )}
    >
      <div className="text-[10px] uppercase tracking-wider font-bold text-text3">SPI</div>
      <div
        className={cn(
          "font-mono text-2xl font-bold leading-tight mt-0.5 tabular-nums",
          level === "good" && "text-green",
          level === "warn" && "text-yellow",
          level === "bad" && "text-red",
          !level && "text-text3"
        )}
      >
        {spi == null ? "—" : spi.toFixed(3)}
      </div>
    </div>
  );
}

const ICON_BG: Record<string, string> = {
  blue:   "bg-blue/10 text-blue",
  accent: "bg-accent/10 text-accent",
  purple: "bg-purple/10 text-purple",
  amber:  "bg-yellow/10 text-yellow",
  red:    "bg-red/10 text-red",
};

function KpiBig({
  icon,
  iconBg = "accent",
  label,
  value,
  valueColor,
  valueRight,
  bar,
  barColor,
  sub,
  delay = 1,
}: {
  icon: React.ReactNode;
  iconBg?: string;
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  valueRight?: React.ReactNode;
  bar?: number;
  barColor?: string;
  sub?: React.ReactNode;
  delay?: 1 | 2 | 3 | 4;
}) {
  const delayCls =
    delay === 1
      ? "animate-slide-up-delay-1"
      : delay === 2
      ? "animate-slide-up-delay-2"
      : delay === 3
      ? "animate-slide-up-delay-3"
      : "animate-slide-up-delay-4";
  return (
    <div
      className={cn(
        "rounded-2xl bg-white border border-border p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-medium",
        delayCls
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-text3">{label}</div>
        <span
          className={cn(
            "inline-flex items-center justify-center w-9 h-9 rounded-xl",
            ICON_BG[iconBg]
          )}
        >
          {icon}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className={cn("font-mono text-[28px] font-bold leading-none tracking-tight tabular-nums", valueColor)}>
          {value}
        </div>
        {valueRight}
      </div>
      {sub && <div className="text-xs text-text2 mt-2 font-medium">{sub}</div>}
      {typeof bar === "number" && (
        <div className="h-1 bg-bg3 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, bar))}%`, background: barColor || "var(--accent)" }}
          />
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider font-bold text-text3 mb-0.5">{label}</dt>
      <dd className="text-text font-semibold text-sm">{value}</dd>
    </div>
  );
}

function EmptyChart({
  label,
  href,
  linkLabel,
  small = false,
}: {
  label: string;
  href?: string;
  linkLabel?: string;
  small?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-text3 text-sm gap-2 border-2 border-dashed border-border rounded-xl bg-bg-soft",
        small ? "h-32" : "h-48"
      )}
    >
      <Activity size={24} className="text-text3" />
      <span>{label}</span>
      {href && linkLabel && (
        <Link href={href} className="text-accent text-xs font-semibold hover:underline">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

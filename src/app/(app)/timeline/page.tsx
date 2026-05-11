"use client";

import { useMemo, useRef, useState } from "react";
import { BarChart3, FileDown, Layers3, Layers2, FileText, Loader2 } from "lucide-react";
import {
  useCurrentProject,
  useProjectWbs,
  useProjectPlanned,
  useProjectRealized,
} from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatPct, toISODate, addDays, daysBetween, cn } from "@/lib/utils";
import { sumByDateMap } from "@/lib/calc/progress";

const MONTH_LABEL = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
type Granularity = "day" | "week" | "month";

const LEVEL_COLOR: Record<number, { bar: string; barBg: string; text: string; rowBg: string }> = {
  1: { bar: "bg-blue",   barBg: "bg-blue/20",   text: "text-blue",   rowBg: "bg-blue/5" },
  2: { bar: "bg-purple", barBg: "bg-purple/20", text: "text-purple", rowBg: "bg-purple/5" },
  3: { bar: "bg-accent", barBg: "bg-accent/20", text: "text-accent", rowBg: "" },
};
const LEVEL_LABEL: Record<number, string> = {
  1: "Ana Başlık",
  2: "Alt Başlık",
  3: "İş Kalemi",
};

export default function TimelinePage() {
  const project = useCurrentProject();
  const wbs = useProjectWbs(project?.id);
  const planned = useProjectPlanned(project?.id);
  const realized = useProjectRealized(project?.id);
  const toast = useToast((s) => s.push);

  const [granularity, setGranularity] = useState<Granularity>("week");
  const [showL1, setShowL1] = useState(true);
  const [showL2, setShowL2] = useState(true);
  const [showL3, setShowL3] = useState(true);
  const [exporting, setExporting] = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);

  // Her node için planlanan/gerçekleşen tarih aralığı.
  // Parent (L1/L2): descendant leaf'lerin min/max'i (rollup).
  function findClosestParentCode(code: string): string | undefined {
    if (!code.includes(".")) return undefined;
    let p = code.split(".").slice(0, -1).join(".");
    while (p.length > 0) {
      if (wbs.some((x) => x.code === p)) return p;
      if (!p.includes(".")) return undefined;
      p = p.split(".").slice(0, -1).join(".");
    }
    return undefined;
  }

  function descendantLeaves(parentCode: string) {
    return wbs.filter(
      (w) => w.isLeaf && w.code !== parentCode && w.code.startsWith(parentCode + ".")
    );
  }

  const allRows = useMemo(() => {
    return wbs
      .filter((w) => w.level > 0) // L0 hariç
      .map((w) => {
        let pDates: string[] = [];
        let rDates: string[] = [];
        let cumReal = 0;
        let totalQty = 0;

        if (w.isLeaf) {
          pDates = Object.keys(planned[w.code] || {});
          rDates = Object.keys(realized[w.code] || {});
          cumReal = project ? sumByDateMap(realized, w.code, project.reportDate) : 0;
          totalQty = w.quantity;
        } else {
          // Rollup parent
          const leaves = descendantLeaves(w.code);
          for (const l of leaves) {
            pDates.push(...Object.keys(planned[l.code] || {}));
            rDates.push(...Object.keys(realized[l.code] || {}));
            if (project) {
              cumReal += sumByDateMap(realized, l.code, project.reportDate);
            }
            totalQty += l.quantity;
          }
        }
        pDates.sort();
        rDates.sort();
        const planStart = pDates[0];
        const planEnd = pDates[pDates.length - 1];
        const realStart = rDates[0];
        const realEnd = rDates[rDates.length - 1];
        const pct = totalQty > 0 ? Math.min(1, cumReal / totalQty) : 0;
        return { w, planStart, planEnd, realStart, realEnd, pct };
      })
      .filter((r) => r.planStart || r.realStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wbs, planned, realized, project]);

  const rows = useMemo(() => {
    return allRows
      .filter((r) => {
        if (r.w.level === 1) return showL1;
        if (r.w.level === 2) return showL2;
        if (r.w.level === 3) return showL3;
        return false;
      })
      .sort((a, b) => {
        // Hiyerarşik: önce parent (L1) sonra altı (L2), sonra alt-alt (L3)
        return a.w.code.localeCompare(b.w.code, undefined, { numeric: true });
      });
  }, [allRows, showL1, showL2, showL3]);

  const start = project?.startDate ?? toISODate(new Date());
  const end = project?.plannedEnd ?? toISODate(addDays(new Date(), 180));
  const totalDays = daysBetween(start, end) + 1;

  // Ticks
  const ticks = useMemo(() => {
    const arr: { date: string; label: string; major: boolean }[] = [];
    let d = new Date(start);
    const endD = new Date(end);
    const step = granularity === "day" ? 7 : granularity === "week" ? 7 : 30;
    while (d <= endD) {
      const dStr = toISODate(d);
      let label = "";
      let major = false;
      if (granularity === "month") {
        label = `${MONTH_LABEL[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
        major = true;
      } else if (granularity === "week") {
        const weekNo = Math.ceil((daysBetween(start, dStr) + 1) / 7);
        label = `H${weekNo}`;
        major = d.getDate() <= 7; // ay başlangıcı major
      } else {
        // day: her 7. gün label
        label = `${d.getDate()}/${d.getMonth() + 1}`;
        major = d.getDay() === 1; // pazartesi major
      }
      arr.push({ date: dStr, label, major });
      d = addDays(d, step);
    }
    return arr;
  }, [start, end, granularity]);

  function dateToPct(date: string): number {
    const offset = daysBetween(start, date);
    return (offset / totalDays) * 100;
  }

  async function exportPdf() {
    if (!exportRef.current || !project) return;
    setExporting(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas-pro"),
      ]);
      const el = exportRef.current;
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("landscape", "mm", "a3");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgRatio = canvas.width / canvas.height;
      const pageRatio = pageW / pageH;
      let imgW = pageW - 20;
      let imgH = imgW / imgRatio;
      if (imgRatio < pageRatio) {
        // image is taller than page
        imgH = pageH - 30;
        imgW = imgH * imgRatio;
      }
      // Başlık
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(project.name, 10, 10);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Timeline · ${formatDate(start)} → ${formatDate(end)} · ${totalDays} gün · Rapor: ${formatDate(project.reportDate)}`,
        10,
        15
      );
      pdf.addImage(imgData, "PNG", 10, 20, imgW, imgH);
      const fileName = `${project.name.replace(/\s+/g, "-")}-Timeline-${toISODate(new Date())}.pdf`;
      pdf.save(fileName);
      toast("PDF indirildi", "success");
    } catch (err) {
      console.error(err);
      toast("PDF üretilirken hata oluştu", "error");
    } finally {
      setExporting(false);
    }
  }

  if (!project) {
    return (
      <Card>
        <CardTitle>Proje Yok</CardTitle>
      </Card>
    );
  }

  const granLabel: Record<Granularity, string> = {
    day: "Günlük",
    week: "Haftalık",
    month: "Aylık",
  };

  // Tablo genişliği — granularite'e göre min-width
  const minTableWidth =
    granularity === "day" ? Math.max(1600, totalDays * 18) : granularity === "week" ? 1400 : 1000;

  return (
    <>
      <PageHeader
        title="Timeline & Gantt"
        description={`${formatDate(start)} → ${formatDate(end)} · ${totalDays} gün`}
        icon={BarChart3}
        actions={
          <Button variant="accent" onClick={exportPdf} disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Üretiliyor...
              </>
            ) : (
              <>
                <FileDown size={14} /> PDF İndir
              </>
            )}
          </Button>
        }
      />

      {/* Kontrol barı: tip filtresi + granularite */}
      <Card className="!p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-text3 mb-1.5">
              Görüntülenecek Tipler
            </div>
            <div className="flex flex-wrap gap-1.5">
              <TypeChip
                active={showL1}
                onToggle={() => setShowL1(!showL1)}
                icon={<Layers3 size={14} />}
                label="Ana Başlıklar"
                color="blue"
              />
              <TypeChip
                active={showL2}
                onToggle={() => setShowL2(!showL2)}
                icon={<Layers2 size={14} />}
                label="Alt Başlıklar"
                color="purple"
              />
              <TypeChip
                active={showL3}
                onToggle={() => setShowL3(!showL3)}
                icon={<FileText size={14} />}
                label="İş Kalemleri"
                color="accent"
              />
            </div>
          </div>
          <div className="ml-auto">
            <div className="text-[10px] uppercase tracking-wider font-bold text-text3 mb-1.5">
              Görünüm
            </div>
            <div className="inline-flex gap-1 p-1 bg-bg2 border border-border rounded-lg">
              {(["day", "week", "month"] as Granularity[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={cn(
                    "px-3 h-8 rounded-md text-xs font-semibold transition-all",
                    granularity === g
                      ? "bg-white shadow-soft border border-border text-text"
                      : "text-text2 hover:text-text"
                  )}
                >
                  {granLabel[g]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {!showL1 && !showL2 && !showL3 && (
        <Alert variant="warning" className="mb-4">
          Hiçbir tip seçili değil. En az birini aç.
        </Alert>
      )}

      {rows.length === 0 ? (
        <Card>
          <CardTitle>Henüz tarih atanmış iş yok</CardTitle>
          <p className="text-sm text-text2">
            Önce <a href="/planning" className="text-accent underline">Planlama</a>&apos;dan tarihler gir.
          </p>
        </Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto" ref={exportRef}>
            <div className="bg-white" style={{ minWidth: `${minTableWidth}px` }}>
              {/* Header */}
              <div className="grid grid-cols-[320px_1fr] gap-3 border-b border-border bg-bg2 px-4 py-3 sticky top-0 z-10">
                <div className="text-[10px] uppercase tracking-wider font-bold text-text2">
                  İş Kalemi / Başlık
                </div>
                <div className="relative h-7">
                  {ticks.map((t) => (
                    <div
                      key={t.date}
                      className={cn(
                        "absolute top-0 text-[10px] font-mono",
                        t.major ? "text-text font-bold" : "text-text3"
                      )}
                      style={{ left: `${dateToPct(t.date)}%` }}
                    >
                      {t.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rows */}
              <div className="px-4 py-2">
                {rows.map((r) => {
                  const c = LEVEL_COLOR[r.w.level] || LEVEL_COLOR[3];
                  const indent = (r.w.level - 1) * 14;
                  return (
                    <div
                      key={r.w.id}
                      className={cn(
                        "grid grid-cols-[320px_1fr] gap-3 items-center group hover:bg-bg2/40 rounded py-1.5 transition-colors",
                        c.rowBg
                      )}
                    >
                      <div className="text-xs pr-2 truncate flex items-center gap-2" style={{ paddingLeft: `${indent}px` }}>
                        <span
                          className={cn(
                            "text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded shrink-0",
                            c.text, c.barBg
                          )}
                        >
                          {LEVEL_LABEL[r.w.level]}
                        </span>
                        <span className="font-mono text-text3 shrink-0">{r.w.code}</span>
                        <span className={cn("truncate", r.w.level === 1 && "font-bold", r.w.level === 2 && "font-semibold")}>
                          {r.w.name}
                        </span>
                      </div>
                      <div className="relative h-6">
                        {/* Bg ticks */}
                        {ticks.map((t) => (
                          <div
                            key={t.date}
                            className={cn(
                              "absolute top-0 bottom-0 w-px",
                              t.major ? "bg-border2" : "bg-border"
                            )}
                            style={{ left: `${dateToPct(t.date)}%` }}
                          />
                        ))}
                        {/* Planned bar */}
                        {r.planStart && r.planEnd && (
                          <div
                            className={cn(
                              "absolute h-2 rounded-sm",
                              c.bar,
                              "opacity-40"
                            )}
                            style={{
                              top: r.w.level === 1 ? "6px" : r.w.level === 2 ? "8px" : "10px",
                              left: `${dateToPct(r.planStart)}%`,
                              width: `${Math.max(0.5, dateToPct(r.planEnd) - dateToPct(r.planStart) + 0.5)}%`,
                            }}
                            title={`Plan: ${formatDate(r.planStart)} → ${formatDate(r.planEnd)}`}
                          />
                        )}
                        {/* Realized bar */}
                        {r.realStart && r.realEnd && (
                          <div
                            className={cn("absolute h-2 rounded-sm", c.bar)}
                            style={{
                              top: r.w.level === 1 ? "14px" : r.w.level === 2 ? "14px" : "14px",
                              left: `${dateToPct(r.realStart)}%`,
                              width: `${Math.max(0.5, dateToPct(r.realEnd) - dateToPct(r.realStart) + 0.5)}%`,
                            }}
                            title={`Gerçek: ${formatDate(r.realStart)} → ${formatDate(r.realEnd)} (${formatPct(r.pct, 0)})`}
                          />
                        )}
                        {/* Today marker */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red"
                          style={{ left: `${dateToPct(project.reportDate)}%` }}
                          title={`Rapor Tarihi: ${formatDate(project.reportDate)}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center flex-wrap gap-x-6 gap-y-2 px-4 py-3 border-t border-border bg-bg2/50 text-xs text-text2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-text3">Açıklama:</span>
                <LegendItem color="bg-blue" label="Ana Başlık" />
                <LegendItem color="bg-purple" label="Alt Başlık" />
                <LegendItem color="bg-accent" label="İş Kalemi" />
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 bg-text3/40 rounded-sm" /> Planlanan
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 bg-text3 rounded-sm" /> Gerçekleşen
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-0.5 h-3 bg-red" /> Rapor Tarihi
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

function TypeChip({
  active,
  onToggle,
  icon,
  label,
  color,
}: {
  active: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  label: string;
  color: "blue" | "purple" | "accent";
}) {
  const colorMap = {
    blue: { border: "border-blue", bg: "bg-blue/10", text: "text-blue" },
    purple: { border: "border-purple", bg: "bg-purple/10", text: "text-purple" },
    accent: { border: "border-accent", bg: "bg-accent/10", text: "text-accent" },
  };
  const c = colorMap[color];
  return (
    <button
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-2 h-9 px-3 rounded-lg border text-xs font-semibold transition-all",
        active
          ? [c.bg, c.text, c.border]
          : "bg-white border-border text-text3 hover:text-text2 hover:border-border2"
      )}
    >
      <input
        type="checkbox"
        checked={active}
        onChange={onToggle}
        className={cn("w-3.5 h-3.5 rounded pointer-events-none", active && c.text)}
        readOnly
      />
      {icon}
      {label}
    </button>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("w-3 h-3 rounded", color)} />
      {label}
    </span>
  );
}

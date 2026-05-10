"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import {
  useCurrentProject,
  useProjectWbs,
  useProjectPlanned,
  useProjectRealized,
} from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { formatDate, formatPct, toISODate, addDays, daysBetween, cn } from "@/lib/utils";
import { sumByDateMap } from "@/lib/calc/progress";

export default function TimelinePage() {
  const project = useCurrentProject();
  const wbs = useProjectWbs(project?.id);
  const planned = useProjectPlanned(project?.id);
  const realized = useProjectRealized(project?.id);

  const [granularity, setGranularity] = useState<"week" | "month">("month");

  // Sadece leaf'ler için: ilk planlanan tarih, son planlanan tarih
  const rows = useMemo(() => {
    return wbs
      .filter((w) => w.isLeaf)
      .map((w) => {
        const pDates = Object.keys(planned[w.code] || {}).sort();
        const rDates = Object.keys(realized[w.code] || {}).sort();
        const planStart = pDates[0];
        const planEnd = pDates[pDates.length - 1];
        const realStart = rDates[0];
        const realEnd = rDates[rDates.length - 1];
        const cumReal = project ? sumByDateMap(realized, w.code, project.reportDate) : 0;
        const pct = w.quantity > 0 ? Math.min(1, cumReal / w.quantity) : 0;
        return { w, planStart, planEnd, realStart, realEnd, pct };
      })
      .filter((r) => r.planStart || r.realStart)
      .sort((a, b) => {
        const aS = a.planStart || a.realStart || "";
        const bS = b.planStart || b.realStart || "";
        return aS.localeCompare(bS);
      });
  }, [wbs, planned, realized, project]);

  // Timeline: project start → planned end
  const start = project?.startDate ?? toISODate(new Date());
  const end = project?.plannedEnd ?? toISODate(addDays(new Date(), 180));
  const totalDays = daysBetween(start, end) + 1;

  // Header time ticks
  const ticks = useMemo(() => {
    const arr: { date: string; label: string }[] = [];
    const step = granularity === "week" ? 7 : 30;
    let d = new Date(start);
    const endD = new Date(end);
    while (d <= endD) {
      arr.push({
        date: toISODate(d),
        label:
          granularity === "month"
            ? d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" })
            : `H${Math.ceil((daysBetween(start, d) + 1) / 7)}`,
      });
      d = addDays(d, step);
    }
    return arr;
  }, [start, end, granularity]);

  function dateToPct(date: string): number {
    const offset = daysBetween(start, date);
    return (offset / totalDays) * 100;
  }

  if (!project)
    return (
      <Card>
        <CardTitle>Proje Yok</CardTitle>
      </Card>
    );

  return (
    <>
      <PageHeader
        title="Timeline & Gantt"
        description={`${formatDate(start)} → ${formatDate(end)} · ${totalDays} gün`}
        icon={BarChart3}
        actions={
          <Field>
            <Select value={granularity} onChange={(e) => setGranularity(e.target.value as "week" | "month")}>
              <option value="month">Aylık</option>
              <option value="week">Haftalık</option>
            </Select>
          </Field>
        }
      />

      {rows.length === 0 ? (
        <Card>
          <CardTitle>Henüz tarih atanmış iş yok</CardTitle>
          <p className="text-sm text-text2">
            Önce <a href="/planning" className="text-accent underline">Planlama</a>&apos;dan tarihler gir.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[280px_1fr] gap-3 border-b border-border pb-2 mb-3">
                <div className="text-[10px] uppercase tracking-wider font-display text-text3 font-semibold">
                  İş Maddesi
                </div>
                <div className="relative h-6">
                  {ticks.map((t) => (
                    <div
                      key={t.date}
                      className="absolute top-0 text-[10px] text-text3 font-mono"
                      style={{ left: `${dateToPct(t.date)}%` }}
                    >
                      {t.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                {rows.map((r) => (
                  <div
                    key={r.w.id}
                    className="grid grid-cols-[280px_1fr] gap-3 items-center group hover:bg-bg3/40 rounded py-1.5"
                  >
                    <div className="text-xs pr-2 truncate">
                      <span className="font-mono text-text3 mr-2">{r.w.code}</span>
                      <span className="text-text">{r.w.name}</span>
                    </div>
                    <div className="relative h-5">
                      {/* Bg ticks */}
                      {ticks.map((t) => (
                        <div
                          key={t.date}
                          className="absolute top-0 bottom-0 w-px bg-border"
                          style={{ left: `${dateToPct(t.date)}%` }}
                        />
                      ))}
                      {/* Planned bar */}
                      {r.planStart && r.planEnd && (
                        <div
                          className="absolute top-1 h-1.5 rounded-sm bg-planned/50"
                          style={{
                            left: `${dateToPct(r.planStart)}%`,
                            width: `${Math.max(0.5, dateToPct(r.planEnd) - dateToPct(r.planStart) + 0.5)}%`,
                          }}
                          title={`Plan: ${formatDate(r.planStart)} → ${formatDate(r.planEnd)}`}
                        />
                      )}
                      {/* Realized bar */}
                      {r.realStart && r.realEnd && (
                        <div
                          className="absolute top-3 h-1.5 rounded-sm bg-realized"
                          style={{
                            left: `${dateToPct(r.realStart)}%`,
                            width: `${Math.max(0.5, dateToPct(r.realEnd) - dateToPct(r.realStart) + 0.5)}%`,
                          }}
                          title={`Gerçek: ${formatDate(r.realStart)} → ${formatDate(r.realEnd)} (${formatPct(r.pct, 0)})`}
                        />
                      )}
                      {/* Today marker */}
                      {project && (
                        <div
                          className="absolute top-0 bottom-0 w-px bg-accent"
                          style={{ left: `${dateToPct(project.reportDate)}%` }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-6 mt-4 text-xs text-text3">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 bg-planned/50 rounded-sm" /> Planlanan
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 bg-realized rounded-sm" /> Gerçekleşen
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-px h-3 bg-accent" /> Rapor Tarihi
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

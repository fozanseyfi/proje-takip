"use client";

import { useMemo, useState } from "react";
import { Clock, Building2 } from "lucide-react";
import { useStore, useCurrentProject } from "@/lib/store";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { manhourByDiscipline, getDisciplineLabel } from "@/lib/calc/sections";
import { formatNumber, toISODate, addDays, cn } from "@/lib/utils";

export function ManhourDetailWidget() {
  const project = useCurrentProject();
  const personnel = useStore((s) => s.personnelMaster).filter((p) => !p.deletedAt);
  const attendance = useStore((s) => s.personnelAttendance);

  const today = toISODate(new Date());
  const defaultFrom = project ? toISODate(addDays(today, -30)) : today;

  const [from, setFrom] = useState<string>(defaultFrom);
  const [to, setTo] = useState<string>(today);
  const [draftFrom, setDraftFrom] = useState<string>(defaultFrom);
  const [draftTo, setDraftTo] = useState<string>(today);

  const disciplineStats = useMemo(
    () => project ? manhourByDiscipline(attendance, personnel, project.id, from, to) : [],
    [attendance, personnel, project, from, to]
  );

  const totalHours = disciplineStats.reduce((s, d) => s + d.hours, 0);
  const totalPeople = new Set(disciplineStats.flatMap(() => [])).size;
  const totalUniquePeople = useMemo(() => {
    if (!project) return 0;
    const ids = new Set<string>();
    for (const a of attendance) {
      if (a.projectId === project.id && a.present && a.date >= from && a.date <= to) {
        ids.add(a.personnelMasterId);
      }
    }
    return ids.size;
  }, [attendance, project, from, to]);

  // Firma bazlı dağılım
  const companyStats = useMemo(() => {
    if (!project) return [];
    const personById = new Map(personnel.map((p) => [p.id, p]));
    const buckets: Record<string, { hours: number; people: Set<string> }> = {};
    for (const a of attendance) {
      if (a.projectId !== project.id) continue;
      if (a.date < from || a.date > to) continue;
      if (!a.present) continue;
      const person = personById.get(a.personnelMasterId);
      const company = person?.company ?? "Bilinmiyor";
      if (!buckets[company]) buckets[company] = { hours: 0, people: new Set() };
      buckets[company].hours += a.hours || 0;
      buckets[company].people.add(a.personnelMasterId);
    }
    const total = Object.values(buckets).reduce((s, b) => s + b.hours, 0);
    return Object.entries(buckets)
      .map(([company, v]) => ({
        company,
        hours: v.hours,
        people: v.people.size,
        pct: total > 0 ? (v.hours / total) * 100 : 0,
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [attendance, personnel, project, from, to]);

  if (!project) return null;

  function applyDates() {
    setFrom(draftFrom);
    setTo(draftTo);
  }

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <CardTitle className="mb-0">
          <Clock size={14} className="text-accent" />
          Adam-Saat Analiz Tablosu
        </CardTitle>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-text3 font-semibold uppercase tracking-wider text-[10px]">Aralık:</span>
          <Input
            type="date"
            value={draftFrom}
            onChange={(e) => setDraftFrom(e.target.value)}
            className="!h-8 !w-36 !py-0 text-xs font-mono"
            min={project.startDate}
            max={project.plannedEnd}
          />
          <span className="text-text3">→</span>
          <Input
            type="date"
            value={draftTo}
            onChange={(e) => setDraftTo(e.target.value)}
            className="!h-8 !w-36 !py-0 text-xs font-mono"
            min={project.startDate}
            max={project.plannedEnd}
          />
          <Button size="sm" variant="accent" onClick={applyDates}>
            Göster
          </Button>
        </div>
      </div>

      <div className="px-6 py-5">
        {/* DİSİPLİN tablosu */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider font-bold text-text3 border-b border-border">
                <th className="text-left py-2 px-1">Disiplin</th>
                <th className="text-right py-2 px-1">Adam-Saat</th>
                <th className="text-right py-2 px-1">Adam-Gün</th>
                <th className="text-right py-2 px-1">Kişi</th>
                <th className="text-left py-2 px-1 w-1/3">Pay %</th>
              </tr>
            </thead>
            <tbody>
              {disciplineStats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-text3 text-sm">
                    Seçili tarih aralığında puantaj kaydı yok.
                  </td>
                </tr>
              ) : (
                disciplineStats.map((d) => {
                  return (
                    <tr key={d.discipline} className="hover:bg-bg2/40 border-b border-border last:border-b-0">
                      <td className="py-2.5 px-1 font-semibold text-text">
                        {getDisciplineLabel(d.discipline)}
                      </td>
                      <td className="py-2.5 px-1 text-right font-mono font-semibold tabular-nums">
                        {formatNumber(d.hours, 1)}
                      </td>
                      <td className="py-2.5 px-1 text-right font-mono text-accent font-semibold tabular-nums">
                        {formatNumber(d.manDays, 1)}
                      </td>
                      <td className="py-2.5 px-1 text-right font-mono text-text2 tabular-nums">
                        {d.uniquePeople}
                      </td>
                      <td className="py-2.5 px-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-bg3 rounded-full overflow-hidden max-w-[200px]">
                            <div
                              className="h-full bg-accent rounded-full transition-[width] duration-500"
                              style={{
                                width: `${totalHours > 0 ? (d.hours / totalHours) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-text3 tabular-nums w-12">
                            {totalHours > 0 ? ((d.hours / totalHours) * 100).toFixed(1) : "0.0"}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
              {totalHours > 0 && (
                <tr className="bg-bg2/40 font-bold">
                  <td className="py-2.5 px-1 text-text">Toplam</td>
                  <td className="py-2.5 px-1 text-right font-mono text-text tabular-nums">
                    {formatNumber(totalHours, 1)}
                  </td>
                  <td className="py-2.5 px-1 text-right font-mono text-accent tabular-nums">
                    {formatNumber(totalHours / 9, 1)}
                  </td>
                  <td className="py-2.5 px-1 text-right font-mono text-text2 tabular-nums">
                    {totalUniquePeople}
                  </td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* FİRMA bazlı dağılım */}
        {companyStats.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={14} className="text-accent" />
              <span className="text-[10px] uppercase tracking-wider font-bold text-text2">
                Firmaya Göre Dağılım
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider font-bold text-text3 border-b border-border">
                    <th className="text-left py-2 px-1">Firma</th>
                    <th className="text-right py-2 px-1">Adam-Saat</th>
                    <th className="text-right py-2 px-1">Kişi</th>
                    <th className="text-left py-2 px-1 w-1/2">Pay %</th>
                  </tr>
                </thead>
                <tbody>
                  {companyStats.map((c) => (
                    <tr key={c.company} className="hover:bg-bg2/40 border-b border-border last:border-b-0">
                      <td className="py-2.5 px-1 font-medium text-text">{c.company}</td>
                      <td className="py-2.5 px-1 text-right font-mono font-semibold tabular-nums">
                        {formatNumber(c.hours, 1)}
                      </td>
                      <td className="py-2.5 px-1 text-right font-mono text-text2 tabular-nums">
                        {c.people}
                      </td>
                      <td className="py-2.5 px-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-bg3 rounded-full overflow-hidden max-w-[280px]">
                            <div
                              className={cn(
                                "h-full rounded-full transition-[width] duration-500",
                                c.pct > 40 ? "bg-accent" : c.pct > 20 ? "bg-blue" : "bg-purple"
                              )}
                              style={{ width: `${c.pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-text3 tabular-nums w-12">
                            {c.pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

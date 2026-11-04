import type { WbsItem } from "@/lib/store/types";
import { getPlanRange, type LeafSchedule } from "@/lib/calc/predecessors";
import { endDateFromDuration, startDateFromDuration } from "@/lib/calc/distribution";

export type DurationRange = { start: string; end: string; isFromPlan: boolean };

function workweekFlags(ww?: "mon-fri" | "mon-sat" | "mon-sun"): { workSat: boolean; workSun: boolean } {
  if (ww === "mon-fri") return { workSat: false, workSun: false };
  if (ww === "mon-sun") return { workSat: true, workSun: true };
  return { workSat: true, workSun: false }; // mon-sat default
}

/**
 * Her leaf için Gantt bar aralığı.
 *  - Plan (miktar) girilmişse: planın ilk/son dolu günü
 *  - Plan yoksa ama tahmini süre varsa: öncüllere (CPM) göre türetilmiş aralık
 *  - Milestone: tarih yoksa öncüllere göre veya proje başlangıcına yerleştirilir
 *
 * Planlama sayfasındaki Gantt Önizleme ile Timeline aynı fonksiyonu kullanır.
 */
export function computeDurationRanges(
  leafs: WbsItem[],
  planned: Record<string, Record<string, number>>,
  schedules: Map<string, LeafSchedule>,
  projectStart: string
): Map<string, DurationRange> {
  const out = new Map<string, DurationRange>();
  for (const w of leafs) {
    if (w.activityType === "milestone") {
      if (w.milestoneDate) {
        out.set(w.code, { start: w.milestoneDate, end: w.milestoneDate, isFromPlan: true });
      } else {
        const fallback = schedules.get(w.code)?.earliestStart ?? projectStart;
        out.set(w.code, { start: fallback, end: fallback, isFromPlan: false });
      }
      continue;
    }
    const pr = getPlanRange(planned[w.code]);
    if (pr.start && pr.end) {
      out.set(w.code, { start: pr.start, end: pr.end, isFromPlan: true });
      continue;
    }
    // Plan yok ama tahmini süre var → bar pozisyonu için anchor seç.
    //  ALAP: effectiveStart..effectiveEnd (Free Float kadar geri)
    //  ASAP + FF kısıtı: bitişe sabitle (FF constraint = info.earliestEnd)
    //  ASAP + sadece FS/SS / kısıtsız: earliestStart..earliestStart+duration
    const dur = w.estimatedDurationDays;
    if (dur && dur > 0) {
      const sch = schedules.get(w.code);
      const flags = workweekFlags(w.workweek);
      let start: string;
      let end: string;
      if (w.scheduleType === "alap" && sch?.effectiveStart && sch?.effectiveEnd) {
        start = sch.effectiveStart;
        end = sch.effectiveEnd;
      } else if (sch?.earliestEnd) {
        end = sch.earliestEnd;
        start = startDateFromDuration(end, dur, flags.workSat, flags.workSun);
        if (sch.earliestStart && start < sch.earliestStart) {
          start = sch.earliestStart;
          end = endDateFromDuration(start, dur, flags.workSat, flags.workSun);
        }
      } else {
        start = sch?.earliestStart ?? projectStart;
        end = endDateFromDuration(start, dur, flags.workSat, flags.workSun);
      }
      out.set(w.code, { start, end, isFromPlan: false });
    }
  }
  return out;
}

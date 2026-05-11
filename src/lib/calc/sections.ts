import { computeEffectiveWeights, sumByDateMap } from "./progress";
import type { WbsItem, DateQuantityMap, PersonnelAttendance, MachineAttendance, PersonnelMaster, MachineMaster, Discipline } from "@/lib/store/types";

// ============================================================
// Section / L1-L2 progress
// ============================================================

export interface SectionProgress {
  code: string;
  name: string;
  level: 1 | 2;
  planPct: number;
  realPct: number;
  spi: number | null;
  leafCount: number;
  cumPlan: number;
  cumReal: number;
  totalQty: number;
}

/**
 * L1 ya da L2 başlığı için, descendant leaf'leri toplayıp normalize edilmiş
 * progress hesaplar. Her section kendi içinde 1.0 olacak şekilde normalize.
 */
export function computeSectionProgress(
  wbs: WbsItem[],
  planned: DateQuantityMap,
  realized: DateQuantityMap,
  upToDate: string,
  level: 1 | 2 = 1
): SectionProgress[] {
  const sections = wbs.filter((w) => w.level === level && !w.deletedAt);
  return sections.map((s) => {
    const leaves = wbs.filter(
      (w) => w.isLeaf && !w.deletedAt && w.code.startsWith(s.code + ".")
    );
    if (leaves.length === 0) {
      return {
        code: s.code,
        name: s.name,
        level,
        planPct: 0,
        realPct: 0,
        spi: null,
        leafCount: 0,
        cumPlan: 0,
        cumReal: 0,
        totalQty: 0,
      };
    }
    const weighted = computeEffectiveWeights(
      leaves.map((l) => ({ code: l.code, isLeaf: l.isLeaf, quantity: l.quantity, weight: l.weight }))
    );
    let planPct = 0;
    let realPct = 0;
    let cumPlan = 0;
    let cumReal = 0;
    let totalQty = 0;
    for (const w of weighted) {
      if (w.quantity <= 0) continue;
      const p = sumByDateMap(planned, w.code, upToDate);
      const r = sumByDateMap(realized, w.code, upToDate);
      planPct += w.effectiveWeight * Math.min(p / w.quantity, 1);
      realPct += w.effectiveWeight * Math.min(r / w.quantity, 1);
      cumPlan += p;
      cumReal += r;
      totalQty += w.quantity;
    }
    return {
      code: s.code,
      name: s.name,
      level,
      planPct,
      realPct,
      spi: planPct > 0 ? realPct / planPct : null,
      leafCount: leaves.length,
      cumPlan,
      cumReal,
      totalQty,
    };
  });
}

/** Section bazlı S-eğrisi noktaları */
export function buildSectionSCurve(
  wbs: WbsItem[],
  planned: DateQuantityMap,
  realized: DateQuantityMap,
  sectionCode: string,
  reportDate: string,
  allDates: string[]
) {
  const leaves = wbs.filter(
    (w) => w.isLeaf && !w.deletedAt && w.code.startsWith(sectionCode + ".")
  );
  const weighted = computeEffectiveWeights(
    leaves.map((l) => ({ code: l.code, isLeaf: l.isLeaf, quantity: l.quantity, weight: l.weight }))
  );
  return allDates.map((d) => {
    let planPct = 0;
    let realPct = 0;
    for (const w of weighted) {
      if (w.quantity <= 0) continue;
      const p = sumByDateMap(planned, w.code, d);
      const r = sumByDateMap(realized, w.code, d);
      planPct += w.effectiveWeight * Math.min(p / w.quantity, 1);
      realPct += w.effectiveWeight * Math.min(r / w.quantity, 1);
    }
    return {
      date: d,
      planPct: planPct * 100,
      realPct: d > reportDate ? NaN : realPct * 100,
    };
  });
}

// ============================================================
// Personel / Makine günlük metrikler
// ============================================================

export interface HeadcountPoint {
  date: string;
  count: number;
  hours?: number;
}

/** Belirli tarih aralığı için her gün için present=true sayısı */
export function headcountByDate(
  attendance: PersonnelAttendance[],
  projectId: string,
  fromISO: string,
  toISO: string
): HeadcountPoint[] {
  const map: Record<string, { count: number; hours: number }> = {};
  // tüm tarihleri doldur
  const start = new Date(fromISO);
  const end = new Date(toISO);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    map[d.toISOString().slice(0, 10)] = { count: 0, hours: 0 };
  }
  for (const a of attendance) {
    if (a.projectId !== projectId) continue;
    if (a.date < fromISO || a.date > toISO) continue;
    if (!a.present) continue;
    if (!map[a.date]) map[a.date] = { count: 0, hours: 0 };
    map[a.date].count += 1;
    map[a.date].hours += a.hours || 0;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, count: v.count, hours: v.hours }));
}

/** Makine günlük sayısı + saat */
export function machineCountByDate(
  attendance: MachineAttendance[],
  projectId: string,
  fromISO: string,
  toISO: string
): HeadcountPoint[] {
  const map: Record<string, { count: number; hours: number }> = {};
  const start = new Date(fromISO);
  const end = new Date(toISO);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    map[d.toISOString().slice(0, 10)] = { count: 0, hours: 0 };
  }
  for (const a of attendance) {
    if (a.projectId !== projectId) continue;
    if (a.date < fromISO || a.date > toISO) continue;
    if (!a.present) continue;
    if (!map[a.date]) map[a.date] = { count: 0, hours: 0 };
    map[a.date].count += 1;
    map[a.date].hours += a.hours || 0;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, count: v.count, hours: v.hours }));
}

// ============================================================
// Adam-Saat analizi (disiplin bazlı)
// ============================================================

export interface ManhourByDiscipline {
  discipline: Discipline | "unknown";
  hours: number;
  manDays: number;     // saat / 9
  uniquePeople: number;
}

const DISCIPLINE_LABEL: Record<Discipline, string> = {
  mekanik: "Mekanik",
  elektrik: "Elektrik",
  insaat: "İnşaat",
  muhendislik: "Mühendislik",
  idari: "İdari",
  diger: "Diğer",
};

export function getDisciplineLabel(d: string): string {
  if (d in DISCIPLINE_LABEL) return DISCIPLINE_LABEL[d as Discipline];
  return "Bilinmiyor";
}

export function manhourByDiscipline(
  attendance: PersonnelAttendance[],
  personnel: PersonnelMaster[],
  projectId: string,
  fromISO?: string,
  toISO?: string
): ManhourByDiscipline[] {
  const personById = new Map(personnel.map((p) => [p.id, p]));
  const buckets: Record<string, { hours: number; people: Set<string> }> = {};
  for (const a of attendance) {
    if (a.projectId !== projectId) continue;
    if (fromISO && a.date < fromISO) continue;
    if (toISO && a.date > toISO) continue;
    if (!a.present) continue;
    const person = personById.get(a.personnelMasterId);
    const disc = (person?.discipline ?? "unknown") as string;
    if (!buckets[disc]) buckets[disc] = { hours: 0, people: new Set() };
    buckets[disc].hours += a.hours || 0;
    buckets[disc].people.add(a.personnelMasterId);
  }
  return Object.entries(buckets)
    .map(([discipline, v]) => ({
      discipline: discipline as ManhourByDiscipline["discipline"],
      hours: v.hours,
      manDays: v.hours / 9,
      uniquePeople: v.people.size,
    }))
    .sort((a, b) => b.hours - a.hours);
}

// ============================================================
// Faturalandırma durum özeti
// ============================================================

export interface BillingSummary {
  status: "taslak" | "gonderildi" | "odendi" | "iptal";
  count: number;
  totalByCurrency: Record<string, number>;
}

import type { BillingItem, ProcurementItem } from "@/lib/store/types";

const BILLING_STATUSES: BillingSummary["status"][] = ["taslak", "gonderildi", "odendi", "iptal"];

export function billingSummary(items: BillingItem[]): BillingSummary[] {
  return BILLING_STATUSES.map((status) => {
    const matching = items.filter((b) => b.status === status);
    const totalByCurrency: Record<string, number> = {};
    for (const b of matching) {
      totalByCurrency[b.currency] = (totalByCurrency[b.currency] || 0) + b.amount;
    }
    return { status, count: matching.length, totalByCurrency };
  });
}

// ============================================================
// Procurement follow-up: yolda + gecikenler
// ============================================================

export interface ProcurementFollowItem {
  item: ProcurementItem;
  daysUntilExpected: number | null;
  overdue: boolean;
}

export function procurementFollowup(
  items: ProcurementItem[],
  todayISO: string
): ProcurementFollowItem[] {
  const today = new Date(todayISO);
  return items
    .filter((p) => p.status === "siparis" || p.status === "yolda")
    .map((item) => {
      if (!item.expectedDate) return { item, daysUntilExpected: null, overdue: false };
      const exp = new Date(item.expectedDate);
      const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
      return { item, daysUntilExpected: days, overdue: days < 0 };
    })
    .sort((a, b) => {
      const ad = a.daysUntilExpected ?? 9999;
      const bd = b.daysUntilExpected ?? 9999;
      return ad - bd;
    });
}

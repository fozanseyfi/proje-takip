import { computeEffectiveWeights, sumByDateMap } from "./progress";
import type { WbsItem, DateQuantityMap, PersonnelAttendance, MachineAttendance, PersonnelMaster, MachineMaster, Discipline } from "@/lib/store/types";

// ============================================================
// Hiyerarşik ağırlık hesabı
// Her seviyede kardeşler kendi aralarında %100'e normalize edilir.
// Nihai ağırlık = parent'ın nihai × kendi yerel oranı.
// ============================================================

export interface HierarchicalWeight {
  code: string;
  level: number;
  localRaw: number;   // kullanıcının girdiği ham değer (örn. 30 — yorum: %30)
  localPct: number;   // o seviyedeki normalize edilmiş pay (0..1)
  finalPct: number;   // proje toplamına oranı (0..1) — kümülatif çarpım
  parentCode?: string;
  childCount: number;
}

/**
 * Tüm WBS satırları için hiyerarşik ağırlık hesabı.
 * Tree, code prefix'inden yukarı çıkılarak kurulur (eksik ara parent'lar
 * varsa en yakın atayı bulur).
 */
export function computeHierarchicalWeights(
  wbs: WbsItem[]
): Map<string, HierarchicalWeight> {
  const result = new Map<string, HierarchicalWeight>();
  const byCode = new Map(wbs.filter((w) => !w.deletedAt).map((w) => [w.code, w]));

  // Her node için, var olan en yakın atayı bul
  function findExistingParent(code: string): string | undefined {
    if (!code.includes(".")) return undefined;
    let p = code.split(".").slice(0, -1).join(".");
    while (p.length > 0) {
      if (byCode.has(p)) return p;
      if (!p.includes(".")) return undefined;
      p = p.split(".").slice(0, -1).join(".");
    }
    return undefined;
  }

  // Children map
  const childrenMap: Record<string, WbsItem[]> = { __root__: [] };
  for (const w of byCode.values()) {
    const parent = findExistingParent(w.code) ?? "__root__";
    if (!childrenMap[parent]) childrenMap[parent] = [];
    childrenMap[parent].push(w);
  }
  // Children'ı sırala
  for (const list of Object.values(childrenMap)) {
    list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }

  // Recursive traverse
  function visit(parentCode: string, parentFinal: number) {
    const kids = childrenMap[parentCode] || [];
    if (kids.length === 0) return;

    const rawSum = kids.reduce((s, c) => s + (c.weight || 0), 0);
    const allZero = rawSum === 0;

    for (const child of kids) {
      const raw = child.weight || 0;
      const localPct = allZero ? 1 / kids.length : raw / rawSum;
      const finalPct = parentFinal * localPct;
      result.set(child.code, {
        code: child.code,
        level: child.level,
        localRaw: raw,
        localPct,
        finalPct,
        parentCode: parentCode === "__root__" ? undefined : parentCode,
        childCount: (childrenMap[child.code] || []).length,
      });
      visit(child.code, finalPct);
    }
  }

  visit("__root__", 1.0);
  return result;
}

/**
 * Her parent altında kardeşlerin yerel ham ağırlık toplamı.
 * Doğrulama için kullanılır (kullanıcı 100 olmasını bekler ama 60 girdiyse uyarılır).
 */
export interface ParentWeightSummary {
  parentCode: string | "__root__";
  parentName: string;
  childCount: number;
  rawSum: number;
  isAutoMode: boolean;     // tüm child'lar 0 ise
  isBalanced: boolean;     // rawSum ≈ 100 (veya 1)
}

export function getParentWeightSummaries(
  wbs: WbsItem[]
): ParentWeightSummary[] {
  const byCode = new Map(wbs.filter((w) => !w.deletedAt).map((w) => [w.code, w]));
  function findExistingParent(code: string): string | undefined {
    if (!code.includes(".")) return undefined;
    let p = code.split(".").slice(0, -1).join(".");
    while (p.length > 0) {
      if (byCode.has(p)) return p;
      if (!p.includes(".")) return undefined;
      p = p.split(".").slice(0, -1).join(".");
    }
    return undefined;
  }
  const groups: Record<string, WbsItem[]> = {};
  for (const w of byCode.values()) {
    const parent = findExistingParent(w.code) ?? "__root__";
    if (!groups[parent]) groups[parent] = [];
    groups[parent].push(w);
  }
  return Object.entries(groups).map(([parentCode, children]) => {
    const rawSum = children.reduce((s, c) => s + (c.weight || 0), 0);
    const isAutoMode = rawSum === 0;
    // 1 veya 100 kabul edilen "denge"
    const isBalanced =
      !isAutoMode && (Math.abs(rawSum - 100) < 0.5 || Math.abs(rawSum - 1) < 0.005);
    const parentItem = parentCode === "__root__" ? undefined : byCode.get(parentCode);
    return {
      parentCode: parentCode as ParentWeightSummary["parentCode"],
      parentName: parentItem?.name ?? "Proje Kökü",
      childCount: children.length,
      rawSum,
      isAutoMode,
      isBalanced,
    };
  });
}

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

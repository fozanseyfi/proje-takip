/**
 * Yönetim Özeti PDF — Direktör / Patron için kurumsal proje durum raporu.
 *
 * Ekran görüntüsü (html2canvas) DEĞİL: jsPDF + jspdf-autotable ile doğrudan
 * vektörel çizilir (ortak altyapı: ./kit). Metinler seçilebilir, tablolar sayfa
 * sonunda düzgün bölünür, grafikler her zoom seviyesinde keskin kalır.
 *
 * Yapı:
 *   Kapak (1. sayfa) — kompakt antet, genel durum, manşet göstergeler,
 *                      proje künyesi, içindekiler
 *   Her bölüm yeni sayfada başlar:
 *   Yönetici Özeti · Plan / Gerçekleşme Özeti (tahmini bitiş, haftalık) ·
 *   İlerleme (S-eğrisi) · İmalat Özeti (alt bölümler) · Son 7 Gün ·
 *   Personel (trend, headcount) · Makine (trend, tip bazında) · Finansal ·
 *   Satın Alma · Kritik İşler · Saha Durumu · Onay
 *
 * Haftalık olarak üst yönetim / işverene gönderilmek üzere platform özeti.
 */

import { formatDate, formatNumber, toISODate, daysBetween, addDays, spiLevel } from "@/lib/utils";
import { resolvePhotoUrl } from "@/lib/data/photo-store";
import { loadingOverlay } from "@/lib/ui-loading";
import type {
  Project,
  WbsItem,
  DateQuantityMap,
  BillingItem,
  ProcurementItem,
  LookaheadItem,
  PersonnelAttendance,
  MachineAttendance,
  DailyReport,
  PersonnelMaster,
  MachineMaster,
} from "@/lib/store/types";
import { computeProgress, buildSCurve, sumByDateMap, type SCurvePoint } from "@/lib/calc/progress";
import {
  computeSectionProgress,
  procurementFollowup,
  manhourByDiscipline,
  getDisciplineLabel,
} from "@/lib/calc/sections";
import {
  type RGB,
  NAVY_DEEP,
  NAVY,
  INK,
  MUTED,
  LINE,
  PLAN,
  GOOD,
  WARN,
  BAD,
  WHITE,
  PW,
  ML,
  MR,
  CW,
  TOP,
  KIND_LABEL,
  PRIORITY_LABEL,
  money,
  pct1,
  qty,
  spiTxt,
  cap,
  signed,
  coverImage,
  createPdfDoc,
  createKit,
} from "@/lib/pdf/kit";

interface Input {
  project: Project;
  wbs: WbsItem[];
  planned: DateQuantityMap;
  realized: DateQuantityMap;
  billing: BillingItem[];
  procurement: ProcurementItem[];
  lookahead: LookaheadItem[];
  personnelAttendance: PersonnelAttendance[];
  machineAttendance: MachineAttendance[];
  dailyReports: DailyReport[];
  personnel: PersonnelMaster[];
  machines: MachineMaster[];
  panelName?: string;
  preparedBy?: string;
}

const COVER_SUB: RGB = [183, 196, 222];
const COVER_LABEL: RGB = [143, 163, 201];

const STATUS_LABEL: Record<string, string> = {
  draft: "Taslak",
  active: "Aktif",
  completed: "Tamamlandı",
  archived: "Arşivlendi",
};

export async function downloadManagementReportPDF(input: Input): Promise<void> {
  loadingOverlay.start("Yönetim raporu hazırlanıyor");
  try {
    return await renderReport(input);
  } finally {
    loadingOverlay.stop();
  }
}

async function renderReport(input: Input): Promise<void> {
  const {
    project, wbs, planned, realized, billing, procurement, lookahead,
    personnelAttendance, machineAttendance, dailyReports, personnel, machines,
    panelName, preparedBy,
  } = input;

  // ════════════════════════════════════════════════════════════════════
  // HESAPLAMALAR
  // ════════════════════════════════════════════════════════════════════
  const today = project.reportDate;
  const brand = panelName ?? "Proje Yönetim Platformu";
  const cur = project.budgetCurrency;

  const wbsItems = wbs.map((w) => ({ code: w.code, isLeaf: w.isLeaf, quantity: w.quantity, weight: w.weight }));
  const { planPct, realPct, spi } = computeProgress(wbsItems, planned, realized, today);
  const sections = computeSectionProgress(wbs, planned, realized, today, 1);
  const sCurve = buildSCurve(wbsItems, planned, realized, today);
  const planP = planPct * 100;
  const realP = realPct * 100;
  const devP = realP - planP;

  const elapsed = Math.max(0, daysBetween(project.startDate, today) + 1);
  const remainingDays = Math.max(0, project.durationDays - elapsed);
  const durationPct = project.durationDays > 0 ? Math.min(100, (elapsed / project.durationDays) * 100) : 0;

  const lvl = spiLevel(spi);
  const statusTone: RGB = lvl === "good" ? GOOD : lvl === "warn" ? WARN : lvl === "bad" ? BAD : MUTED;
  const statusText =
    lvl === "good" ? "PLANA UYGUN" : lvl === "warn" ? "YAKIN TAKİP" : lvl === "bad" ? "KRİTİK" : "VERİ YETERSİZ";

  // Personel
  const projectAttendance = personnelAttendance.filter((a) => a.projectId === project.id && a.present);
  const totalManhours = projectAttendance.reduce((s, a) => s + (a.hours || 0), 0);
  const uniquePersonnel = new Set(projectAttendance.map((a) => a.personnelMasterId)).size;
  const todayAtt = projectAttendance.filter((a) => a.date === today);
  const todayPersonnel = todayAtt.length;
  const todayManhours = todayAtt.reduce((s, a) => s + (a.hours || 0), 0);
  const disciplineRows = manhourByDiscipline(personnelAttendance, personnel, project.id);
  const personById = new Map(personnel.map((p) => [p.id, p]));

  const discCompany: Record<string, Record<string, number>> = {};
  for (const a of projectAttendance) {
    const p = personById.get(a.personnelMasterId);
    const disc = (p?.discipline ?? "unknown") as string;
    const company = p?.company ?? "Bilinmiyor";
    if (!discCompany[disc]) discCompany[disc] = {};
    discCompany[disc][company] = (discCompany[disc][company] || 0) + (a.hours || 0);
  }

  // Bugün firma × pozisyon
  const todayByCompany = new Map<string, Map<string, number>>();
  for (const a of todayAtt) {
    const p = personById.get(a.personnelMasterId);
    if (!p) continue;
    const m = todayByCompany.get(p.company) ?? new Map<string, number>();
    const job = p.jobTitle ?? "—";
    m.set(job, (m.get(job) ?? 0) + 1);
    todayByCompany.set(p.company, m);
  }

  // Son 7 gün
  const days7: { d: string; people: number; machines: number }[] = [];
  const projMachine = machineAttendance.filter((a) => a.projectId === project.id && a.present);
  for (let i = 6; i >= 0; i--) {
    const d = toISODate(new Date(new Date(today).getTime() - i * 86400000));
    days7.push({
      d,
      people: projectAttendance.filter((a) => a.date === d).length,
      machines: projMachine.filter((a) => a.date === d).length,
    });
  }

  // Makine
  const totalMachineHours = projMachine.reduce((s, a) => s + (a.hours || 0), 0);
  const uniqueMachines = new Set(projMachine.map((a) => a.machineMasterId)).size;
  const todayMachines = projMachine.filter((a) => a.date === today).length;
  const machineById = new Map(machines.map((m) => [m.id, m]));
  const todayMachineByCompany = new Map<string, Map<string, number>>();
  for (const a of projMachine) {
    if (a.date !== today) continue;
    const m = machineById.get(a.machineMasterId);
    if (!m) continue;
    const mm = todayMachineByCompany.get(m.company) ?? new Map<string, number>();
    mm.set(m.machineType, (mm.get(m.machineType) ?? 0) + 1);
    todayMachineByCompany.set(m.company, mm);
  }

  // Finansal
  const projBilling = billing.filter((b) => b.projectId === project.id && b.direction === "owner_incoming");
  const ownerInvoiced = projBilling.filter((b) => b.status !== "iptal").reduce((s, b) => s + b.amount, 0);
  const ownerPaid = projBilling.filter((b) => b.status === "odendi").reduce((s, b) => s + b.amount, 0);
  const contractAmount = project.totalBudget ?? 0;
  const invoicedPct = contractAmount > 0 ? (ownerInvoiced / contractAmount) * 100 : 0;
  const paidPct = contractAmount > 0 ? (ownerPaid / contractAmount) * 100 : 0;

  // Satın alma
  const projProc = procurement.filter((p) => p.projectId === project.id);
  const procOpen = projProc.filter((p) => !p.actualDeliveredDate).length;
  const procDone = projProc.length - procOpen;
  const procCritical = projProc.filter((p) => p.isCritical && !p.actualDeliveredDate).length;
  const procFollow = procurementFollowup(projProc, today).slice(0, 14);
  const procOverdue = procurementFollowup(projProc, today).filter((p) => p.hasOverdue).length;

  // Lookahead
  const openLookahead = lookahead.filter((l) => l.projectId === project.id && !l.done);
  const critOpen = openLookahead.filter((l) => l.priority === "critical").length;
  const overdueLookahead = openLookahead.filter((l) => l.date < today).length;
  const fifteen = toISODate(new Date(new Date(today).getTime() + 15 * 86400000));
  const next15 = openLookahead
    .filter((l) => (l.kind ?? "kritik_is") === "kritik_is" && l.date <= fifteen)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 15);
  const claims = openLookahead
    .filter((l) => (l.kind ?? "kritik_is") !== "kritik_is")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 12);

  // Son 7 gün faaliyetleri — kalem bazında topla
  const weekStart = days7[0].d;
  const activity: { code: string; name: string; unit: string; week: number; cum: number; total: number; planCum: number }[] = [];
  for (const w of wbs) {
    if (!w.isLeaf || w.deletedAt) continue;
    const m = realized[w.code];
    if (!m) continue;
    let week = 0;
    for (const [d, q] of Object.entries(m)) if (d >= weekStart && d <= today) week += Number(q) || 0;
    if (week <= 0) continue;
    activity.push({
      code: w.code,
      name: w.name,
      unit: w.unit || "",
      week,
      cum: sumByDateMap(realized, w.code, today),
      total: w.quantity || 0,
      planCum: sumByDateMap(planned, w.code, today),
    });
  }
  activity.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  // Son günlük rapor
  const latestReport = [...dailyReports]
    .filter((d) => d.projectId === project.id && d.reportDate <= today)
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate))[0];
  const photoSlots: { data: string; caption?: string }[] = [];
  if (latestReport?.photos?.length) {
    for (const p of latestReport.photos.slice(0, 4)) {
      const url = await resolvePhotoUrl(p.url);
      const data = await coverImage(url, 85, 57);
      if (data) photoSlots.push({ data, caption: p.caption });
    }
  }

  // ─── Ek hesaplamalar: tahmini bitiş, haftalık plan/gerçek, trendler ───
  const progressAt = (d: string) => computeProgress(wbsItems, planned, realized, d);
  const d7 = toISODate(addDays(today, -7));
  const p7 = d7 >= project.startDate ? progressAt(d7) : { planPct: 0, realPct: 0 };
  const rate7 = (realP - p7.realPct * 100) / 7; // gerçekleşen, puan / gün
  const planRate7 = (planP - p7.planPct * 100) / 7; // planlanan, puan / gün
  const spiFinish =
    spi != null && spi > 0 ? toISODate(addDays(project.startDate, Math.ceil(project.durationDays / spi) - 1)) : null;
  const spiDelay = spiFinish ? daysBetween(project.plannedEnd, spiFinish) : null;
  const requiredRate = remainingDays > 0 ? Math.max(0, 100 - realP) / remainingDays : null;
  const contractBuffer = daysBetween(project.plannedEnd, project.contractEnd);
  const delayTxt = (d: number | null) =>
    d == null ? "—" : d > 0 ? `${d} gün gecikme` : d < 0 ? `${-d} gün erken` : "Planla aynı";
  const delayTone = (d: number | null): RGB | undefined =>
    d == null ? undefined : d > contractBuffer ? BAD : d > 0 ? WARN : GOOD;

  // Haftalık plan / gerçekleşme (son 8 hafta)
  const weekly: { end: string; plan: number; real: number; dPlan: number; dReal: number; spi: number | null }[] = [];
  {
    let prev: { plan: number; real: number } | null = null;
    for (let k = 8; k >= 0; k--) {
      const end = toISODate(addDays(today, -7 * k));
      if (end < project.startDate) continue;
      const p = progressAt(end);
      const cur = { plan: p.planPct * 100, real: p.realPct * 100 };
      if (prev) weekly.push({ end, ...cur, dPlan: cur.plan - prev.plan, dReal: cur.real - prev.real, spi: p.spi });
      prev = cur;
    }
  }

  // Günlük personel / makine trendi (proje başından rapor tarihine)
  const trendDates: string[] = [];
  for (let d = project.startDate; d <= today && trendDates.length < 2000; d = toISODate(addDays(d, 1))) trendDates.push(d);
  const countBy = (list: { date: string }[]) => {
    const m = new Map<string, number>();
    for (const a of list) m.set(a.date, (m.get(a.date) ?? 0) + 1);
    return trendDates.map((d) => m.get(d) ?? 0);
  };
  const movingAvg = (v: number[]) => v.map((_, i) => {
    const s = v.slice(Math.max(0, i - 6), i + 1);
    return s.reduce((a, b) => a + b, 0) / s.length;
  });
  const pDaily = countBy(projectAttendance);
  const mDaily = countBy(projMachine);
  const pMA = movingAvg(pDaily);
  const mMA = movingAvg(mDaily);
  const peakOf = (v: number[]) => {
    let bi = 0;
    v.forEach((x, i) => { if (x > v[bi]) bi = i; });
    return { value: v[bi] ?? 0, date: trendDates[bi] ?? today };
  };
  const pPeak = peakOf(pDaily);
  const mPeak = peakOf(mDaily);
  const avgLast7 = (v: number[]) => {
    const s = v.slice(-7);
    return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0;
  };

  // Makine tipi bazında
  const machineTypeStats = new Map<string, { today: number; hours: number; days: Set<string>; companies: Set<string> }>();
  for (const a of projMachine) {
    const m = machineById.get(a.machineMasterId);
    if (!m) continue;
    const r = machineTypeStats.get(m.machineType) ?? { today: 0, hours: 0, days: new Set<string>(), companies: new Set<string>() };
    if (a.date === today) r.today++;
    r.hours += a.hours || 0;
    r.days.add(a.date);
    r.companies.add(m.company);
    machineTypeStats.set(m.machineType, r);
  }

  // Alt bölümler (L2) — imalat özeti
  const subSections = computeSectionProgress(wbs, planned, realized, today, 2).filter((s) => s.leafCount > 0);

  // ════════════════════════════════════════════════════════════════════
  // PDF
  // ════════════════════════════════════════════════════════════════════
  const { doc, autoTable } = await createPdfDoc();
  doc.setProperties({
    title: `${project.name} — Yönetim Özeti — ${formatDate(today)}`,
    subject: "Proje Yönetim Özeti",
    author: preparedBy ?? brand,
    creator: brand,
  });

  let y = TOP;
  const K = createKit(doc, autoTable, { get: () => y, set: (v) => (y = v) }, { sectionPageBreak: true });
  const { font, fill, stroke, newPage, ensure, h2, h3, paragraph, bullet, callout, kpis, table, emptyNote, ratioBar } = K;

  /** X ekseni tarih etiketleri — üst üste binmeyecek şekilde seyreltilir. */
  const xTicks = (n: number, X: (i: number) => number, label: (i: number) => string, ty: number) => {
    font("normal", 6.8, MUTED);
    const idx = Array.from(new Set(Array.from({ length: 7 }, (_, k) => Math.round((k / 6) * Math.max(0, n - 1)))));
    const MIN_GAP = 21;
    let lastX = -Infinity;
    idx.forEach((i, j) => {
      const x = X(i);
      const isLast = j === idx.length - 1;
      if (x - lastX < MIN_GAP) return;
      // Son etiket sağa yaslı — öncekiyle çakışıyorsa atla
      doc.text(label(i), x, ty, { align: n > 1 && j === 0 ? "left" : n > 1 && isLast ? "right" : "center" });
      lastX = x;
    });
  };

  const niceCeil = (v: number) => {
    if (v <= 0) return 1;
    const p = 10 ** Math.floor(Math.log10(v));
    const m = v / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  };

  /** Çok serili çizgi grafik (trendler) */
  const lineChart = (
    labels: string[],
    series: { values: number[]; color: RGB; width: number; dashed?: boolean; label: string }[],
    h = 60
  ) => {
    ensure(h + 6);
    const x0 = ML + 10;
    const x1 = ML + CW - 2;
    const y0 = y + 3;
    const y1 = y + h - 11;
    const n = labels.length;
    const top = niceCeil(Math.max(1, ...series.flatMap((s) => s.values)));
    doc.setLineWidth(0.15);
    for (const g of [0, 0.25, 0.5, 0.75, 1]) {
      const gy = y1 - g * (y1 - y0);
      stroke(g === 0 ? MUTED : LINE);
      doc.line(x0, gy, x1, gy);
      font("normal", 6.8, MUTED);
      doc.text(formatNumber(top * g, 0), x0 - 1.5, gy + 1, { align: "right" });
    }
    const X = (i: number) => (n <= 1 ? (x0 + x1) / 2 : x0 + (i / (n - 1)) * (x1 - x0));
    const Y = (v: number) => y1 - (Math.max(0, v) / top) * (y1 - y0);
    for (const s of series) {
      stroke(s.color);
      doc.setLineWidth(s.width);
      if (s.dashed) doc.setLineDashPattern([1.4, 1], 0);
      for (let i = 1; i < s.values.length; i++) doc.line(X(i - 1), Y(s.values[i - 1]), X(i), Y(s.values[i]));
      if (s.values.length === 1) {
        fill(s.color);
        doc.circle(X(0), Y(s.values[0]), 0.9, "F");
      }
      doc.setLineDashPattern([], 0);
    }
    xTicks(n, X, (i) => formatDate(labels[i]), y1 + 4);
    // Lejant
    let lx = x0;
    const ly = y + h - 1.5;
    for (const s of series) {
      stroke(s.color);
      doc.setLineWidth(s.width);
      if (s.dashed) doc.setLineDashPattern([1.4, 1], 0);
      doc.line(lx, ly - 1, lx + 7, ly - 1);
      doc.setLineDashPattern([], 0);
      font("normal", 7.5, INK);
      doc.text(s.label, lx + 9, ly);
      lx += 13 + doc.getTextWidth(s.label);
    }
    y += h + 4;
  };

  // ─── Grafik: S-eğrisi ───
  const sCurveChart = (points: SCurvePoint[], h = 72) => {
    ensure(h + 12);
    const x0 = ML + 10;
    const x1 = ML + CW - 2;
    const y0 = y + 3;
    const y1 = y + h - 8;
    const n = points.length;
    // Izgara
    doc.setLineWidth(0.15);
    for (const g of [0, 25, 50, 75, 100]) {
      const gy = y1 - (g / 100) * (y1 - y0);
      stroke(g === 0 ? MUTED : LINE);
      doc.line(x0, gy, x1, gy);
      font("normal", 6.8, MUTED);
      doc.text(`%${g}`, x0 - 1.5, gy + 1, { align: "right" });
    }
    if (n < 2) {
      font("normal", 9, MUTED);
      doc.text("Grafik için yeterli plan / gerçekleşme verisi yok.", (x0 + x1) / 2, (y0 + y1) / 2, { align: "center" });
      y += h + 4;
      return;
    }
    const X = (i: number) => x0 + (i / (n - 1)) * (x1 - x0);
    const Y = (v: number) => y1 - (Math.min(100, Math.max(0, v)) / 100) * (y1 - y0);

    // Gerçekleşen alanı
    let lastReal = -1;
    for (let i = 0; i < n; i++) {
      if (Number.isFinite(points[i].realPct)) lastReal = i;
      else break;
    }
    // Plan (kesikli)
    stroke(PLAN);
    doc.setLineWidth(0.55);
    doc.setLineDashPattern([1.6, 1.1], 0);
    for (let i = 1; i < n; i++) doc.line(X(i - 1), Y(points[i - 1].planPct), X(i), Y(points[i].planPct));
    doc.setLineDashPattern([], 0);
    // Gerçekleşen (dolu)
    if (lastReal >= 1) {
      stroke(NAVY_DEEP);
      doc.setLineWidth(0.85);
      for (let i = 1; i <= lastReal; i++) doc.line(X(i - 1), Y(points[i - 1].realPct), X(i), Y(points[i].realPct));
    }
    // Bugün
    let todayIdx = -1;
    for (let i = 0; i < n; i++) if (points[i].date <= today) todayIdx = i;
    if (todayIdx >= 0) {
      const tx = X(todayIdx);
      stroke(BAD);
      doc.setLineWidth(0.3);
      doc.setLineDashPattern([0.8, 0.8], 0);
      doc.line(tx, y0, tx, y1);
      doc.setLineDashPattern([], 0);
      font("bold", 6.8, BAD);
      doc.text(`Rapor · ${formatDate(today)}`, Math.min(tx + 1.2, x1 - 22), y0 + 2.5);
      fill(PLAN);
      doc.circle(tx, Y(points[todayIdx].planPct), 0.9, "F");
    }
    if (lastReal >= 0) {
      fill(NAVY_DEEP);
      doc.circle(X(lastReal), Y(points[lastReal].realPct), 1.1, "F");
    }
    // X ekseni etiketleri (çakışmasız)
    xTicks(n, X, (i) => formatDate(points[i].date), y1 + 4);
    // Lejant
    const ly = y + h - 0.5;
    stroke(PLAN);
    doc.setLineWidth(0.55);
    doc.setLineDashPattern([1.6, 1.1], 0);
    doc.line(x0, ly - 1, x0 + 8, ly - 1);
    doc.setLineDashPattern([], 0);
    font("normal", 7.5, INK);
    doc.text(`Planlanan (%${formatNumber(planP, 1)})`, x0 + 10, ly);
    stroke(NAVY_DEEP);
    doc.setLineWidth(0.85);
    doc.line(x0 + 52, ly - 1, x0 + 60, ly - 1);
    doc.text(`Gerçekleşen (%${formatNumber(realP, 1)})`, x0 + 62, ly);
    stroke(BAD);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([0.8, 0.8], 0);
    doc.line(x0 + 108, ly - 2.5, x0 + 108, ly + 0.5);
    doc.setLineDashPattern([], 0);
    doc.text("Rapor tarihi", x0 + 110, ly);
    y += h + 5;
  };


  // ════════════════════════════════════════════════════════════════════
  // KAPAK (1. sayfa) — kompakt antet + durum + künye + içindekiler
  // ════════════════════════════════════════════════════════════════════
  const BAND = 56;
  fill(NAVY_DEEP);
  doc.rect(0, 0, PW, BAND, "F");
  fill(NAVY);
  doc.rect(0, BAND - 2, PW, 2, "F");
  // Logo işareti + marka
  fill([30, 41, 59]);
  doc.roundedRect(ML, 10, 8, 8, 1.6, 1.6, "F");
  fill(WHITE);
  doc.rect(ML + 1.9, 14.6, 1.1, 1.9, "F");
  doc.rect(ML + 3.5, 13.3, 1.1, 3.2, "F");
  doc.rect(ML + 5.1, 12, 1.1, 4.5, "F");
  fill([5, 150, 105]);
  doc.circle(ML + 6.6, 11.7, 0.7, "F");
  font("bold", 7.5, WHITE);
  doc.text(brand.toLocaleUpperCase("tr-TR"), ML + 11, 15.3, { charSpace: 0.4 });
  font("normal", 7.5, COVER_LABEL);
  doc.text(`Rapor No: YÖ-${today.replace(/-/g, "")}  ·  ${formatDate(today)}`, PW - MR, 15.3, { align: "right" });
  font("bold", 7.5, COVER_LABEL);
  doc.text("YÖNETİM ÖZETİ  ·  PROJE DURUM RAPORU", ML, 28, { charSpace: 0.7 });
  // Proje adı
  font("bold", 20, WHITE);
  doc.text(doc.splitTextToSize(project.name, CW)[0] as string, ML, 37.5);
  const subParts = [
    project.location,
    project.installedCapacityMw != null ? `${formatNumber(project.installedCapacityMw, 2)} MW` : "",
    contractAmount ? `Sözleşme bedeli ${money(contractAmount, cur)}` : "",
  ].filter(Boolean);
  font("normal", 9, COVER_SUB);
  doc.text(doc.splitTextToSize(subParts.join("   ·   "), CW)[0] as string, ML, 45.5);

  // Genel durum
  let gy = BAND + 7;
  fill(statusTone);
  doc.roundedRect(ML, gy, 40, 8, 1.4, 1.4, "F");
  font("bold", 8, WHITE);
  doc.text(statusText, ML + 20, gy + 5.4, { align: "center", charSpace: 0.4 });
  font("normal", 9, INK);
  const verdictLine =
    lvl == null
      ? "Plan verisi yetersiz olduğundan performans endeksi hesaplanamadı."
      : `Gerçekleşen ilerleme %${formatNumber(realP, 1)}, plan %${formatNumber(planP, 1)} — sapma ${signed(devP)} puan, SPI ${spiTxt(spi)}.`;
  doc.text(doc.splitTextToSize(verdictLine, CW - 45)[0] as string, ML + 45, gy + 5.4);
  gy += 13;

  // Manşet göstergeler
  const stats: { l: string; v: string; s: string; t?: RGB }[] = [
    { l: "Planlanan", v: pct1(planP), s: "kümülatif ilerleme" },
    { l: "Gerçekleşen", v: pct1(realP), s: "kümülatif ilerleme", t: statusTone },
    { l: "SPI", v: spiTxt(spi), s: "zaman performansı", t: statusTone },
    { l: "Süre Kullanımı", v: `%${formatNumber(durationPct, 0)}`, s: `${elapsed} / ${project.durationDays} gün` },
    { l: "Kalan Süre", v: `${remainingDays} gün`, s: spiFinish ? `Tahmini bitiş ${formatDate(spiFinish)}` : `Plan bitiş ${formatDate(project.plannedEnd)}` },
  ];
  const sw = CW / stats.length;
  stroke(LINE);
  doc.setLineWidth(0.25);
  doc.line(ML, gy, ML + CW, gy);
  doc.line(ML, gy + 22, ML + CW, gy + 22);
  stats.forEach((s, i) => {
    const sx = ML + i * sw + (i > 0 ? 3 : 0);
    if (i > 0) doc.line(ML + i * sw, gy + 3, ML + i * sw, gy + 19);
    font("bold", 6.6, MUTED);
    doc.text(s.l.toLocaleUpperCase("tr-TR"), sx, gy + 6.5, { charSpace: 0.3 });
    font("bold", 14, s.t ?? NAVY_DEEP);
    doc.text(s.v, sx, gy + 14);
    font("normal", 6.8, MUTED);
    doc.text(s.s, sx, gy + 18.3);
  });
  y = gy + 29;

  // Proje künyesi
  h3("Proje Künyesi", 50);
  K.keyValues([
    ["Proje Adı", project.name],
    ["Lokasyon", project.location || "—"],
    ["İşveren", project.investorName || "—"],
    ["Yüklenici", project.mainContractorName || "—"],
    ["Kurulu Güç", project.installedCapacityMw != null ? `${formatNumber(project.installedCapacityMw, 2)} MW` : "—"],
    ["Sözleşme Bedeli", contractAmount ? money(contractAmount, cur) : "—"],
    ["Başlangıç", formatDate(project.startDate)],
    ["Plan Bitiş", formatDate(project.plannedEnd)],
    ["Sözleşme Bitiş", formatDate(project.contractEnd)],
    ["Toplam Süre", `${project.durationDays} gün`],
    ["Durum", STATUS_LABEL[project.status] ?? project.status],
    ["Rapor Tarihi", formatDate(today)],
  ]);
  const tocY = y + 2;

  // 01 — Yönetici Özeti
  newPage();
  h2("Yönetici Özeti", 60);
  const verdictTitle =
    lvl === "good"
      ? "Proje plana uygun ilerliyor"
      : lvl === "warn"
        ? "Proje plan gerisinde — yakın takip gerekiyor"
        : lvl === "bad"
          ? "Proje belirgin şekilde plan gerisinde — acil aksiyon gerekiyor"
          : "Performans değerlendirmesi için veri yetersiz";
  callout(
    verdictTitle,
    `${project.name} projesinde ${formatDate(today)} itibarıyla gerçekleşen ilerleme %${formatNumber(realP, 1)}, ` +
      `planlanan ilerleme %${formatNumber(planP, 1)} olup sapma ${signed(devP)} puandır` +
      `${spi != null ? ` (SPI ${spiTxt(spi)})` : ""}. Süre kullanımı %${formatNumber(durationPct, 0)} olup ` +
      `plan bitiş tarihine (${formatDate(project.plannedEnd)}) ${remainingDays} gün kalmıştır.` +
      (spiFinish ? ` Mevcut performansla tahmini bitiş ${formatDate(spiFinish)} (${delayTxt(spiDelay)}).` : ""),
    statusTone
  );
  kpis([
    { label: "Planlanan İlerleme", value: pct1(planP), sub: "Rapor tarihine kadar" },
    { label: "Gerçekleşen İlerleme", value: pct1(realP), sub: "Sahada tamamlanan", tone: statusTone },
    { label: "Sapma", value: `${signed(devP)} puan`, sub: "Gerçekleşen − Plan", tone: devP >= 0 ? GOOD : BAD },
    { label: "SPI", value: spiTxt(spi), sub: "≥ 0,95 sağlıklı", tone: statusTone },
    { label: "Tahmini Bitiş", value: spiFinish ? formatDate(spiFinish) : "—", sub: delayTxt(spiDelay), tone: delayTone(spiDelay) },
    { label: "Faturalanan", value: contractAmount > 0 ? pct1(invoicedPct) : "—", sub: "Sözleşme bedeline oranı" },
    { label: "Açık Kritik İş", value: String(critOpen), sub: `${overdueLookahead} kalem termini geçmiş`, tone: critOpen > 0 ? BAD : undefined },
    { label: "Bugün Sahada", value: `${todayPersonnel} kişi`, sub: `${todayMachines} makine` },
  ]);

  h3("Öne Çıkan Hususlar", 20);
  const lagging = sections
    .map((s) => ({ s, dev: (s.realPct - s.planPct) * 100 }))
    .filter((x) => x.dev < -3)
    .sort((a, b) => a.dev - b.dev)
    .slice(0, 3);
  bullet(
    `Genel ilerleme planın ${devP >= 0 ? "üzerinde" : "gerisinde"} (${signed(devP)} puan). ` +
      (lagging.length
        ? `En çok geride kalan bölümler: ${lagging.map((x) => `${x.s.name} (${signed(x.dev, 0)} puan)`).join(", ")}.`
        : "Bölümler arasında belirgin bir gerileme bulunmuyor."),
    statusTone
  );
  bullet(
    `Son 7 günde ${formatNumber(rate7 * 7, 1)} puan ilerleme kaydedildi (plan ${formatNumber(planRate7 * 7, 1)} puan). ` +
      (spiFinish ? `Mevcut performansla tahmini bitiş ${formatDate(spiFinish)} (${delayTxt(spiDelay)}).` : ""),
    rate7 >= planRate7 ? GOOD : WARN
  );
  bullet(
    critOpen > 0 || overdueLookahead > 0
      ? `${critOpen} kritik öncelikli açık iş bulunuyor; ${overdueLookahead} kalemin termini geçmiş. Önümüzdeki 15 gün içinde ${next15.length} kritik iş takip edilmeli.`
      : `Termini geçmiş açık iş yok; önümüzdeki 15 günde ${next15.length} kritik iş takipte.`,
    critOpen > 0 || overdueLookahead > 0 ? BAD : GOOD
  );
  if (projProc.length > 0) {
    bullet(
      `Satın alma: toplam ${projProc.length} kalem — ${procDone} teslim alındı, ${procOpen} açık` +
        `${procCritical > 0 ? ` (${procCritical} kritik)` : ""}.` +
        (procOverdue > 0 ? ` ${procOverdue} kalemde planlanan tarih aşılmış.` : " Gecikmiş tedarik adımı yok."),
      procOverdue > 0 ? WARN : NAVY
    );
  }
  if (contractAmount > 0) {
    bullet(
      `Faturalanan tutar sözleşme bedelinin %${formatNumber(invoicedPct, 1)} kadarı, tahsil edilen %${formatNumber(paidPct, 1)} kadarıdır ` +
        `(fiziksel ilerleme %${formatNumber(realP, 1)}).`,
      NAVY
    );
  }
  bullet(
    `Bugün sahada ${todayPersonnel} personel (${formatNumber(todayManhours, 0)} adam-saat) ve ${todayMachines} makine çalıştı; ` +
      `proje başından bu yana toplam ${formatNumber(totalManhours, 0)} adam-saat harcandı.`,
    NAVY
  );
  if (latestReport?.workStopped) {
    bullet(
      `${formatDate(latestReport.reportDate)} tarihinde iş durdu${latestReport.workStoppedReason ? `: ${latestReport.workStoppedReason}` : "."}`,
      BAD
    );
  }

  // 02 — Plan / Gerçekleşme Özeti
  h2("Plan / Gerçekleşme Özeti", 80);
  kpis([
    { label: "Planlanan İlerleme", value: pct1(planP), sub: "kümülatif" },
    { label: "Gerçekleşen İlerleme", value: pct1(realP), sub: "kümülatif", tone: statusTone },
    { label: "Sapma", value: `${signed(devP)} puan`, sub: "Gerçekleşen − Plan", tone: devP >= 0 ? GOOD : BAD },
    { label: "SPI", value: spiTxt(spi), sub: "zaman performansı", tone: statusTone },
    { label: "Geçen Süre", value: `${elapsed} gün`, sub: `%${formatNumber(durationPct, 0)} · toplam ${project.durationDays} gün` },
    { label: "Kalan Süre", value: `${remainingDays} gün`, sub: `Plan bitiş ${formatDate(project.plannedEnd)}` },
    { label: "Tahmini Bitiş", value: spiFinish ? formatDate(spiFinish) : "—", sub: "SPI'ya göre", tone: delayTone(spiDelay) },
    { label: "Tahmini Sapma", value: spiDelay == null ? "—" : `${signed(spiDelay, 0)} gün`, sub: delayTxt(spiDelay), tone: delayTone(spiDelay) },
  ]);
  h3("Takvim ve Tahmini Bitiş", 60);
  const schedRows: { k: string; v: string; n: string; t?: RGB }[] = [
    { k: "Başlangıç", v: formatDate(project.startDate), n: "" },
    { k: "Plan Bitiş", v: formatDate(project.plannedEnd), n: `Toplam ${project.durationDays} gün` },
    {
      k: "Sözleşme Bitiş",
      v: formatDate(project.contractEnd),
      n: contractBuffer > 0 ? `Plan bitişe göre ${contractBuffer} gün tampon` : contractBuffer < 0 ? `Plan bitişten ${-contractBuffer} gün önce` : "Plan bitişle aynı",
    },
    { k: "Rapor Tarihi", v: formatDate(today), n: `Proje günü ${elapsed}` },
    { k: "Geçen / Kalan Süre", v: `${elapsed} / ${remainingDays} gün`, n: `Süre kullanımı %${formatNumber(durationPct, 0)} — ilerleme %${formatNumber(realP, 1)}` },
    {
      k: "Tahmini Bitiş (SPI'ya göre)",
      v: spiFinish ? formatDate(spiFinish) : "—",
      n: spiFinish ? `${delayTxt(spiDelay)} — planlanan süre ÷ SPI` : "SPI hesaplanamadı",
      t: delayTone(spiDelay),
    },
    {
      k: "Son 7 Gün Gerçekleşen İlerleme",
      v: `${formatNumber(rate7 * 7, 1)} puan`,
      n: `Plan ${formatNumber(planRate7 * 7, 1)} puan — günlük ort. ${formatNumber(rate7, 2)} / plan ${formatNumber(planRate7, 2)}`,
      t: rate7 >= planRate7 ? GOOD : BAD,
    },
    {
      k: "Kalan İş / Kalan Süre",
      v: requiredRate == null ? "—" : `${formatNumber(requiredRate, 2)} puan/gün`,
      n: `Kalan %${formatNumber(Math.max(0, 100 - realP), 1)} iş, ${remainingDays} günde tamamlanmalı`,
    },
  ];
  table(
    ["Gösterge", "Değer", "Açıklama"],
    schedRows.map((r) => [r.k, r.v, r.n]),
    { align: ["left", "right", "left"], widths: [58, 34, "auto"], tone: (r, c) => (c === 1 ? schedRows[r].t : undefined) }
  );
  if (weekly.length > 0) {
    h3("Haftalık Plan / Gerçekleşme (Son 8 Hafta)", 30);
    table(
      ["Hafta Sonu", "Plan (kümül.)", "Gerçek. (kümül.)", "Haftalık Plan", "Haftalık Gerçek.", "Sapma (puan)", "SPI"],
      weekly.map((w) => [
        formatDate(w.end),
        pct1(w.plan),
        pct1(w.real),
        `+${formatNumber(w.dPlan, 1)}`,
        `+${formatNumber(w.dReal, 1)}`,
        signed(w.real - w.plan),
        spiTxt(w.spi),
      ]),
      {
        align: ["left", "right", "right", "right", "right", "right", "right"],
        tone: (r, c) => {
          const w = weekly[r];
          if (c === 4) return w.dReal >= w.dPlan ? GOOD : BAD;
          if (c === 5) return w.real >= w.plan ? GOOD : BAD;
          return undefined;
        },
      }
    );
  }

  // 03 — İlerleme Durumu
  h2("İlerleme Durumu · S-Eğrisi", 90);
  h3("Plan / Gerçekleşme S-Eğrisi", 75);
  sCurveChart(sCurve);
  if (sections.length > 0) {
    h3("Ana Bölümler Bazında İlerleme");
    table(
      ["Kod", "Bölüm", "Kalem", "Plan", "Gerçekleşen", "Sapma (puan)", "SPI", "Durum"],
      sections.map((s) => {
        const dv = (s.realPct - s.planPct) * 100;
        const l = spiLevel(s.spi);
        return [
          s.code,
          s.name,
          String(s.leafCount),
          pct1(s.planPct * 100),
          pct1(s.realPct * 100),
          signed(dv),
          spiTxt(s.spi),
          l === "good" ? "Planda" : l === "warn" ? "Takipte" : l === "bad" ? "Geride" : "—",
        ];
      }),
      {
        align: ["left", "left", "right", "right", "right", "right", "right", "left"],
        widths: [14, "auto", 13, 16, 22, 22, 13, 18],
        tone: (r, c) => {
          const s = sections[r];
          if (c === 5) return (s.realPct - s.planPct) * 100 >= 0 ? GOOD : BAD;
          if (c === 6 || c === 7) {
            const l = spiLevel(s.spi);
            return l === "good" ? GOOD : l === "warn" ? WARN : l === "bad" ? BAD : undefined;
          }
          return undefined;
        },
      }
    );
  }

  // 04 — İmalat Özeti
  if (subSections.length > 0) {
    h2("İmalat Özeti · Alt Bölümler", 40);
    paragraph("Alt bölümler bazında rapor tarihine kadarki plan ve gerçekleşme (ağırlıklı ilerleme).", 8.5, MUTED);
    y += 1;
    table(
      ["Kod", "Alt Bölüm", "Kalem", "Plan", "Gerçekleşen", "Sapma (puan)", "SPI", "Durum"],
      subSections.map((s) => {
        const l = spiLevel(s.spi);
        return [
          s.code,
          s.name,
          String(s.leafCount),
          pct1(s.planPct * 100),
          pct1(s.realPct * 100),
          signed((s.realPct - s.planPct) * 100),
          spiTxt(s.spi),
          s.realPct >= 0.999 ? "Tamamlandı" : l === "good" ? "Planda" : l === "warn" ? "Takipte" : l === "bad" ? "Geride" : s.realPct > 0 ? "Devam" : "Başlamadı",
        ];
      }),
      {
        align: ["left", "left", "right", "right", "right", "right", "right", "left"],
        widths: [15, "auto", 13, 16, 22, 22, 13, 21],
        fontSize: 8,
        tone: (r, c) => {
          const s = subSections[r];
          if (c === 5) return (s.realPct - s.planPct) * 100 >= 0 ? GOOD : BAD;
          if (c === 6 || c === 7) {
            if (s.realPct >= 0.999) return GOOD;
            const l = spiLevel(s.spi);
            return l === "good" ? GOOD : l === "warn" ? WARN : l === "bad" ? BAD : undefined;
          }
          return undefined;
        },
      }
    );
  }

  // 05 — Son 7 Gün Faaliyetleri
  h2("Son 7 Gün Faaliyetleri", 30);
  paragraph(
    `${formatDate(weekStart)} – ${formatDate(today)} döneminde gerçekleşme girilen iş kalemleri; dönem miktarı ile ` +
      `rapor tarihine kadarki kümülatif plan ve gerçekleşme karşılaştırması.`,
    8.5,
    MUTED
  );
  y += 1;
  if (activity.length === 0) {
    emptyNote("Bu dönemde gerçekleşme kaydı bulunmuyor.");
  } else {
    table(
      ["WBS", "İş Kalemi", "Birim", "7 Gün", "Plan (kümül.)", "Gerçek. (kümül.)", "Toplam", "Kalan", "İlerleme"],
      activity.slice(0, 30).map((a) => [
        a.code,
        a.name,
        a.unit,
        qty(a.week),
        qty(a.planCum),
        qty(a.cum),
        qty(a.total),
        qty(Math.max(0, a.total - a.cum)),
        a.total > 0 ? pct1(Math.min(100, (a.cum / a.total) * 100)) : "—",
      ]),
      {
        align: ["left", "left", "left", "right", "right", "right", "right", "right", "right"],
        widths: [15, "auto", 12, 15, 19, 20, 16, 15, 19],
        fontSize: 7.8,
        bold: [3],
        tone: (r, c) => (c === 5 ? (activity[r].cum >= activity[r].planCum ? GOOD : BAD) : undefined),
      }
    );
    if (activity.length > 30) paragraph(`… ve ${activity.length - 30} kalem daha.`, 8, MUTED);
  }

  // 06 — Personel
  h2("Personel Durumu", 70);
  kpis([
    { label: "Bugün Sahada", value: `${todayPersonnel} kişi`, sub: `${formatNumber(todayManhours, 0)} adam-saat` },
    { label: "Son 7 Gün Ortalama", value: `${formatNumber(avgLast7(pDaily), 0)} kişi`, sub: "günlük ortalama" },
    { label: "En Yüksek", value: `${pPeak.value} kişi`, sub: formatDate(pPeak.date) },
    { label: "Toplam Adam-Saat", value: formatNumber(totalManhours, 0), sub: `${uniquePersonnel} farklı personel` },
  ]);
  h3("Personel Trendi · Günlük Sahadaki Kişi Sayısı", 62);
  lineChart(trendDates, [
    { values: pDaily, color: NAVY_DEEP, width: 0.7, label: "Günlük kişi" },
    { values: pMA, color: PLAN, width: 0.5, dashed: true, label: "7 günlük ortalama" },
  ]);
  if (todayByCompany.size > 0) {
    h3("Personel Headcount · Bugün Firma Dağılımı");
    const rows = Array.from(todayByCompany.entries()).sort((a, b) => a[0].localeCompare(b[0], "tr"));
    table(
      ["Firma", "Kişi", "Pozisyonlar"],
      rows.map(([c, m]) => [
        c,
        String(Array.from(m.values()).reduce((s, v) => s + v, 0)),
        Array.from(m.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([j, n]) => `${j} ${n}`)
          .join(" · "),
      ]),
      { align: ["left", "right", "left"], widths: [48, 14, "auto"], bold: [1] }
    );
  }
  if (disciplineRows.length > 0) {
    h3("Disipline Göre Adam-Saat (Proje Başından Bu Yana)");
    table(
      ["Disiplin", "Adam-Saat", "Adam-Gün", "Kişi", "Pay", "Başlıca Firmalar"],
      disciplineRows.map((d) => {
        const entries = Object.entries(discCompany[d.discipline] ?? {}).sort((a, b) => b[1] - a[1]);
        const tot = entries.reduce((s, [, h]) => s + h, 0);
        return [
          getDisciplineLabel(d.discipline),
          formatNumber(d.hours, 0),
          formatNumber(d.manDays, 0),
          String(d.uniquePeople),
          totalManhours > 0 ? pct1((d.hours / totalManhours) * 100) : "—",
          entries
            .slice(0, 3)
            .map(([c, h]) => `${c} (%${tot > 0 ? Math.round((h / tot) * 100) : 0})`)
            .join(", "),
        ];
      }),
      { align: ["left", "right", "right", "right", "right", "left"], widths: [26, 20, 18, 12, 15, "auto"] }
    );
  }

  // 07 — Makine ve Ekipman
  h2("Makine ve Ekipman Durumu", 70);
  kpis([
    { label: "Bugün Sahada", value: `${todayMachines} makine`, sub: "çalışan" },
    { label: "Son 7 Gün Ortalama", value: `${formatNumber(avgLast7(mDaily), 1)} makine`, sub: "günlük ortalama" },
    { label: "En Yüksek", value: `${mPeak.value} makine`, sub: formatDate(mPeak.date) },
    { label: "Toplam Makine-Saat", value: formatNumber(totalMachineHours, 0), sub: `${uniqueMachines} farklı makine` },
  ]);
  h3("Makine Trendi · Günlük Sahadaki Makine Sayısı", 62);
  lineChart(trendDates, [
    { values: mDaily, color: NAVY_DEEP, width: 0.7, label: "Günlük makine" },
    { values: mMA, color: PLAN, width: 0.5, dashed: true, label: "7 günlük ortalama" },
  ]);
  if (machineTypeStats.size > 0) {
    h3("Makine Tipi Bazında Kullanım");
    const rows = Array.from(machineTypeStats.entries()).sort((a, b) => b[1].hours - a[1].hours);
    table(
      ["Makine Tipi", "Bugün", "Toplam Makine-Saat", "Çalıştığı Gün", "Firmalar"],
      rows.map(([t, r]) => [cap(t), String(r.today), formatNumber(r.hours, 0), String(r.days.size), Array.from(r.companies).join(", ")]),
      { align: ["left", "right", "right", "right", "left"], widths: [32, 16, 30, 24, "auto"] }
    );
  }
  if (todayMachineByCompany.size > 0) {
    h3("Makine Headcount · Bugün Firma Dağılımı");
    const rows = Array.from(todayMachineByCompany.entries()).sort((a, b) => a[0].localeCompare(b[0], "tr"));
    table(
      ["Firma", "Adet", "Makine Tipleri"],
      rows.map(([c, m]) => [
        c,
        String(Array.from(m.values()).reduce((s, v) => s + v, 0)),
        Array.from(m.entries())
          .map(([t, n]) => `${cap(t)} ${n}`)
          .join(" · "),
      ]),
      { align: ["left", "right", "left"], widths: [48, 14, "auto"], bold: [1] }
    );
  }

  // 05 — Finansal Durum
  if (contractAmount > 0 || projBilling.length > 0) {
    h2("Finansal Durum · İşveren Hakedişleri", 55);
    table(
      ["Kalem", "Tutar", "Sözleşmeye Oranı"],
      [
        ["Sözleşme Bedeli", money(contractAmount, cur), contractAmount > 0 ? "%100,0" : "—"],
        ["Faturalanan", money(ownerInvoiced, cur), contractAmount > 0 ? pct1(invoicedPct) : "—"],
        ["Tahsil Edilen", money(ownerPaid, cur), contractAmount > 0 ? pct1(paidPct) : "—"],
        ["Tahsil Bekleyen Fatura", money(Math.max(0, ownerInvoiced - ownerPaid), cur), contractAmount > 0 ? pct1(invoicedPct - paidPct) : "—"],
        ["Faturalanmamış Bakiye", money(Math.max(0, contractAmount - ownerInvoiced), cur), contractAmount > 0 ? pct1(Math.max(0, 100 - invoicedPct)) : "—"],
      ],
      { align: ["left", "right", "right"], widths: ["auto", 50, 36], bold: [1] }
    );
    if (contractAmount > 0) {
      ratioBar("Fiziksel ilerleme", pct1(realP), realP, NAVY_DEEP);
      ratioBar("Faturalanan", pct1(invoicedPct), invoicedPct, PLAN);
      ratioBar("Tahsil edilen", pct1(paidPct), paidPct, GOOD);
    }
  }

  // 06 — Satın Alma ve Tedarik
  if (projProc.length > 0) {
    h2("Satın Alma ve Tedarik", 50);
    kpis([
      { label: "Toplam Kalem", value: String(projProc.length) },
      { label: "Açık", value: String(procOpen) },
      { label: "Teslim Alındı", value: String(procDone), tone: GOOD },
      { label: "Kritik Açık", value: String(procCritical), tone: procCritical > 0 ? BAD : undefined },
    ]);
    if (procFollow.length === 0) {
      emptyNote("Yaklaşan veya geciken tedarik adımı bulunmuyor.");
    } else {
      h3("Takipteki Tedarik Kalemleri");
      const rows = procFollow.map((p) => {
        const m = p.nextMilestone ?? p.milestones[p.milestones.length - 1];
        const state = m.isCompleted
          ? "Tamamlandı"
          : m.daysFromToday == null
            ? "—"
            : m.daysFromToday < 0
              ? `${-m.daysFromToday} gün gecikme`
              : m.daysFromToday === 0
                ? "Bugün"
                : `${m.daysFromToday} gün kaldı`;
        return { p, m, state };
      });
      table(
        ["Malzeme", "Tedarikçi", "Kritik", "Sonraki Adım", "Plan Tarihi", "Durum"],
        rows.map(({ p, m, state }) => [
          p.item.material,
          p.item.supplier ?? "—",
          p.isCritical ? "Evet" : "",
          m.label,
          m.plannedDate ? formatDate(m.plannedDate) : "—",
          state,
        ]),
        {
          align: ["left", "left", "center", "left", "right", "right"],
          widths: ["auto", 38, 14, 22, 22, 26],
          tone: (r, c) => {
            if (c === 2 && rows[r].p.isCritical) return BAD;
            if (c === 5) return rows[r].m.isCompleted ? GOOD : rows[r].m.isOverdue ? BAD : rows[r].m.isUpcoming ? WARN : undefined;
            return undefined;
          },
        }
      );
    }
  }

  // 07 — Kritik İşler ve Aksiyon Planı
  h2("Kritik İşler ve Aksiyon Planı", 30);
  h3("Önümüzdeki 15 Gün · Kritik İşler", 15);
  if (next15.length === 0) {
    emptyNote("Önümüzdeki 15 gün için açık kritik iş bulunmuyor.");
  } else {
    table(
      ["Termin", "Konu", "Sorumlu", "Öncelik", "Durum"],
      next15.map((l) => {
        const d = daysBetween(today, l.date);
        return [
          formatDate(l.date),
          l.notes ? { content: `${l.task}\n${l.notes.split(/\r?\n/)[0]}` } : l.task,
          l.owner ?? "—",
          PRIORITY_LABEL[l.priority] ?? "—",
          d < 0 ? `${-d} gün gecikti` : d === 0 ? "Bugün" : `${d} gün kaldı`,
        ];
      }),
      {
        align: ["left", "left", "left", "left", "right"],
        widths: [20, "auto", 34, 17, 24],
        tone: (r, c) => {
          const l = next15[r];
          if (c === 3) return l.priority === "critical" ? BAD : l.priority === "high" ? WARN : undefined;
          if (c === 4) {
            const d = daysBetween(today, l.date);
            return d < 0 ? BAD : d <= 3 ? WARN : undefined;
          }
          return undefined;
        },
      }
    );
  }
  if (claims.length > 0) {
    h3("Açık Claim, Tutanak ve Yazışmalar");
    table(
      ["Tarih", "Tür", "Konu", "Sorumlu"],
      claims.map((l) => [formatDate(l.date), KIND_LABEL[l.kind ?? "kritik_is"] ?? "—", l.task, l.owner ?? "—"]),
      { align: ["left", "left", "left", "left"], widths: [20, 22, "auto", 38] }
    );
  }

  // 08 — Saha Durumu
  if (latestReport) {
    h2("Saha Durumu", 40);
    const tempTxt =
      latestReport.temperatureMin != null && latestReport.temperatureMax != null
        ? `${latestReport.temperatureMin}–${latestReport.temperatureMax} °C`
        : "";
    const meta = [
      `Son günlük rapor: ${formatDate(latestReport.reportDate)}`,
      latestReport.weather,
      tempTxt,
      latestReport.wind,
    ]
      .filter(Boolean)
      .join("   ·   ");
    paragraph(meta, 8.5, MUTED);
    y += 2;
    const blocks: [string, string | undefined][] = [
      ["Saha Özeti", latestReport.summary],
      ["Sorunlar / Engeller", latestReport.issues],
      ["Yarın İçin Plan", latestReport.tomorrowPlan],
    ];
    for (const [t, v] of blocks) {
      if (!v?.trim()) continue;
      h3(t, 10);
      paragraph(v.trim(), 9.5, INK);
      y += 2;
    }
    if (photoSlots.length > 0) {
      h3("Saha Fotoğrafları", 62);
      K.photoGrid(
        photoSlots.map((ph, i) => ({
          data: ph.data,
          caption: ph.caption || `Fotoğraf ${i + 1} · ${formatDate(latestReport.reportDate)}`,
        }))
      );
    }
  }

  // 09 — Onay
  h2("Onay", 50);
  paragraph("Bu rapor aşağıda imzası bulunan yetkililer tarafından incelenmiş ve onaylanmıştır.", 9.5, INK);
  y += 4;
  K.signatures([
    ["Hazırlayan", preparedBy ?? ""],
    ["Kontrol Eden", ""],
    ["Onaylayan", ""],
  ]);
  paragraph(
    `Bu rapor ${brand} üzerinde kayıtlı planlama, gerçekleşme, puantaj, satın alma ve hakediş verilerinden ` +
      `${formatDate(toISODate(new Date()))} tarihinde derlenmiştir.`,
    7.5,
    MUTED
  );

  // ════════════════════════════════════════════════════════════════════
  // KAPAK İÇİNDEKİLER + ÜST/ALT BİLGİ
  // ════════════════════════════════════════════════════════════════════
  K.stampPages(2, project.name, `Yönetim Özeti · ${formatDate(today)}`, brand);
  doc.setPage(1);
  let ty = tocY;
  font("bold", 9.5, NAVY);
  doc.text("İÇİNDEKİLER", ML, ty + 3.5, { charSpace: 0.3 });
  stroke(NAVY_DEEP);
  doc.setLineWidth(0.4);
  doc.line(ML, ty + 5.5, ML + CW, ty + 5.5);
  ty += 11;
  for (const t of K.toc) {
    font("bold", 8.5, PLAN);
    doc.text(t.num, ML, ty);
    font("normal", 9, INK);
    doc.text(t.title, ML + 9, ty);
    const tw = doc.getTextWidth(t.title);
    stroke(LINE);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([0.4, 1], 0);
    doc.line(ML + 11 + tw, ty - 0.8, ML + CW - 8, ty - 0.8);
    doc.setLineDashPattern([], 0);
    font("bold", 8.5, NAVY_DEEP);
    doc.text(String(t.page), ML + CW, ty, { align: "right" });
    ty += 6;
  }
  stroke(LINE);
  doc.setLineWidth(0.2);
  doc.line(ML, 286, ML + CW, 286);
  font("normal", 7, MUTED);
  doc.text(`Hazırlayan: ${preparedBy ?? "—"}`, ML, 290.5);
  doc.text(`Oluşturulma: ${formatDate(toISODate(new Date()))}`, PW / 2, 290.5, { align: "center" });
  doc.text("Gizli · Kurum içi kullanım içindir", PW - MR, 290.5, { align: "right" });

  const safeName = project.name.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "-");
  doc.save(`${safeName}-Yonetim-Ozeti-${today}.pdf`);
}

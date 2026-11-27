/**
 * Yönetim Özeti PDF — Direktör / Patron için kurumsal proje durum raporu.
 *
 * Ekran görüntüsü (html2canvas) DEĞİL: jsPDF + jspdf-autotable ile doğrudan
 * vektörel çizilir. Metinler seçilebilir/aranabilir, tablolar sayfa sonunda
 * düzgün bölünür, grafikler her zoom seviyesinde keskin kalır.
 *
 * Yapı:
 *   Kapak       — proje kimliği, genel durum, manşet göstergeler, içindekiler
 *   01 Yönetici Özeti       — değerlendirme + KPI + öne çıkan hususlar
 *   02 İlerleme Durumu      — S-eğrisi + bölüm bazında ilerleme
 *   03 Son 7 Gün Faaliyetleri
 *   04 Kaynak Durumu        — personel / makine / adam-saat
 *   05 Finansal Durum
 *   06 Satın Alma ve Tedarik
 *   07 Kritik İşler ve Aksiyon Planı
 *   08 Saha Durumu          — son günlük rapor notları + fotoğraflar
 *   09 Proje Künyesi ve Onay
 * Her iç sayfada üst bilgi + alt bilgi (Sayfa x / y).
 */

import { formatDate, formatNumber, toISODate, daysBetween, spiLevel } from "@/lib/utils";
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

// ─── Kurumsal palet (lacivert ağırlıklı, az renk) ───
type RGB = [number, number, number];
const NAVY_DEEP: RGB = [14, 42, 94];
const NAVY: RGB = [30, 58, 110];
const INK: RGB = [26, 36, 54];
const MUTED: RGB = [106, 116, 136];
const LINE: RGB = [217, 224, 236];
const SOFT: RGB = [245, 247, 250];
const PLAN: RGB = [136, 146, 164];
const GOOD: RGB = [47, 107, 79];
const WARN: RGB = [168, 107, 18];
const BAD: RGB = [154, 59, 64];
const WHITE: RGB = [255, 255, 255];
const COVER_SUB: RGB = [183, 196, 222];
const COVER_LABEL: RGB = [143, 163, 201];

// ─── Sayfa geometrisi (mm) ───
const PW = 210;
const PH = 297;
const ML = 16;
const MR = 16;
const CW = PW - ML - MR; // 178
const TOP = 24;
const BOTTOM = 280;

const STATUS_LABEL: Record<string, string> = {
  draft: "Taslak",
  active: "Aktif",
  completed: "Tamamlandı",
  archived: "Arşivlendi",
};
const KIND_LABEL: Record<string, string> = {
  kritik_is: "Kritik İş",
  claim: "Claim",
  tutanak: "Tutanak",
  yazisma: "Yazışma",
  ihbar: "İhbar",
};
const PRIORITY_LABEL: Record<string, string> = {
  critical: "Kritik",
  high: "Yüksek",
  medium: "Orta",
  low: "Düşük",
};

export async function downloadManagementReportPDF(input: Input): Promise<void> {
  loadingOverlay.start("Yönetim raporu hazırlanıyor");
  try {
    return await renderReport(input);
  } finally {
    loadingOverlay.stop();
  }
}

async function fetchFontB64(path: string): Promise<string> {
  const resp = await fetch(path);
  if (!resp.ok) throw new Error(`Font yüklenemedi: ${path}`);
  const bytes = new Uint8Array(await resp.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

/** Para — Geist'te ₺ glifi yok; para birimi kodu ile yazılır. */
function money(v: number, currency: string): string {
  const code = currency === "TRY" ? "TL" : currency;
  return `${formatNumber(v, 0)} ${code}`;
}
const pct1 = (v: number) => `%${formatNumber(v, 1)}`;
const qty = (v: number) => formatNumber(v, Math.abs(v) >= 1000 ? 0 : 1);
const spiTxt = (v: number | null | undefined) => (v == null ? "—" : formatNumber(v, 2));
const cap = (t: string) => (t ? t.charAt(0).toLocaleUpperCase("tr-TR") + t.slice(1) : t);
const signed = (v: number, d = 1) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${formatNumber(Math.abs(v), d)}`;

/** Fotoğrafı istenen orana kırpıp (cover) JPEG data URL'e çevirir. */
async function coverImage(url: string, wMm: number, hMm: number): Promise<string | null> {
  if (!url) return null;
  const img = new Image();
  img.crossOrigin = "anonymous";
  const ok = await new Promise<boolean>((res) => {
    img.onload = () => res(true);
    img.onerror = () => res(false);
    img.src = url;
    setTimeout(() => res(img.complete && img.naturalWidth > 0), 6000);
  });
  if (!ok || !img.naturalWidth) return null;
  const pxW = Math.round(wMm * 9);
  const pxH = Math.round(hMm * 9);
  const c = document.createElement("canvas");
  c.width = pxW;
  c.height = pxH;
  const g = c.getContext("2d");
  if (!g) return null;
  const s = Math.max(pxW / img.naturalWidth, pxH / img.naturalHeight);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  g.drawImage(img, (pxW - dw) / 2, (pxH - dh) / 2, dw, dh);
  try {
    return c.toDataURL("image/jpeg", 0.85);
  } catch {
    return null;
  }
}

async function renderReport(input: Input): Promise<void> {
  const {
    project, wbs, planned, realized, billing, procurement, lookahead,
    personnelAttendance, machineAttendance, dailyReports, personnel, machines,
    panelName, preparedBy,
  } = input;

  const [{ default: jsPDF }, autoTableMod, fReg, fBold] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    fetchFontB64("/fonts/Geist-Regular.ttf"),
    fetchFontB64("/fonts/Geist-Bold.ttf"),
  ]);
  const autoTable = autoTableMod.default;

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

  // ════════════════════════════════════════════════════════════════════
  // PDF
  // ════════════════════════════════════════════════════════════════════
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.addFileToVFS("Geist-Regular.ttf", fReg);
  doc.addFont("Geist-Regular.ttf", "Geist", "normal");
  doc.addFileToVFS("Geist-Bold.ttf", fBold);
  doc.addFont("Geist-Bold.ttf", "Geist", "bold");
  doc.setProperties({
    title: `${project.name} — Yönetim Özeti — ${formatDate(today)}`,
    subject: "Proje Yönetim Özeti",
    author: preparedBy ?? brand,
    creator: brand,
  });

  const font = (style: "normal" | "bold", size: number, color: RGB = INK) => {
    doc.setFont("Geist", style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
  };
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);

  let y = TOP;
  const toc: { num: string; title: string; page: number }[] = [];
  let secNo = 0;

  const newPage = () => {
    doc.addPage();
    y = TOP;
  };
  const ensure = (h: number) => {
    if (y + h > BOTTOM) newPage();
  };
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  /** Numaralı bölüm başlığı. minBody: başlığın altında aynı sayfada kalması gereken alan. */
  const h2 = (title: string, minBody = 40) => {
    secNo++;
    const num = String(secNo).padStart(2, "0");
    if (y > TOP) y += 4;
    ensure(14 + minBody);
    toc.push({ num, title, page: doc.getCurrentPageInfo().pageNumber });
    font("bold", 10, PLAN);
    doc.text(num, ML, y + 5);
    font("bold", 13.5, NAVY_DEEP);
    doc.text(title, ML + 9, y + 5);
    stroke(NAVY_DEEP);
    doc.setLineWidth(0.5);
    doc.line(ML, y + 8, ML + CW, y + 8);
    y += 13;
  };

  const h3 = (title: string, minBody = 25) => {
    ensure(9 + minBody);
    font("bold", 9.5, NAVY);
    doc.text(title.toLocaleUpperCase("tr-TR"), ML, y + 3.5, { charSpace: 0.3 });
    y += 7;
  };

  const paragraph = (text: string, size = 9.5, color: RGB = INK, indent = 0, lh = 4.6) => {
    font("normal", size, color);
    const lines = doc.splitTextToSize(text, CW - indent) as string[];
    for (const ln of lines) {
      ensure(lh);
      doc.text(ln, ML + indent, y + 3.5);
      y += lh;
    }
  };

  const bullet = (text: string, tone: RGB = NAVY) => {
    font("normal", 9.5, INK);
    const lines = doc.splitTextToSize(text, CW - 6) as string[];
    ensure(lines.length * 4.6 + 1);
    fill(tone);
    doc.circle(ML + 1.4, y + 2.3, 0.9, "F");
    for (const ln of lines) {
      doc.text(ln, ML + 5, y + 3.5);
      y += 4.6;
    }
    y += 1.2;
  };

  /** Sol çizgili vurgu kutusu */
  const callout = (title: string, text: string, tone: RGB) => {
    font("normal", 9.5, INK);
    const lines = doc.splitTextToSize(text, CW - 10) as string[];
    const h = 9 + lines.length * 4.6 + 2;
    ensure(h);
    fill(SOFT);
    doc.rect(ML, y, CW, h, "F");
    fill(tone);
    doc.rect(ML, y, 1.2, h, "F");
    font("bold", 10, tone);
    doc.text(title, ML + 5, y + 6);
    font("normal", 9.5, INK);
    lines.forEach((ln, i) => doc.text(ln, ML + 5, y + 11.5 + i * 4.6));
    y += h + 4;
  };

  /** KPI ızgarası */
  const kpis = (items: { label: string; value: string; sub?: string; tone?: RGB }[], cols = 4) => {
    const gap = 3;
    const w = (CW - gap * (cols - 1)) / cols;
    const h = 19;
    const rows = Math.ceil(items.length / cols);
    ensure(rows * (h + gap));
    items.forEach((it, i) => {
      const cx = ML + (i % cols) * (w + gap);
      const cy = y + Math.floor(i / cols) * (h + gap);
      stroke(LINE);
      doc.setLineWidth(0.25);
      doc.roundedRect(cx, cy, w, h, 1.2, 1.2, "S");
      font("bold", 6.8, MUTED);
      doc.text(it.label.toLocaleUpperCase("tr-TR"), cx + 3, cy + 5, { charSpace: 0.2 });
      font("bold", 14, it.tone ?? NAVY_DEEP);
      doc.text(it.value, cx + 3, cy + 12.2);
      if (it.sub) {
        font("normal", 7, MUTED);
        doc.text(doc.splitTextToSize(it.sub, w - 6)[0] as string, cx + 3, cy + 16.4);
      }
    });
    y += rows * (h + gap) + 2;
  };

  type Cell = string | { content: string; styles?: Record<string, unknown> };
  /** Kurumsal tablo (autoTable). */
  const table = (
    head: string[],
    body: Cell[][],
    opts: {
      align?: ("left" | "right" | "center")[];
      widths?: (number | "auto")[];
      tone?: (row: number, col: number) => RGB | undefined;
      bold?: number[];
      fontSize?: number;
    } = {}
  ) => {
    ensure(18);
    const columnStyles: Record<number, Record<string, unknown>> = {};
    head.forEach((_, i) => {
      columnStyles[i] = {
        halign: opts.align?.[i] ?? (i === 0 ? "left" : "left"),
        ...(opts.widths?.[i] != null && opts.widths[i] !== "auto" ? { cellWidth: opts.widths[i] } : {}),
        ...(opts.bold?.includes(i) ? { fontStyle: "bold" } : {}),
      };
    });
    autoTable(doc, {
      startY: y,
      head: [head],
      body: body as never,
      theme: "plain",
      margin: { left: ML, right: MR, top: TOP, bottom: PH - BOTTOM },
      styles: {
        font: "Geist",
        fontSize: opts.fontSize ?? 8.4,
        textColor: INK,
        cellPadding: { top: 1.9, bottom: 1.9, left: 2, right: 2 },
        lineColor: LINE,
        lineWidth: { bottom: 0.15 },
        valign: "middle",
        overflow: "linebreak",
      },
      headStyles: {
        fontStyle: "bold",
        textColor: NAVY_DEEP,
        fillColor: false as never,
        lineColor: NAVY_DEEP,
        lineWidth: { bottom: 0.45 },
        fontSize: 7.6,
      },
      alternateRowStyles: { fillColor: [250, 251, 253] },
      columnStyles: columnStyles as never,
      didParseCell: (data) => {
        if (data.section === "head") {
          data.cell.styles.halign = (opts.align?.[data.column.index] ?? "left") as never;
        }
        if (data.section === "body" && opts.tone) {
          const t = opts.tone(data.row.index, data.column.index);
          if (t) {
            data.cell.styles.textColor = t;
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    y = lastY() + 5;
  };

  const emptyNote = (text: string) => {
    ensure(10);
    fill(SOFT);
    doc.rect(ML, y, CW, 9, "F");
    font("normal", 9, MUTED);
    doc.text(text, ML + 4, y + 5.8);
    y += 13;
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
    // X ekseni etiketleri
    font("normal", 6.8, MUTED);
    const ticks = 6;
    for (let k = 0; k <= ticks; k++) {
      const i = Math.round((k / ticks) * (n - 1));
      doc.text(formatDate(points[i].date), X(i), y1 + 4, { align: k === 0 ? "left" : k === ticks ? "right" : "center" });
    }
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

  /** Yatay oran çubuğu */
  const ratioBar = (label: string, valueTxt: string, pct: number, tone: RGB) => {
    ensure(10);
    font("normal", 8.5, INK);
    doc.text(label, ML, y + 3);
    font("bold", 8.5, tone);
    doc.text(valueTxt, ML + CW, y + 3, { align: "right" });
    fill([238, 241, 246]);
    doc.rect(ML, y + 4.8, CW, 2.2, "F");
    fill(tone);
    doc.rect(ML, y + 4.8, (CW * Math.max(0, Math.min(100, pct))) / 100, 2.2, "F");
    y += 10;
  };

  /** Son 7 gün personel / makine sütun grafiği */
  const weekBars = () => {
    const h = 42;
    ensure(h + 4);
    const x0 = ML + 2;
    const x1 = ML + CW;
    const base = y + h - 9;
    const top = y + 6;
    const max = Math.max(1, ...days7.map((d) => Math.max(d.people, d.machines)));
    const slot = (x1 - x0) / days7.length;
    const bw = Math.min(9, slot * 0.28);
    stroke(MUTED);
    doc.setLineWidth(0.2);
    doc.line(x0, base, x1, base);
    days7.forEach((d, i) => {
      const cx = x0 + slot * i + slot / 2;
      const ph = ((base - top) * d.people) / max;
      const mh = ((base - top) * d.machines) / max;
      fill(NAVY_DEEP);
      doc.rect(cx - bw - 0.4, base - ph, bw, ph, "F");
      fill(PLAN);
      doc.rect(cx + 0.4, base - mh, bw, mh, "F");
      font("bold", 7, NAVY_DEEP);
      if (d.people > 0) doc.text(String(d.people), cx - bw / 2 - 0.4, base - ph - 1, { align: "center" });
      font("bold", 7, MUTED);
      if (d.machines > 0) doc.text(String(d.machines), cx + bw / 2 + 0.4, base - mh - 1, { align: "center" });
      font(d.d === today ? "bold" : "normal", 7, d.d === today ? NAVY_DEEP : MUTED);
      doc.text(formatDate(d.d).slice(0, 5), cx, base + 4, { align: "center" });
    });
    // Lejant
    const ly = y + h - 0.5;
    fill(NAVY_DEEP);
    doc.rect(x0, ly - 2.4, 3, 2.4, "F");
    font("normal", 7.5, INK);
    doc.text("Personel (kişi)", x0 + 4.5, ly);
    fill(PLAN);
    doc.rect(x0 + 30, ly - 2.4, 3, 2.4, "F");
    doc.text("Makine (adet)", x0 + 34.5, ly);
    y += h + 4;
  };

  // ════════════════════════════════════════════════════════════════════
  // KAPAK (sayfa 1) — içindekiler en sonda doldurulur
  // ════════════════════════════════════════════════════════════════════
  const drawCover = () => {
    fill(NAVY_DEEP);
    doc.rect(0, 0, PW, 122, "F");
    fill(NAVY);
    doc.rect(0, 118, PW, 4, "F");

    // Logo işareti
    fill([30, 41, 59]);
    doc.roundedRect(ML, 16, 10, 10, 2, 2, "F");
    fill(WHITE);
    doc.rect(ML + 2.4, 21.8, 1.4, 2.4, "F");
    doc.rect(ML + 4.4, 20.1, 1.4, 4.1, "F");
    doc.rect(ML + 6.4, 18.4, 1.4, 5.8, "F");
    fill([5, 150, 105]);
    doc.circle(ML + 8.3, 18, 0.9, "F");
    font("bold", 8.5, WHITE);
    doc.text(brand.toLocaleUpperCase("tr-TR"), ML + 13, 22.2, { charSpace: 0.5 });
    font("normal", 8, COVER_LABEL);
    doc.text(`Rapor No: YÖ-${today.replace(/-/g, "")}`, PW - MR, 22.2, { align: "right" });

    font("bold", 8.5, COVER_LABEL);
    doc.text("YÖNETİM ÖZETİ  ·  PROJE DURUM RAPORU", ML, 50, { charSpace: 0.8 });
    font("bold", 25, WHITE);
    const nameLines = (doc.splitTextToSize(project.name, CW) as string[]).slice(0, 2);
    nameLines.forEach((ln, i) => doc.text(ln, ML, 62 + i * 10));
    let cy = 62 + (nameLines.length - 1) * 10 + 8;
    const subParts = [
      project.location,
      project.installedCapacityMw != null ? `${formatNumber(project.installedCapacityMw, 2)} MW` : "",
      contractAmount ? `Sözleşme bedeli ${money(contractAmount, cur)}` : "",
    ].filter(Boolean);
    font("normal", 10, COVER_SUB);
    doc.text(subParts.join("   ·   "), ML, cy);
    cy += 4;

    // Künye satırı
    const facts: [string, string][] = [
      ["İŞVEREN", project.investorName || "—"],
      ["YÜKLENİCİ", project.mainContractorName || "—"],
      ["RAPOR TARİHİ", formatDate(today)],
      ["PROJE DURUMU", STATUS_LABEL[project.status] ?? project.status],
    ];
    stroke([60, 84, 130]);
    doc.setLineWidth(0.2);
    doc.line(ML, 96, ML + CW, 96);
    const fw = CW / facts.length;
    facts.forEach(([k, v], i) => {
      const fx = ML + i * fw;
      font("bold", 6.8, COVER_LABEL);
      doc.text(k, fx, 102.5, { charSpace: 0.4 });
      font("bold", 9.5, WHITE);
      doc.text(doc.splitTextToSize(v, fw - 4)[0] as string, fx, 108.5);
    });

    // Genel durum şeridi
    let gy = 134;
    fill(statusTone);
    doc.roundedRect(ML, gy, 44, 9, 1.5, 1.5, "F");
    font("bold", 8.5, WHITE);
    doc.text(statusText, ML + 22, gy + 6, { align: "center", charSpace: 0.4 });
    font("normal", 9.5, INK);
    const verdictLine =
      lvl == null
        ? "Plan verisi yetersiz olduğundan performans endeksi hesaplanamadı."
        : `Gerçekleşen ilerleme %${formatNumber(realP, 1)}, plan %${formatNumber(planP, 1)} — sapma ${signed(devP)} puan, SPI ${spiTxt(spi)}.`;
    doc.text(doc.splitTextToSize(verdictLine, CW - 50) as string[], ML + 49, gy + 6);
    gy += 16;

    // Manşet göstergeler
    const stats: { l: string; v: string; s: string; t?: RGB }[] = [
      { l: "Planlanan", v: pct1(planP), s: "kümülatif ilerleme" },
      { l: "Gerçekleşen", v: pct1(realP), s: "kümülatif ilerleme", t: statusTone },
      { l: "SPI", v: spiTxt(spi), s: "zaman performansı", t: statusTone },
      { l: "Süre Kullanımı", v: `%${formatNumber(durationPct, 0)}`, s: `${elapsed} / ${project.durationDays} gün` },
      { l: "Kalan Süre", v: `${remainingDays} gün`, s: `Plan bitiş ${formatDate(project.plannedEnd)}` },
    ];
    const sw = CW / stats.length;
    stroke(LINE);
    doc.setLineWidth(0.25);
    doc.line(ML, gy, ML + CW, gy);
    doc.line(ML, gy + 24, ML + CW, gy + 24);
    stats.forEach((s, i) => {
      const sx = ML + i * sw;
      if (i > 0) doc.line(sx, gy + 3, sx, gy + 21);
      font("bold", 6.8, MUTED);
      doc.text(s.l.toLocaleUpperCase("tr-TR"), sx + (i > 0 ? 3 : 0), gy + 7, { charSpace: 0.3 });
      font("bold", 15, s.t ?? NAVY_DEEP);
      doc.text(s.v, sx + (i > 0 ? 3 : 0), gy + 15);
      font("normal", 7, MUTED);
      doc.text(s.s, sx + (i > 0 ? 3 : 0), gy + 19.5);
    });
  };
  drawCover();

  // ════════════════════════════════════════════════════════════════════
  // İÇ SAYFALAR
  // ════════════════════════════════════════════════════════════════════
  newPage();

  // 01 — Yönetici Özeti
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
      `plan bitiş tarihine (${formatDate(project.plannedEnd)}) ${remainingDays} gün kalmıştır.`,
    statusTone
  );
  kpis([
    { label: "Planlanan İlerleme", value: pct1(planP), sub: "Rapor tarihine kadar" },
    { label: "Gerçekleşen İlerleme", value: pct1(realP), sub: "Sahada tamamlanan", tone: statusTone },
    { label: "Sapma", value: `${signed(devP)} puan`, sub: "Gerçekleşen − Plan", tone: devP >= 0 ? GOOD : BAD },
    { label: "SPI", value: spiTxt(spi), sub: "≥ 0,95 sağlıklı", tone: statusTone },
    { label: "Geçen Süre", value: `${elapsed} gün`, sub: `Toplam ${project.durationDays} gün` },
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

  // 02 — İlerleme Durumu
  h2("İlerleme Durumu", 90);
  h3("Plan / Gerçekleşme S-Eğrisi", 75);
  sCurveChart(sCurve);
  if (sections.length > 0) {
    h3("Bölüm Bazında İlerleme");
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

  // 03 — Son 7 Gün Faaliyetleri
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

  // 04 — Kaynak Durumu
  h2("Kaynak Durumu · Personel ve Ekipman", 70);
  kpis([
    { label: "Bugün Personel", value: String(todayPersonnel), sub: `${formatNumber(todayManhours, 0)} adam-saat` },
    { label: "Bugün Makine", value: String(todayMachines), sub: "sahada çalışan" },
    { label: "Toplam Adam-Saat", value: formatNumber(totalManhours, 0), sub: `${uniquePersonnel} farklı personel` },
    { label: "Toplam Makine-Saat", value: formatNumber(totalMachineHours, 0), sub: `${uniqueMachines} farklı makine` },
  ]);
  h3("Son 7 Gün Sahadaki Kaynak", 46);
  weekBars();
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
  if (todayByCompany.size > 0) {
    h3("Bugün Sahadaki Personel · Firma Dağılımı");
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
  if (todayMachineByCompany.size > 0) {
    h3("Bugün Sahadaki Makineler · Firma Dağılımı");
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
      const pw = (CW - 6) / 2;
      const ph = pw * (57 / 85);
      for (let i = 0; i < photoSlots.length; i += 2) {
        ensure(ph + 8);
        for (let k = 0; k < 2 && i + k < photoSlots.length; k++) {
          const s = photoSlots[i + k];
          const px = ML + k * (pw + 6);
          doc.addImage(s.data, "JPEG", px, y, pw, ph);
          stroke(LINE);
          doc.setLineWidth(0.2);
          doc.rect(px, y, pw, ph, "S");
          font("normal", 7.5, MUTED);
          doc.text(
            doc.splitTextToSize(s.caption || `Fotoğraf ${i + k + 1} · ${formatDate(latestReport.reportDate)}`, pw)[0] as string,
            px,
            y + ph + 4
          );
        }
        y += ph + 8;
      }
    }
  }

  // 09 — Proje Künyesi ve Onay
  h2("Proje Künyesi ve Onay", 90);
  const kv: [string, string][] = [
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
  ];
  const kvRows: string[][] = [];
  for (let i = 0; i < kv.length; i += 2) kvRows.push([kv[i][0], kv[i][1], kv[i + 1]?.[0] ?? "", kv[i + 1]?.[1] ?? ""]);
  autoTable(doc, {
    startY: y,
    body: kvRows,
    theme: "plain",
    margin: { left: ML, right: MR, top: TOP, bottom: PH - BOTTOM },
    styles: {
      font: "Geist",
      fontSize: 8.6,
      textColor: INK,
      cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
      lineColor: LINE,
      lineWidth: { bottom: 0.15 },
    },
    columnStyles: {
      0: { textColor: MUTED, cellWidth: 30 },
      1: { fontStyle: "bold", cellWidth: 59 },
      2: { textColor: MUTED, cellWidth: 30 },
      3: { fontStyle: "bold", cellWidth: 59 },
    },
  });
  y = lastY() + 10;

  // İmza bloğu
  ensure(40);
  font("bold", 9.5, NAVY);
  doc.text("ONAY", ML, y + 3.5, { charSpace: 0.3 });
  y += 7;
  const roles: [string, string][] = [
    ["Hazırlayan", preparedBy ?? ""],
    ["Kontrol Eden", ""],
    ["Onaylayan", ""],
  ];
  const gw = 5;
  const bw = (CW - gw * 2) / 3;
  roles.forEach(([r, name], i) => {
    const bx = ML + i * (bw + gw);
    stroke(LINE);
    doc.setLineWidth(0.25);
    doc.rect(bx, y, bw, 30, "S");
    fill(SOFT);
    doc.rect(bx, y, bw, 7, "F");
    font("bold", 8, NAVY_DEEP);
    doc.text(r.toLocaleUpperCase("tr-TR"), bx + 3, y + 4.8, { charSpace: 0.3 });
    font("normal", 7.5, MUTED);
    doc.text("Ad Soyad:", bx + 3, y + 12);
    if (name) {
      font("bold", 8, INK);
      doc.text(doc.splitTextToSize(name, bw - 20)[0] as string, bx + 17, y + 12);
    }
    font("normal", 7.5, MUTED);
    doc.text("Tarih:", bx + 3, y + 18);
    doc.text("İmza:", bx + 3, y + 24);
  });
  y += 36;
  paragraph(
    `Bu rapor ${brand} üzerinde kayıtlı planlama, gerçekleşme, puantaj, satın alma ve hakediş verilerinden ` +
      `${formatDate(toISODate(new Date()))} tarihinde derlenmiştir.`,
    7.5,
    MUTED
  );

  // ════════════════════════════════════════════════════════════════════
  // KAPAK — İÇİNDEKİLER + TÜM SAYFALARA ÜST/ALT BİLGİ
  // ════════════════════════════════════════════════════════════════════
  const total = doc.getNumberOfPages();
  doc.setPage(1);
  let ty = 190;
  font("bold", 9.5, NAVY);
  doc.text("İÇİNDEKİLER", ML, ty, { charSpace: 0.4 });
  stroke(NAVY_DEEP);
  doc.setLineWidth(0.4);
  doc.line(ML, ty + 2.5, ML + CW, ty + 2.5);
  ty += 9;
  for (const t of toc) {
    font("bold", 9, PLAN);
    doc.text(t.num, ML, ty);
    font("normal", 9.5, INK);
    doc.text(t.title, ML + 9, ty);
    const tw = doc.getTextWidth(t.title);
    stroke(LINE);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([0.4, 1], 0);
    doc.line(ML + 11 + tw, ty - 0.8, ML + CW - 8, ty - 0.8);
    doc.setLineDashPattern([], 0);
    font("bold", 9, NAVY_DEEP);
    doc.text(String(t.page), ML + CW, ty, { align: "right" });
    ty += 7;
  }
  // Kapak alt bilgisi
  stroke(LINE);
  doc.setLineWidth(0.2);
  doc.line(ML, 274, ML + CW, 274);
  font("normal", 7.5, MUTED);
  doc.text(`Hazırlayan: ${preparedBy ?? "—"}`, ML, 279);
  doc.text(`Oluşturulma: ${formatDate(toISODate(new Date()))}`, PW / 2, 279, { align: "center" });
  doc.text("Gizli · Kurum içi kullanım içindir", PW - MR, 279, { align: "right" });

  for (let p = 2; p <= total; p++) {
    doc.setPage(p);
    // Üst bilgi
    font("bold", 8, NAVY_DEEP);
    doc.text(doc.splitTextToSize(project.name, 110)[0] as string, ML, 12);
    font("normal", 8, MUTED);
    doc.text(`Yönetim Özeti · ${formatDate(today)}`, PW - MR, 12, { align: "right" });
    stroke(NAVY_DEEP);
    doc.setLineWidth(0.4);
    doc.line(ML, 15, PW - MR, 15);
    // Alt bilgi
    stroke(LINE);
    doc.setLineWidth(0.2);
    doc.line(ML, 286, PW - MR, 286);
    font("normal", 7, MUTED);
    doc.text(brand, ML, 290.5);
    doc.text("Gizli · Kurum içi kullanım içindir", PW / 2, 290.5, { align: "center" });
    font("bold", 7, NAVY_DEEP);
    doc.text(`Sayfa ${p} / ${total}`, PW - MR, 290.5, { align: "right" });
  }

  const safeName = project.name.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "-");
  doc.save(`${safeName}-Yonetim-Ozeti-${today}.pdf`);
}

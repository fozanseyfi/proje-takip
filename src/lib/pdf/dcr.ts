/**
 * DCR (Daily Construction Report) — imzalanan günlük saha raporu.
 *
 * Yönetim Özeti ile aynı kurumsal altyapı (./kit): jsPDF + autotable ile
 * vektörel çizim; ekran görüntüsü yok.
 *
 * İçerik — her gün takip edilmesi ve aksiyon alınması gerekenler önde:
 *   Antet  — proje, tarih, proje günü, hava durumu
 *   Günün göstergeleri (personel / makine / ilerleme / SPI / açık aksiyon)
 *   01 Aksiyon Gerektiren Konular — geciken / yaklaşan kritik işler, tedarik
 *      gecikmeleri, plan gerisindeki kalemler, bugün planlanıp girilmeyen işler
 *   02 Bugün Gerçekleşen İmalatlar — bu gün + bugüne kadar plan/gerçek/kalan
 *   03 Plan Gerisindeki Kalemler
 *   04 Yarın Planlanan İmalatlar + saha mühendisinin yarın planı
 *   05 Sahadaki Kaynaklar — firma bazında personel / makine (düne göre)
 *   06 Saha Notları — özet, sorunlar / engeller
 *   07 Saha Fotoğrafları
 *   08 Onay — Saha Mühendisi · Şantiye Şefi · İşveren Temsilcisi
 */

import { formatDate, formatNumber, toISODate, addDays, daysBetween, spiLevel } from "@/lib/utils";
import type {
  Project,
  DailyReport,
  PersonnelAttendance,
  MachineAttendance,
  WbsItem,
  LookaheadItem,
  ProcurementItem,
  PersonnelMaster,
  MachineMaster,
} from "@/lib/store/types";
import { loadingOverlay } from "@/lib/ui-loading";
import { computeProgress, sumByDateMap } from "@/lib/calc/progress";
import { procurementFollowup } from "@/lib/calc/sections";
import { resolvePhotoUrl } from "@/lib/data/photo-store";
import {
  type RGB,
  NAVY_DEEP,
  NAVY,
  MUTED,
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
  pct1,
  qty,
  spiTxt,
  cap,
  signed,
  coverImage,
  createPdfDoc,
  createKit,
} from "@/lib/pdf/kit";

export interface DCRInput {
  project: Project;
  report: DailyReport | undefined; // boş gün için de PDF üretilebilir
  date: string;
  personnelAttendance: PersonnelAttendance[];
  machineAttendance: MachineAttendance[];
  /** Proje WBS — aktivite isimleri / miktarları */
  wbs: WbsItem[];
  /** Gerçekleşen — wbs code → date → qty */
  realized: Record<string, Record<string, number>>;
  /** Planlanan — wbs code → date → qty */
  planned?: Record<string, Record<string, number>>;
  /** Kritik işler / tutanak / claim kayıtları */
  lookahead?: LookaheadItem[];
  procurement?: ProcurementItem[];
  personnel?: PersonnelMaster[];
  machines?: MachineMaster[];
  /** Hazırlayan (saha mühendisi) */
  preparedBy?: string;
  panelName?: string;
}

const COVER_SUB: RGB = [183, 196, 222];
const COVER_LABEL: RGB = [143, 163, 201];

export async function downloadDCRPDF(input: DCRInput): Promise<void> {
  loadingOverlay.start("DCR raporu hazırlanıyor");
  try {
    return await renderDCR(input);
  } finally {
    loadingOverlay.stop();
  }
}

type Action = { level: "bad" | "warn"; kind: string; subject: string; detail: string; owner: string; due: string };

async function renderDCR(input: DCRInput): Promise<void> {
  const {
    project,
    report,
    date,
    personnelAttendance,
    machineAttendance,
    wbs,
    realized,
    planned = {},
    lookahead = [],
    procurement = [],
    personnel = [],
    machines = [],
    preparedBy,
    panelName,
  } = input;
  const brand = panelName ?? "Proje Yönetim Platformu";
  const yesterday = toISODate(addDays(date, -1));
  const tomorrow = toISODate(addDays(date, 1));

  // ════════════════════════════════════════════════════════════════════
  // HESAPLAMALAR
  // ════════════════════════════════════════════════════════════════════
  const dayNo = daysBetween(project.startDate, date) + 1;

  // Kaynaklar
  const pAtt = (d: string) => personnelAttendance.filter((a) => a.projectId === project.id && a.date === d && a.present);
  const mAtt = (d: string) => machineAttendance.filter((a) => a.projectId === project.id && a.date === d && a.present);
  const pToday = pAtt(date);
  const pYest = pAtt(yesterday);
  const mToday = mAtt(date);
  const mYest = mAtt(yesterday);
  const personnelCount = new Set(pToday.map((a) => a.personnelMasterId)).size;
  const personnelYest = new Set(pYest.map((a) => a.personnelMasterId)).size;
  const manhours = pToday.reduce((s, a) => s + (a.hours || 0), 0);
  const machineCount = new Set(mToday.map((a) => a.machineMasterId)).size;
  const machineYest = new Set(mYest.map((a) => a.machineMasterId)).size;
  const machineHours = mToday.reduce((s, a) => s + (a.hours || 0), 0);

  const personById = new Map(personnel.map((p) => [p.id, p]));
  const machineById = new Map(machines.map((m) => [m.id, m]));
  const byCompany = new Map<string, { today: number; hours: number; yest: number }>();
  for (const a of pToday) {
    const c = personById.get(a.personnelMasterId)?.company ?? "Diğer";
    const r = byCompany.get(c) ?? { today: 0, hours: 0, yest: 0 };
    r.today++;
    r.hours += a.hours || 0;
    byCompany.set(c, r);
  }
  for (const a of pYest) {
    const c = personById.get(a.personnelMasterId)?.company ?? "Diğer";
    const r = byCompany.get(c) ?? { today: 0, hours: 0, yest: 0 };
    r.yest++;
    byCompany.set(c, r);
  }
  const machineRows = new Map<string, { company: string; type: string; count: number; hours: number }>();
  for (const a of mToday) {
    const m = machineById.get(a.machineMasterId);
    const key = `${m?.company ?? "Diğer"}|${m?.machineType ?? "—"}`;
    const r = machineRows.get(key) ?? { company: m?.company ?? "Diğer", type: m?.machineType ?? "—", count: 0, hours: 0 };
    r.count++;
    r.hours += a.hours || 0;
    machineRows.set(key, r);
  }

  // İlerleme
  const leafs = wbs.filter((w) => w.isLeaf && !w.deletedAt);
  const wbsItems = wbs.map((w) => ({ code: w.code, isLeaf: w.isLeaf, quantity: w.quantity, weight: w.weight }));
  const { planPct, realPct, spi } = computeProgress(wbsItems, planned, realized, date);
  const planP = planPct * 100;
  const realP = realPct * 100;
  const lvl = spiLevel(spi);
  const spiTone: RGB | undefined = lvl === "good" ? GOOD : lvl === "warn" ? WARN : lvl === "bad" ? BAD : undefined;

  type ActRow = { code: string; name: string; unit: string; today: number; total: number; planCum: number; cum: number };
  const rowFor = (w: WbsItem): ActRow => ({
    code: w.code,
    name: w.name,
    unit: w.unit || "",
    today: Number(realized[w.code]?.[date]) || 0,
    total: w.quantity || 0,
    planCum: sumByDateMap(planned, w.code, date),
    cum: sumByDateMap(realized, w.code, date),
  });
  const byCode = (a: { code: string }, b: { code: string }) => a.code.localeCompare(b.code, undefined, { numeric: true });

  const doneToday = leafs.filter((w) => (Number(realized[w.code]?.[date]) || 0) > 0).map(rowFor).sort(byCode);

  // Plan gerisi: bugüne kadar planı olan, gerçekleşmesi planın %90'ının altında kalan kalemler
  const behind = leafs
    .map(rowFor)
    .filter((r) => r.planCum > 0 && r.cum < r.planCum * 0.9 && r.cum < r.total)
    .map((r) => ({ ...r, ratio: r.cum / r.planCum }))
    .sort((a, b) => a.ratio - b.ratio);

  // Bugün planlanıp gerçekleşme girilmeyen
  const plannedNotDone = leafs
    .filter((w) => (Number(planned[w.code]?.[date]) || 0) > 0 && !((Number(realized[w.code]?.[date]) || 0) > 0))
    .map((w) => ({ w, plan: Number(planned[w.code]?.[date]) || 0 }));

  // Yarın planlanan
  const tomorrowRows = leafs
    .filter((w) => (Number(planned[w.code]?.[tomorrow]) || 0) > 0)
    .map((w) => ({
      ...rowFor(w),
      tomorrowPlan: Number(planned[w.code]?.[tomorrow]) || 0,
      planCumTomorrow: sumByDateMap(planned, w.code, tomorrow),
    }))
    .sort(byCode);

  // ─── Aksiyon listesi ───
  const actions: Action[] = [];
  if (report?.workStopped) {
    actions.push({
      level: "bad",
      kind: "İş Durdu",
      subject: "Sahada çalışma durdu",
      detail: report.workStoppedReason || "Sebep belirtilmedi",
      owner: "—",
      due: formatDate(date),
    });
  }
  const openLook = lookahead.filter((l) => l.projectId === project.id && !l.done);
  const in3 = toISODate(addDays(date, 3));
  for (const l of openLook.filter((x) => x.date <= in3).sort((a, b) => a.date.localeCompare(b.date))) {
    const d = daysBetween(date, l.date);
    actions.push({
      level: d < 0 || l.priority === "critical" ? "bad" : "warn",
      kind: KIND_LABEL[l.kind ?? "kritik_is"] ?? "Kritik İş",
      subject: l.task,
      detail: d < 0 ? `Termin ${-d} gün geçti` : d === 0 ? "Termin bugün" : `Termine ${d} gün kaldı`,
      owner: l.owner ?? "—",
      due: formatDate(l.date),
    });
  }
  const projProc = procurement.filter((p) => p.projectId === project.id);
  for (const f of procurementFollowup(projProc, date)) {
    const m = f.nextMilestone;
    if (!m || m.isCompleted || m.daysFromToday == null) continue;
    if (m.isOverdue) {
      actions.push({
        level: "bad",
        kind: "Tedarik",
        subject: f.item.material,
        detail: `${m.label} ${-m.daysFromToday} gün gecikti`,
        owner: f.item.supplier ?? "—",
        due: m.plannedDate ? formatDate(m.plannedDate) : "—",
      });
    } else if (m.daysFromToday <= 7) {
      actions.push({
        level: "warn",
        kind: "Tedarik",
        subject: f.item.material,
        detail: m.daysFromToday === 0 ? `${m.label} bugün` : `${m.label} için ${m.daysFromToday} gün kaldı`,
        owner: f.item.supplier ?? "—",
        due: m.plannedDate ? formatDate(m.plannedDate) : "—",
      });
    }
  }
  for (const b of behind.slice(0, 6)) {
    actions.push({
      level: b.ratio < 0.75 ? "bad" : "warn",
      kind: "Plan Gerisi",
      subject: b.name,
      detail: `Planın %${formatNumber(b.ratio * 100, 0)} kadarı gerçekleşti · ${qty(b.planCum - b.cum)} ${b.unit} eksik`,
      owner: "—",
      due: "—",
    });
  }
  for (const p of plannedNotDone.slice(0, 6)) {
    actions.push({
      level: "warn",
      kind: "Gerçekleşme Yok",
      subject: p.w.name,
      detail: `Bugün ${qty(p.plan)} ${p.w.unit} planlanmıştı, gerçekleşme girilmedi`,
      owner: "—",
      due: formatDate(date),
    });
  }
  if (personnelYest > 0 && personnelCount < personnelYest * 0.8) {
    actions.push({
      level: "warn",
      kind: "Kaynak",
      subject: "Sahadaki personel azaldı",
      detail: `Dün ${personnelYest} kişi, bugün ${personnelCount} kişi (%${formatNumber(((personnelYest - personnelCount) / personnelYest) * 100, 0)} düşüş)`,
      owner: "—",
      due: formatDate(date),
    });
  }
  actions.sort((a, b) => (a.level === b.level ? 0 : a.level === "bad" ? -1 : 1));
  const badCount = actions.filter((a) => a.level === "bad").length;

  // Fotoğraflar
  const photos: { data: string; caption: string }[] = [];
  for (const [i, p] of (report?.photos ?? []).slice(0, 6).entries()) {
    const data = await coverImage(await resolvePhotoUrl(p.url), 85, 57);
    if (data) photos.push({ data, caption: p.caption || `Fotoğraf ${i + 1}` });
  }

  // ════════════════════════════════════════════════════════════════════
  // PDF
  // ════════════════════════════════════════════════════════════════════
  const { doc, autoTable } = await createPdfDoc();
  doc.setProperties({
    title: `${project.name} — Günlük Saha Raporu — ${formatDate(date)}`,
    subject: "Günlük Saha Raporu (DCR)",
    author: preparedBy ?? brand,
    creator: brand,
  });
  let y = TOP;
  const K = createKit(doc, autoTable, { get: () => y, set: (v) => (y = v) });
  const { font, fill, h2, h3, paragraph, kpis, table, emptyNote, callout } = K;

  // ─── Antet (1. sayfa) ───
  const BAND = 44;
  fill(NAVY_DEEP);
  doc.rect(0, 0, PW, BAND, "F");
  fill(NAVY);
  doc.rect(0, BAND - 1.6, PW, 1.6, "F");
  font("bold", 7.5, COVER_LABEL);
  doc.text("GÜNLÜK SAHA RAPORU  ·  DCR", ML, 13, { charSpace: 0.7 });
  font("normal", 7.5, COVER_LABEL);
  doc.text(`Rapor No: DCR-${date.replace(/-/g, "")}`, PW - MR, 13, { align: "right" });
  font("bold", 18, WHITE);
  doc.text(doc.splitTextToSize(project.name, CW - 50)[0] as string, ML, 23.5);
  font("bold", 15, WHITE);
  doc.text(formatDate(date), PW - MR, 23.5, { align: "right" });
  font("normal", 8.5, COVER_SUB);
  const parties = [
    project.location,
    project.mainContractorName ? `Yüklenici: ${project.mainContractorName}` : "",
    project.investorName ? `İşveren: ${project.investorName}` : "",
  ]
    .filter(Boolean)
    .join("   ·   ");
  doc.text(doc.splitTextToSize(parties, CW - 50)[0] as string, ML, 30.5);
  doc.text(`Proje günü ${dayNo} / ${project.durationDays}`, PW - MR, 30.5, { align: "right" });
  const tempPart =
    report?.temperatureMin != null && report?.temperatureMax != null
      ? `${report.temperatureMin}–${report.temperatureMax} °C`
      : report?.temperatureMin != null
        ? `min ${report.temperatureMin} °C`
        : report?.temperatureMax != null
          ? `maks ${report.temperatureMax} °C`
          : "";
  const weatherLine = [report?.weather, tempPart, report?.wind].filter(Boolean).join("  ·  ") || "Hava durumu girilmedi";
  font("bold", 7, COVER_LABEL);
  doc.text("HAVA", ML, 38.5, { charSpace: 0.5 });
  font("normal", 8.5, WHITE);
  doc.text(weatherLine, ML + 10, 38.5);
  y = BAND + 6;

  if (report?.workStopped) {
    callout("İŞ DURDU", report.workStoppedReason || "Sebep belirtilmedi", BAD);
  }

  // ─── Günün göstergeleri ───
  const diff = (a: number, b: number) => (b === 0 && a === 0 ? "dün: —" : `dün ${b} · ${signed(a - b, 0)}`);
  kpis([
    { label: "Sahadaki Personel", value: String(personnelCount), sub: diff(personnelCount, personnelYest) },
    { label: "Adam-Saat", value: formatNumber(manhours, 0), sub: "bugün" },
    { label: "Sahadaki Makine", value: String(machineCount), sub: diff(machineCount, machineYest) },
    { label: "Makine-Saat", value: formatNumber(machineHours, 0), sub: "bugün" },
    { label: "İmalat Girilen Kalem", value: String(doneToday.length), sub: `${plannedNotDone.length} planlı kalem girilmedi` },
    { label: "Genel İlerleme", value: pct1(realP), sub: `plan ${pct1(planP)} · ${signed(realP - planP)} puan`, tone: spiTone },
    { label: "SPI", value: spiTxt(spi), sub: "≥ 0,95 sağlıklı", tone: spiTone },
    {
      label: "Aksiyon Gerektiren",
      value: String(actions.length),
      sub: `${badCount} acil`,
      tone: badCount > 0 ? BAD : actions.length ? WARN : GOOD,
    },
  ]);

  // 01 — Aksiyon
  h2("Aksiyon Gerektiren Konular", 25);
  if (actions.length === 0) {
    emptyNote("Bugün için aksiyon gerektiren konu bulunmuyor.");
  } else {
    table(
      ["Durum", "Tür", "Konu", "Açıklama", "Sorumlu", "Termin"],
      actions.map((a) => [a.level === "bad" ? "Acil" : "Takip", a.kind, a.subject, a.detail, a.owner, a.due]),
      {
        align: ["left", "left", "left", "left", "left", "right"],
        widths: [13, 24, 44, "auto", 26, 20],
        fontSize: 7.8,
        tone: (r, c) => (c === 0 ? (actions[r].level === "bad" ? BAD : WARN) : undefined),
      }
    );
  }

  // 02 — Bugün gerçekleşen
  h2("Bugün Gerçekleşen İmalatlar", 25);
  if (doneToday.length === 0) {
    emptyNote("Bu gün için gerçekleşme kaydı girilmedi.");
  } else {
    table(
      ["WBS", "İş Kalemi", "Birim", "Bu Gün", "Plan (bugüne k.)", "Gerçek. (bugüne k.)", "Toplam", "Kalan", "Gerç./Plan"],
      doneToday.map((r) => [
        r.code,
        r.name,
        r.unit,
        qty(r.today),
        qty(r.planCum),
        `${qty(r.cum)}  (%${formatNumber(r.total > 0 ? (r.cum / r.total) * 100 : 0, 0)})`,
        qty(r.total),
        qty(Math.max(0, r.total - r.cum)),
        r.planCum > 0 ? `%${formatNumber((r.cum / r.planCum) * 100, 0)}` : "—",
      ]),
      {
        align: ["left", "left", "left", "right", "right", "right", "right", "right", "right"],
        widths: [14, "auto", 11, 14, 18, 24, 15, 14, 17],
        fontSize: 7.6,
        bold: [3],
        tone: (r, c) => {
          const x = doneToday[r];
          if (c === 3) return GOOD;
          if (c === 8 && x.planCum > 0) return x.cum >= x.planCum ? GOOD : x.cum >= x.planCum * 0.9 ? WARN : BAD;
          return undefined;
        },
      }
    );
  }

  // 03 — Plan gerisi
  h2("Plan Gerisindeki Kalemler", 25);
  paragraph(
    "Rapor tarihine kadar planlanan miktarın %90'ının altında gerçekleşen kalemler (en geride olandan başlayarak).",
    8.5,
    MUTED
  );
  y += 1;
  if (behind.length === 0) {
    emptyNote("Plan gerisinde kalan kalem yok.");
  } else {
    table(
      ["WBS", "İş Kalemi", "Birim", "Plan (bugüne k.)", "Gerçek. (bugüne k.)", "Eksik", "Gerç./Plan"],
      behind.slice(0, 15).map((r) => [
        r.code,
        r.name,
        r.unit,
        qty(r.planCum),
        qty(r.cum),
        qty(r.planCum - r.cum),
        `%${formatNumber(r.ratio * 100, 0)}`,
      ]),
      {
        align: ["left", "left", "left", "right", "right", "right", "right"],
        widths: [15, "auto", 12, 24, 26, 18, 18],
        tone: (r, c) => (c === 5 || c === 6 ? (behind[r].ratio < 0.75 ? BAD : WARN) : undefined),
      }
    );
    if (behind.length > 15) paragraph(`… ve ${behind.length - 15} kalem daha.`, 8, MUTED);
  }

  // 04 — Yarın
  h2("Yarın Planlanan İmalatlar", 25);
  if (tomorrowRows.length === 0) {
    emptyNote(`${formatDate(tomorrow)} için planlanmış imalat bulunmuyor.`);
  } else {
    table(
      ["WBS", "İş Kalemi", "Birim", "Yarın Plan", "Plan Kümül. (yarın)", "Gerçek. (bugüne k.)", "Kalan"],
      tomorrowRows.map((r) => [
        r.code,
        r.name,
        r.unit,
        qty(r.tomorrowPlan),
        qty(r.planCumTomorrow),
        qty(r.cum),
        qty(Math.max(0, r.total - r.cum)),
      ]),
      {
        align: ["left", "left", "left", "right", "right", "right", "right"],
        widths: [15, "auto", 12, 18, 26, 26, 18],
        bold: [3],
      }
    );
  }
  if (report?.tomorrowPlan?.trim()) {
    h3("Saha Mühendisinin Yarın Planı", 10);
    paragraph(report.tomorrowPlan.trim());
    y += 2;
  }

  // 05 — Kaynaklar
  h2("Sahadaki Kaynaklar", 25);
  if (byCompany.size === 0) {
    emptyNote("Bu gün için puantaj kaydı yok.");
  } else {
    const rows = Array.from(byCompany.entries()).sort((a, b) => b[1].today - a[1].today);
    const bold = (t: string) => ({ content: t, styles: { fontStyle: "bold" } });
    table(
      ["Firma", "Bugün (kişi)", "Adam-Saat", "Dün (kişi)", "Fark"],
      [
        ...rows.map(([c, r]) => [c, String(r.today), formatNumber(r.hours, 0), String(r.yest), signed(r.today - r.yest, 0)]),
        [
          bold("Toplam"),
          bold(String(personnelCount)),
          bold(formatNumber(manhours, 0)),
          bold(String(personnelYest)),
          bold(signed(personnelCount - personnelYest, 0)),
        ],
      ],
      {
        align: ["left", "right", "right", "right", "right"],
        widths: ["auto", 24, 24, 24, 18],
        tone: (r, c) => {
          if (c !== 4 || r >= rows.length) return undefined;
          const d = rows[r][1].today - rows[r][1].yest;
          return d < 0 ? BAD : d > 0 ? GOOD : undefined;
        },
      }
    );
  }
  if (machineRows.size > 0) {
    h3("Makine ve Ekipman", 15);
    const rows = Array.from(machineRows.values()).sort((a, b) => a.company.localeCompare(b.company, "tr"));
    table(
      ["Firma", "Makine Tipi", "Adet", "Makine-Saat"],
      rows.map((r) => [r.company, cap(r.type), String(r.count), formatNumber(r.hours, 0)]),
      { align: ["left", "left", "right", "right"], widths: ["auto", 50, 18, 24] }
    );
  }

  // 06 — Saha notları
  h2("Saha Notları", 20);
  let anyNote = false;
  for (const [t, v] of [
    ["Saha Özeti", report?.summary],
    ["Sorunlar / Engeller", report?.issues],
  ] as [string, string | undefined][]) {
    if (!v?.trim()) continue;
    anyNote = true;
    h3(t, 10);
    paragraph(v.trim());
    y += 2;
  }
  if (!anyNote) emptyNote("Saha notu girilmedi.");

  // 07 — Fotoğraflar
  if (photos.length > 0) {
    h2("Saha Fotoğrafları", 62);
    K.photoGrid(photos);
  }

  // 08 — Onay
  h2("Onay", 40);
  K.signatures([
    ["Saha Mühendisi", preparedBy ?? ""],
    ["Şantiye Şefi", ""],
    ["İşveren Temsilcisi", ""],
  ]);
  paragraph(
    `Bu rapor ${brand} üzerindeki puantaj, gerçekleşme, planlama ve kritik iş kayıtlarından ${formatDate(toISODate(new Date()))} tarihinde derlenmiştir.`,
    7.5,
    MUTED
  );

  // Alt bilgi tüm sayfalarda; üst bilgi 2. sayfadan itibaren (1. sayfada antet var)
  K.stampPages(1, `${project.name} · Günlük Saha Raporu`, formatDate(date), brand, 2);

  const safeName = project.name.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "-");
  doc.save(`DCR-${safeName}-${date}.pdf`);
}

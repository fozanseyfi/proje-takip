/**
 * Master liste PDF üretimi (personel, makine, taşeron, ekip listeleri).
 *
 * Kurumsal format (./kit): 1. sayfada lacivert antet, sonraki sayfalarda üst
 * bilgi, tüm sayfalarda standart alt bilgi. Tablo jspdf-autotable ile vektörel
 * çizilir — metin seçilebilir, sayfa sonunda başlık tekrarıyla bölünür.
 */

import { formatDate, toISODate } from "@/lib/utils";
import { loadingOverlay } from "@/lib/ui-loading";
import { createPdfDoc, createKit, drawReportBand, corporateTable, CW, ML, MR, TOP, PH, BOTTOM } from "@/lib/pdf/kit";

export interface MasterPDFColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  /** CSS genişliği ("80px" veya "20%") — mm'ye çevrilir */
  width?: string;
  mono?: boolean;
  bold?: boolean;
}

export interface MasterPDFOptions {
  title: string;
  subtitle?: string;
  /** Eski renk teması — kurumsal formatta tüm listeler aynı paleti kullanır */
  tone?: "purple" | "yellow" | "accent" | "blue";
  projectName?: string;
  columns: MasterPDFColumn[];
  rows: Record<string, string | number>[];
  fileName: string;
}

/** Eski HTML genişliği (A4 = 794px) → mm */
function widthMm(w?: string): number | undefined {
  if (!w) return undefined;
  const v = parseFloat(w);
  if (!Number.isFinite(v)) return undefined;
  if (w.trim().endsWith("%")) return (CW * v) / 100;
  // HTML'de padding genişliğe dahil değildi → hücre iç boşluğu (2+2 mm) eklenir
  return Math.max(10, (v * CW) / 794 + 4);
}

export async function downloadMasterListPDF(opts: MasterPDFOptions): Promise<void> {
  loadingOverlay.start(`${opts.title} hazırlanıyor`);
  try {
    return await renderMasterList(opts);
  } finally {
    loadingOverlay.stop();
  }
}

async function renderMasterList(opts: MasterPDFOptions): Promise<void> {
  const { doc, autoTable } = await createPdfDoc();
  const today = formatDate(toISODate(new Date()));
  doc.setProperties({ title: opts.title });
  let y = TOP;
  const K = createKit(doc, autoTable, { get: () => y, set: (v) => (y = v) });

  const bandH = drawReportBand(doc, {
    eyebrow: opts.projectName ? `Liste  ·  ${opts.projectName}` : "Liste",
    title: opts.title,
    subtitle: opts.subtitle,
    rightTop: `Rapor günü: ${today}`,
    rightBig: String(opts.rows.length),
    rightSub: "kayıt",
  });

  const columnStyles: Record<number, Record<string, unknown>> = {};
  // Sabit genişlikler toplamı esnek sütunlara yer bırakmalı (en fazla %75)
  const fixed = opts.columns.map((c) => widthMm(c.width));
  const fixedSum = fixed.reduce<number>((s, w) => s + (w ?? 0), 0);
  const scale = fixedSum > CW * 0.75 ? (CW * 0.75) / fixedSum : 1;
  opts.columns.forEach((c, i) => {
    const raw = fixed[i];
    const w = raw ? raw * scale : undefined;
    columnStyles[i] = {
      halign: c.align ?? "left",
      ...(w ? { cellWidth: w } : {}),
      ...(c.bold ? { fontStyle: "bold" } : {}),
      ...(c.mono ? { fontSize: 7.8 } : {}),
    };
  });

  autoTable(doc, {
    ...corporateTable(8.2),
    startY: bandH + 6,
    margin: { left: ML, right: MR, top: TOP, bottom: PH - BOTTOM },
    head: [opts.columns.map((c) => c.label)],
    body:
      opts.rows.length === 0
        ? [[{ content: "Kayıt yok.", colSpan: opts.columns.length, styles: { halign: "center", textColor: [106, 116, 136] } }]]
        : opts.rows.map((r) => opts.columns.map((c) => String(r[c.key] ?? ""))),
    columnStyles: columnStyles as never,
    didParseCell: (data) => {
      if (data.section === "head") data.cell.styles.halign = (opts.columns[data.column.index]?.align ?? "left") as never;
    },
  });

  K.stampPages(`${opts.title}${opts.projectName ? ` · ${opts.projectName}` : ""}`, today, 2);
  doc.save(`${opts.fileName}.pdf`);
}

/**
 * Kurumsal PDF kiti — Yönetim Özeti ve Günlük Rapor (DCR) ortak altyapısı.
 *
 * jsPDF + jspdf-autotable ile vektörel çizim (ekran görüntüsü yok):
 *   - Geist Regular/Bold (Türkçe karakter desteği)
 *   - Lacivert ağırlıklı, az renkli kurumsal palet
 *   - Numaralı bölüm başlıkları, KPI ızgarası, tablo, vurgu kutusu, madde işaretleri
 *   - İç sayfalarda üst bilgi + "Sayfa x / y" alt bilgisi
 *
 * Akış (y) çağıran tarafta tutulur; kit `io.get/io.set` ile okur/yazar. Böylece
 * çağıran kendi grafiklerini aynı y akışına çizebilir.
 */

import { formatNumber } from "@/lib/utils";
import type { jsPDF as JsPDF } from "jspdf";

export type RGB = [number, number, number];
export const NAVY_DEEP: RGB = [14, 42, 94];
export const NAVY: RGB = [30, 58, 110];
export const INK: RGB = [26, 36, 54];
export const MUTED: RGB = [106, 116, 136];
export const LINE: RGB = [217, 224, 236];
export const SOFT: RGB = [245, 247, 250];
export const PLAN: RGB = [136, 146, 164];
export const GOOD: RGB = [47, 107, 79];
export const WARN: RGB = [168, 107, 18];
export const BAD: RGB = [154, 59, 64];
export const WHITE: RGB = [255, 255, 255];

export const PW = 210;
export const PH = 297;
export const ML = 16;
export const MR = 16;
export const CW = PW - ML - MR; // 178
export const TOP = 24;
export const BOTTOM = 280;

export const KIND_LABEL: Record<string, string> = {
  kritik_is: "Kritik İş",
  claim: "Claim",
  tutanak: "Tutanak",
  yazisma: "Yazışma",
  ihbar: "İhbar",
};
export const PRIORITY_LABEL: Record<string, string> = {
  critical: "Kritik",
  high: "Yüksek",
  medium: "Orta",
  low: "Düşük",
};

/** Para — Geist'te ₺ glifi yok; para birimi kodu ile yazılır. */
export function money(v: number, currency: string): string {
  const code = currency === "TRY" ? "TL" : currency;
  return `${formatNumber(v, 0)} ${code}`;
}
export const pct1 = (v: number) => `%${formatNumber(v, 1)}`;
export const qty = (v: number) => formatNumber(v, Math.abs(v) >= 1000 ? 0 : 1);
export const spiTxt = (v: number | null | undefined) => (v == null ? "—" : formatNumber(v, 2));
export const cap = (t: string) => (t ? t.charAt(0).toLocaleUpperCase("tr-TR") + t.slice(1) : t);
export const signed = (v: number, d = 1) =>
  `${v > 0 ? "+" : v < 0 ? "−" : ""}${formatNumber(Math.abs(v), d)}`;

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

/** jsPDF + autotable + Geist fontları yüklü A4 dikey belge. */
export async function createPdfDoc() {
  const [{ default: jsPDF }, autoTableMod, fReg, fBold] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    fetchFontB64("/fonts/Geist-Regular.ttf"),
    fetchFontB64("/fonts/Geist-Bold.ttf"),
  ]);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.addFileToVFS("Geist-Regular.ttf", fReg);
  doc.addFont("Geist-Regular.ttf", "Geist", "normal");
  doc.addFileToVFS("Geist-Bold.ttf", fBold);
  doc.addFont("Geist-Bold.ttf", "Geist", "bold");
  return { doc, autoTable: autoTableMod.default };
}

/** Fotoğrafı istenen orana kırpıp (cover) JPEG data URL'e çevirir. */
export async function coverImage(url: string, wMm: number, hMm: number): Promise<string | null> {
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

type AutoTable = Awaited<ReturnType<typeof createPdfDoc>>["autoTable"];
export type Cell = string | { content: string; styles?: Record<string, unknown> };
export interface TableOpts {
  align?: ("left" | "right" | "center")[];
  widths?: (number | "auto")[];
  tone?: (row: number, col: number) => RGB | undefined;
  bold?: number[];
  fontSize?: number;
}

export function createKit(
  doc: JsPDF,
  autoTable: AutoTable,
  io: { get: () => number; set: (v: number) => void },
  opts: { sectionPageBreak?: boolean } = {}
) {
  const Y = io.get;
  const setY = io.set;
  const toc: { num: string; title: string; page: number }[] = [];
  let secNo = 0;

  const font = (style: "normal" | "bold", size: number, color: RGB = INK) => {
    doc.setFont("Geist", style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
  };
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);

  const newPage = () => {
    doc.addPage();
    setY(TOP);
  };
  const ensure = (h: number) => {
    if (Y() + h > BOTTOM) newPage();
  };
  const lastTableY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  /** Numaralı bölüm başlığı. sectionPageBreak açıksa her bölüm yeni sayfada başlar. */
  const h2 = (title: string, minBody = 40) => {
    secNo++;
    const num = String(secNo).padStart(2, "0");
    if (opts.sectionPageBreak && Y() > TOP) newPage();
    else if (Y() > TOP) setY(Y() + 4);
    ensure(14 + minBody);
    const y = Y();
    toc.push({ num, title, page: doc.getCurrentPageInfo().pageNumber });
    font("bold", 10, PLAN);
    doc.text(num, ML, y + 5);
    font("bold", 13.5, NAVY_DEEP);
    doc.text(title, ML + 9, y + 5);
    stroke(NAVY_DEEP);
    doc.setLineWidth(0.5);
    doc.line(ML, y + 8, ML + CW, y + 8);
    setY(y + 13);
  };

  const h3 = (title: string, minBody = 25) => {
    ensure(9 + minBody);
    font("bold", 9.5, NAVY);
    doc.text(title.toLocaleUpperCase("tr-TR"), ML, Y() + 3.5, { charSpace: 0.3 });
    setY(Y() + 7);
  };

  const paragraph = (text: string, size = 9.5, color: RGB = INK, indent = 0, lh = 4.6) => {
    font("normal", size, color);
    const lines = doc.splitTextToSize(text, CW - indent) as string[];
    for (const ln of lines) {
      ensure(lh);
      doc.text(ln, ML + indent, Y() + 3.5);
      setY(Y() + lh);
    }
  };

  const bullet = (text: string, tone: RGB = NAVY) => {
    font("normal", 9.5, INK);
    const lines = doc.splitTextToSize(text, CW - 6) as string[];
    ensure(lines.length * 4.6 + 1);
    fill(tone);
    doc.circle(ML + 1.4, Y() + 2.3, 0.9, "F");
    for (const ln of lines) {
      doc.text(ln, ML + 5, Y() + 3.5);
      setY(Y() + 4.6);
    }
    setY(Y() + 1.2);
  };

  /** Sol çizgili vurgu kutusu */
  const callout = (title: string, text: string, tone: RGB) => {
    font("normal", 9.5, INK);
    const lines = doc.splitTextToSize(text, CW - 10) as string[];
    const h = 9 + lines.length * 4.6 + 2;
    ensure(h);
    const y = Y();
    fill(SOFT);
    doc.rect(ML, y, CW, h, "F");
    fill(tone);
    doc.rect(ML, y, 1.2, h, "F");
    font("bold", 10, tone);
    doc.text(title, ML + 5, y + 6);
    font("normal", 9.5, INK);
    lines.forEach((ln, i) => doc.text(ln, ML + 5, y + 11.5 + i * 4.6));
    setY(y + h + 4);
  };

  /** KPI ızgarası */
  const kpis = (items: { label: string; value: string; sub?: string; tone?: RGB }[], cols = 4) => {
    const gap = 3;
    const w = (CW - gap * (cols - 1)) / cols;
    const h = 19;
    const rows = Math.ceil(items.length / cols);
    ensure(rows * (h + gap));
    const y = Y();
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
    setY(y + rows * (h + gap) + 2);
  };

  /** Kurumsal tablo (autoTable) — sayfa sonunda başlık tekrarıyla bölünür. */
  const table = (head: string[], body: Cell[][], o: TableOpts = {}) => {
    ensure(18);
    const columnStyles: Record<number, Record<string, unknown>> = {};
    head.forEach((_, i) => {
      columnStyles[i] = {
        halign: o.align?.[i] ?? "left",
        ...(o.widths?.[i] != null && o.widths[i] !== "auto" ? { cellWidth: o.widths[i] } : {}),
        ...(o.bold?.includes(i) ? { fontStyle: "bold" } : {}),
      };
    });
    autoTable(doc, {
      startY: Y(),
      head: [head],
      body: body as never,
      theme: "plain",
      margin: { left: ML, right: MR, top: TOP, bottom: PH - BOTTOM },
      styles: {
        font: "Geist",
        fontSize: o.fontSize ?? 8.4,
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
          data.cell.styles.halign = (o.align?.[data.column.index] ?? "left") as never;
        }
        if (data.section === "body" && o.tone) {
          const t = o.tone(data.row.index, data.column.index);
          if (t) {
            data.cell.styles.textColor = t;
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    setY(lastTableY() + 5);
  };

  /** İki sütunlu künye tablosu (etiket / değer × 2) */
  const keyValues = (pairs: [string, string][]) => {
    const rows: string[][] = [];
    for (let i = 0; i < pairs.length; i += 2) {
      rows.push([pairs[i][0], pairs[i][1], pairs[i + 1]?.[0] ?? "", pairs[i + 1]?.[1] ?? ""]);
    }
    autoTable(doc, {
      startY: Y(),
      body: rows,
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
    setY(lastTableY() + 6);
  };

  const emptyNote = (text: string) => {
    ensure(10);
    const y = Y();
    fill(SOFT);
    doc.rect(ML, y, CW, 9, "F");
    font("normal", 9, MUTED);
    doc.text(text, ML + 4, y + 5.8);
    setY(y + 13);
  };

  /** Yatay oran çubuğu */
  const ratioBar = (label: string, valueTxt: string, pct: number, tone: RGB) => {
    ensure(10);
    const y = Y();
    font("normal", 8.5, INK);
    doc.text(label, ML, y + 3);
    font("bold", 8.5, tone);
    doc.text(valueTxt, ML + CW, y + 3, { align: "right" });
    fill([238, 241, 246]);
    doc.rect(ML, y + 4.8, CW, 2.2, "F");
    fill(tone);
    doc.rect(ML, y + 4.8, (CW * Math.max(0, Math.min(100, pct))) / 100, 2.2, "F");
    setY(y + 10);
  };

  /** İmza kutuları */
  const signatures = (roles: [string, string][]) => {
    ensure(38);
    const y = Y();
    const gw = 5;
    const bw = (CW - gw * (roles.length - 1)) / roles.length;
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
    setY(y + 36);
  };

  /** Fotoğraf ızgarası (2 sütun) */
  const photoGrid = (photos: { data: string; caption: string }[]) => {
    const pw = (CW - 6) / 2;
    const ph = pw * (57 / 85);
    for (let i = 0; i < photos.length; i += 2) {
      ensure(ph + 8);
      const y = Y();
      for (let k = 0; k < 2 && i + k < photos.length; k++) {
        const s = photos[i + k];
        const px = ML + k * (pw + 6);
        doc.addImage(s.data, "JPEG", px, y, pw, ph);
        stroke(LINE);
        doc.setLineWidth(0.2);
        doc.rect(px, y, pw, ph, "S");
        font("normal", 7.5, MUTED);
        doc.text(doc.splitTextToSize(s.caption, pw)[0] as string, px, y + ph + 4);
      }
      setY(y + ph + 8);
    }
  };

  /** İç sayfalara üst/alt bilgi (from sayfasından itibaren) */
  const stampPages = (
    from: number,
    headerLeft: string,
    headerRight: string,
    footerLeft: string,
    headerFrom = from
  ) => {
    const total = doc.getNumberOfPages();
    for (let p = from; p <= total; p++) {
      doc.setPage(p);
      if (p >= headerFrom) stampHeader(headerLeft, headerRight);
      stroke(LINE);
      doc.setLineWidth(0.2);
      doc.line(ML, 286, PW - MR, 286);
      font("normal", 7, MUTED);
      doc.text(footerLeft, ML, 290.5);
      doc.text("Gizli · Kurum içi kullanım içindir", PW / 2, 290.5, { align: "center" });
      font("bold", 7, NAVY_DEEP);
      doc.text(`Sayfa ${p} / ${total}`, PW - MR, 290.5, { align: "right" });
    }
    return total;
  };
  const stampHeader = (headerLeft: string, headerRight: string) => {
    {
      font("bold", 8, NAVY_DEEP);
      doc.text(doc.splitTextToSize(headerLeft, 110)[0] as string, ML, 12);
      font("normal", 8, MUTED);
      doc.text(headerRight, PW - MR, 12, { align: "right" });
      stroke(NAVY_DEEP);
      doc.setLineWidth(0.4);
      doc.line(ML, 15, PW - MR, 15);
    }
  };

  return {
    toc,
    font,
    fill,
    stroke,
    newPage,
    ensure,
    h2,
    h3,
    paragraph,
    bullet,
    callout,
    kpis,
    table,
    keyValues,
    emptyNote,
    ratioBar,
    signatures,
    photoGrid,
    stampPages,
  };
}

/**
 * Kritik İş / Tutanak / Claim kaydını imzaya hazır, renksiz bir Word (.docx)
 * tutanağına çevirir.
 *
 * Düzen (A4, tek sayfa):
 *   TUTANAKTIR
 *   Bilgi tablosu: proje, yer, konu, tür, tarih, sorumlu
 *   Konu özeti + notlar (not yoksa elle doldurmak için boş satırlar)
 *   Kapanış cümlesi
 *   İmza tablosu: Yüklenici · İşveren · Kontrol / Müşavir
 */

import type { LookaheadItem, LookaheadKind, Project } from "@/lib/store/types";
import { formatDate, toISODate } from "@/lib/utils";

const KIND_LABEL: Record<LookaheadKind, string> = {
  kritik_is: "Kritik İş",
  claim: "Claim",
  tutanak: "Tutanak",
  yazisma: "Yazışma",
  ihbar: "İhbar",
};

const FONT = "Arial";

export async function downloadTutanakDocx(project: Project, item: LookaheadItem): Promise<void> {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
    TableLayoutType,
    VerticalAlign,
  } = await import("docx");

  // Sabit (DXA) genişlikler — iOS/Android önizleyicileri yüzde genişliği desteklemiyor
  const PAGE_W = 11906; // A4
  const MARGIN_X = 1247;
  const CONTENT_W = PAGE_W - MARGIN_X * 2; // 9412
  const INFO_COLS = [2300, CONTENT_W - 2300];
  const SIG_COL = Math.floor(CONTENT_W / 3);
  const SIG_COLS = [SIG_COL, SIG_COL, CONTENT_W - SIG_COL * 2];

  const kind = (item.kind ?? "kritik_is") as LookaheadKind;
  const dateStr = formatDate(item.date);
  const todayStr = formatDate(toISODate(new Date()));

  const run = (text: string, opts: { bold?: boolean; size?: number; italics?: boolean } = {}) =>
    new TextRun({ text, font: FONT, size: opts.size ?? 22, bold: opts.bold, italics: opts.italics });

  const para = (
    children: InstanceType<typeof TextRun>[],
    opts: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number; before?: number } = {}
  ) =>
    new Paragraph({
      children,
      alignment: opts.align ?? AlignmentType.JUSTIFIED,
      spacing: { after: opts.after ?? 120, before: opts.before ?? 0, line: 300 },
    });

  const line = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const allLines = { top: line, bottom: line, left: line, right: line, insideHorizontal: line, insideVertical: line };
  const noLines = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };

  // ─── Bilgi tablosu ───
  const infoRows: [string, string][] = [
    ["Proje", project.name],
    ["Proje Yeri", project.location || ""],
    ["Konu", item.task],
    ["Türü", KIND_LABEL[kind]],
    ["Tarih", dateStr],
    ["Sorumlu", item.owner ?? ""],
  ];
  const infoTable = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: INFO_COLS,
    layout: TableLayoutType.FIXED,
    borders: allLines,
    rows: infoRows.map(
      ([k, v]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: INFO_COLS[0], type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [run(k, { bold: true })] })],
            }),
            new TableCell({
              width: { size: INFO_COLS[1], type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [run(v)] })],
            }),
          ],
        })
    ),
  });

  // ─── Özet metni ───
  const intro = `${project.name} projesi kapsamında, ${dateStr} tarihi itibarıyla “${item.task}” konusuna ilişkin aşağıdaki hususlar tespit edilmiştir.`;
  const noteLines = (item.notes ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const bodyParas: InstanceType<typeof Paragraph>[] = [para([run(intro)])];
  if (noteLines.length > 0) {
    noteLines.forEach((t, i) => bodyParas.push(para([run(`${i + 1}. ${t}`)], { after: 80 })));
  } else {
    // Not girilmemiş — elle doldurmak için boş satırlar
    for (let i = 0; i < 5; i++) {
      bodyParas.push(
        para([run("....................................................................................................................................")], {
          align: AlignmentType.LEFT,
          after: 160,
        })
      );
    }
  }
  if (kind === "kritik_is" && item.owner) {
    bodyParas.push(
      para([run(`Söz konusu işin ${dateStr} tarihine kadar ${item.owner} sorumluluğunda tamamlanması gerekmektedir.`)], {
        before: 120,
      })
    );
  }
  bodyParas.push(
    para(
      [
        run(
          "İşbu tutanak, yukarıda belirtilen hususların tespiti amacıyla taraflarca birlikte düzenlenmiş, okunarak imza altına alınmıştır."
        ),
      ],
      { before: 200 }
    )
  );

  // ─── İmza tablosu ───
  const parties: [string, string][] = [
    ["YÜKLENİCİ", project.mainContractorName ?? ""],
    ["İŞVEREN", project.investorName ?? ""],
    ["KONTROL / MÜŞAVİR", ""],
  ];
  const sigCell = (title: string, company: string, w: number) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      verticalAlign: VerticalAlign.TOP,
      margins: { top: 80, bottom: 80, left: 80, right: 80 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [run(title, { bold: true })] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [run(company || " ", { size: 20 })],
        }),
        new Paragraph({ spacing: { after: 160 }, children: [run("Ad Soyad: .....................", { size: 20 })] }),
        new Paragraph({ spacing: { after: 160 }, children: [run("Unvan: .........................", { size: 20 })] }),
        new Paragraph({ spacing: { after: 600 }, children: [run("İmza:", { size: 20 })] }),
      ],
    });
  const sigTable = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: SIG_COLS,
    layout: TableLayoutType.FIXED,
    borders: noLines,
    rows: [new TableRow({ children: parties.map(([t, c], i) => sigCell(t, c, SIG_COLS[i])) })],
  });

  const doc = new Document({
    creator: project.mainContractorName ?? "GES Proje Takip",
    title: `Tutanak - ${item.task}`,
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_W, height: 16838 }, // A4
            margin: { top: 1134, bottom: 1134, left: MARGIN_X, right: MARGIN_X }, // ~2 / 2.2 cm
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 360 },
            children: [run("TUTANAKTIR", { bold: true, size: 32 })],
          }),
          infoTable,
          new Paragraph({ spacing: { before: 280, after: 120 }, children: [run("KONU ÖZETİ", { bold: true })] }),
          ...bodyParas,
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 240, after: 360 },
            children: [run(`Düzenlenme Tarihi: ${todayStr}`, { size: 20 })],
          }),
          sigTable,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safe = item.task.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "-").slice(0, 50) || "kayit";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Tutanak-${safe}-${item.date}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

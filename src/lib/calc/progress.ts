// Progress / SPI hesaplama mantığı
// HTML port: docs/GES_Proje_Takip_Sistemi_v3.html computeWeight/computeProgress (~satır 1885-1923)

export interface WbsItemForCalc {
  code: string;
  isLeaf: boolean;
  quantity: number;
  weight: number; // custom weight (0 ise otomatik eşit dağılım)
}

export interface WeightedItem extends WbsItemForCalc {
  effectiveWeight: number;
}

/**
 * Her leaf için effective weight hesapla.
 * Custom weight toplamı > 0 ise normalize, değilse n eşit dağılım.
 */
export function computeEffectiveWeights(items: WbsItemForCalc[]): WeightedItem[] {
  const leaves = items.filter((w) => w.isLeaf);
  const totalCustom = leaves.reduce((s, w) => s + (w.weight || 0), 0);
  if (totalCustom > 0) {
    return leaves.map((w) => ({ ...w, effectiveWeight: (w.weight || 0) / totalCustom }));
  }
  const n = leaves.length || 1;
  return leaves.map((w) => ({ ...w, effectiveWeight: 1 / n }));
}

/** Bir WBS kodu için, upToDate dahil kümülatif planlanan miktar toplamı */
export function sumByDateMap(
  byCode: Record<string, Record<string, number>>,
  code: string,
  upToDate: string
): number {
  const m = byCode[code];
  if (!m) return 0;
  let sum = 0;
  for (const [d, v] of Object.entries(m)) {
    if (d <= upToDate) sum += Number(v) || 0;
  }
  return sum;
}

export interface ProgressResult {
  planPct: number; // 0..1
  realPct: number; // 0..1
  spi: number | null;
}

/**
 * Belirli bir tarihe kadar planlanan/gerçekleşen yüzdesi ve SPI.
 * planned/realized: { [wbsCode]: { [isoDate]: quantity } }
 */
export function computeProgress(
  items: WbsItemForCalc[],
  planned: Record<string, Record<string, number>>,
  realized: Record<string, Record<string, number>>,
  upToDate: string
): ProgressResult {
  const weighted = computeEffectiveWeights(items);
  let planPct = 0;
  let realPct = 0;
  for (const w of weighted) {
    if (w.quantity <= 0) continue;
    const p = sumByDateMap(planned, w.code, upToDate);
    const r = sumByDateMap(realized, w.code, upToDate);
    planPct += w.effectiveWeight * Math.min(p / w.quantity, 1);
    realPct += w.effectiveWeight * Math.min(r / w.quantity, 1);
  }
  return {
    planPct,
    realPct,
    spi: planPct > 0 ? realPct / planPct : null,
  };
}

/** Tüm planning/realization tarihlerini topla ve sırala */
export function getAllDates(
  planned: Record<string, Record<string, number>>,
  realized: Record<string, Record<string, number>>
): string[] {
  const set = new Set<string>();
  for (const byCode of Object.values(planned)) for (const d of Object.keys(byCode)) set.add(d);
  for (const byCode of Object.values(realized)) for (const d of Object.keys(byCode)) set.add(d);
  return [...set].sort();
}

/** S-eğrisi: tüm tarihlerde kümülatif plan/real % */
export interface SCurvePoint {
  date: string;
  planPct: number;
  realPct: number;
}

export function buildSCurve(
  items: WbsItemForCalc[],
  planned: Record<string, Record<string, number>>,
  realized: Record<string, Record<string, number>>,
  reportDate?: string
): SCurvePoint[] {
  const dates = getAllDates(planned, realized);
  return dates.map((d) => {
    const { planPct, realPct } = computeProgress(items, planned, realized, d);
    return {
      date: d,
      planPct: planPct * 100,
      // Rapor tarihinden sonraki tarihlerde gerçekleşmeyi ileri taşıma
      realPct: reportDate && d > reportDate ? NaN : realPct * 100,
    };
  });
}

"use client";

import { useMemo, useState } from "react";
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  Scale,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  useStore,
  useCurrentProject,
  useProjectWbs,
  useProjectPlanned,
  useProjectRealized,
} from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { cn, formatNumber, formatPct } from "@/lib/utils";
import { computeEffectiveWeights, sumByDateMap } from "@/lib/calc/progress";
import type { WbsItem } from "@/lib/store/types";

export default function WbsPage() {
  const project = useCurrentProject();
  const allWbs = useProjectWbs(project?.id);
  const planned = useProjectPlanned(project?.id);
  const realized = useProjectRealized(project?.id);
  const addWbs = useStore((s) => s.addWbs);
  const updateWbs = useStore((s) => s.updateWbs);
  const softDeleteWbs = useStore((s) => s.softDeleteWbs);
  const toast = useToast((s) => s.push);

  const [editing, setEditing] = useState<WbsItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filterDiscipline, setFilterDiscipline] = useState<string>("");

  // Sıralı liste
  const sorted = useMemo(
    () => [...allWbs].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
    [allWbs]
  );

  // Leaf'lerin effective weight haritası
  const effectiveMap = useMemo(() => {
    const leaves = allWbs.filter((w) => w.isLeaf);
    const weighted = computeEffectiveWeights(
      leaves.map((l) => ({ code: l.code, isLeaf: l.isLeaf, quantity: l.quantity, weight: l.weight }))
    );
    const m: Record<string, number> = {};
    for (const w of weighted) m[w.code] = w.effectiveWeight;
    return m;
  }, [allWbs]);

  // Toplam custom weight (leaves)
  const customWeightTotal = useMemo(
    () => allWbs.filter((w) => w.isLeaf).reduce((s, w) => s + (w.weight || 0), 0),
    [allWbs]
  );
  const isAutoWeight = customWeightTotal === 0;
  const isCustomBalanced = !isAutoWeight && Math.abs(customWeightTotal - 1) < 0.001;

  // Görünür satırlar (filtre + expand)
  function isVisible(code: string): boolean {
    const parts = code.split(".");
    for (let i = 1; i < parts.length; i++) {
      const ancestor = parts.slice(0, i).join(".");
      const exp = expanded[ancestor];
      if (exp === false) return false;
      // Default L0/L1 açık, L2+ kapalı
      if (exp === undefined && i >= 2) return false;
    }
    return true;
  }

  const visible = sorted.filter(
    (w) => isVisible(w.code) && (!filterDiscipline || w.discipline === filterDiscipline)
  );

  // Parent için descendant leaf'leri bul
  function descendantLeaves(parentCode: string): WbsItem[] {
    return allWbs.filter(
      (w) => w.isLeaf && w.code !== parentCode && w.code.startsWith(parentCode + ".")
    );
  }

  function toggleExpand(code: string) {
    setExpanded((s) => {
      const current = s[code];
      const defaultExpanded = code.split(".").length <= 2; // L0/L1 default açık
      const isOpen = current === undefined ? defaultExpanded : current;
      return { ...s, [code]: !isOpen };
    });
  }

  // Genel ilerleme
  const items = allWbs.map((w) => ({
    code: w.code,
    isLeaf: w.isLeaf,
    quantity: w.quantity,
    weight: w.weight,
  }));
  const reportDate = project?.reportDate ?? "";
  const { planPct, realPct } = useMemo(() => {
    let planPct = 0;
    let realPct = 0;
    const weighted = computeEffectiveWeights(items);
    for (const w of weighted) {
      if (w.quantity <= 0) continue;
      const p = sumByDateMap(planned, w.code, reportDate);
      const r = sumByDateMap(realized, w.code, reportDate);
      planPct += w.effectiveWeight * Math.min(p / w.quantity, 1);
      realPct += w.effectiveWeight * Math.min(r / w.quantity, 1);
    }
    return { planPct, realPct };
  }, [items, planned, realized, reportDate]);

  // Aksiyonlar
  function resetWeights() {
    if (!confirm("Tüm özel ağırlıklar sıfırlanacak (otomatik eşit dağıtım moduna geçilir). Onaylıyor musun?")) return;
    for (const w of allWbs) {
      if (w.isLeaf && w.weight !== 0) updateWbs(w.id, { weight: 0 });
    }
    toast("Tüm özel ağırlıklar sıfırlandı · otomatik eşit dağıtım aktif", "info");
  }

  function normalizeWeights() {
    if (customWeightTotal === 0) {
      toast("Önce bazı kalemlere özel ağırlık girmelisin", "warning");
      return;
    }
    if (!confirm(`Mevcut özel ağırlıklar (Σ = ${customWeightTotal.toFixed(3)}) 1.000'e normalize edilecek. Onaylıyor musun?`)) return;
    for (const w of allWbs) {
      if (w.isLeaf && w.weight > 0) {
        updateWbs(w.id, { weight: w.weight / customWeightTotal });
      }
    }
    toast("Özel ağırlıklar 1.000 toplamına normalize edildi", "success");
  }

  function updateLeafWeight(id: string, raw: string) {
    const value = Math.max(0, Number(raw) || 0);
    updateWbs(id, { weight: value });
  }

  if (!project) {
    return (
      <Card>
        <CardTitle>Proje Yok</CardTitle>
        <p className="text-sm text-text2">Önce bir proje seç.</p>
      </Card>
    );
  }

  const totalLeaves = allWbs.filter((w) => w.isLeaf).length;
  const customCount = allWbs.filter((w) => w.isLeaf && w.weight > 0).length;

  return (
    <>
      <PageHeader
        title="WBS Yapısı & Ağırlık Yönetimi"
        description={`${allWbs.length} madde · ${totalLeaves} yaprak kalem · İlerleme hesabı bu ağırlıklara göre yapılır`}
        icon={FolderTree}
        actions={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus size={14} /> Yeni WBS
          </Button>
        }
      />

      {/* Üst stat barı */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatBlock
          label="Toplam Yaprak"
          value={`${totalLeaves}`}
          sub="hesaplamaya konu kalem"
          icon={<FolderTree size={16} />}
        />
        <StatBlock
          label="Özel Ağırlıklı"
          value={`${customCount}`}
          sub={`/ ${totalLeaves} kalem`}
          icon={<Sparkles size={16} />}
          color={customCount > 0 ? "accent" : "muted"}
        />
        <StatBlock
          label="Toplam Özel Ağırlık"
          value={isAutoWeight ? "—" : formatNumber(customWeightTotal, 3)}
          sub={
            isAutoWeight ? (
              <span>Otomatik eşit dağıtım <strong className="text-text">1/{totalLeaves}</strong></span>
            ) : isCustomBalanced ? (
              <span className="text-green">✓ Doğru (Σ = 1.000)</span>
            ) : (
              <span className="text-yellow">⚠ {customWeightTotal > 1 ? "Fazla" : "Eksik"} · Normalize Et</span>
            )
          }
          icon={<Scale size={16} />}
          color={isAutoWeight ? "muted" : isCustomBalanced ? "green" : "yellow"}
        />
        <StatBlock
          label="Genel İlerleme"
          value={formatPct(realPct, 1)}
          sub={
            <span>
              Plan: <strong className="text-planned">{formatPct(planPct, 1)}</strong>
            </span>
          }
          icon={<CheckCircle2 size={16} />}
          color="realized"
        />
      </div>

      {/* Aksiyon barı */}
      <Card className="!p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text3 font-bold uppercase tracking-wider">Disiplin:</span>
            <Select
              value={filterDiscipline}
              onChange={(e) => setFilterDiscipline(e.target.value)}
              className="!h-9 !min-w-[160px]"
            >
              <option value="">Tümü</option>
              <option value="mekanik">Mekanik</option>
              <option value="elektrik">Elektrik</option>
              <option value="insaat">İnşaat</option>
              <option value="muhendislik">Mühendislik</option>
              <option value="idari">İdari</option>
              <option value="diger">Diğer</option>
            </Select>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={resetWeights} disabled={customCount === 0}>
              <RotateCcw size={14} /> Özel Ağırlıkları Sıfırla
            </Button>
            <Button variant="soft" onClick={normalizeWeights} disabled={isAutoWeight || isCustomBalanced}>
              <Scale size={14} /> Normalize Et (Σ→1.000)
            </Button>
          </div>
        </div>
      </Card>

      {!isAutoWeight && !isCustomBalanced && (
        <Alert variant="warning" className="mb-4">
          Özel ağırlıkların toplamı <strong>{customWeightTotal.toFixed(3)}</strong> — 1.000 olması beklenir.
          İlerleme hesabı bu değerleri kendi içinde normalize ederek yapar, ama netlik için yukarıdaki{" "}
          <strong>Normalize Et</strong> butonunu kullanabilirsin.
        </Alert>
      )}

      {/* Ana tablo */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto max-h-[72vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="sticky top-0 z-20 bg-bg2 px-3 py-3 text-left text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap min-w-[18rem]">
                  Kod / Ad
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-3 py-3 text-left text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  Disiplin
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-3 py-3 text-right text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  Miktar
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-3 py-3 text-left text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  Birim
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-3 py-3 text-center text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap min-w-[7rem]">
                  Özel Ağırlık
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-3 py-3 text-right text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  Nihai Ağırlık
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-3 py-3 text-left text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap min-w-[10rem]">
                  Dağılım
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-3 py-3 text-right text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  Plan / Real
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-3 py-3 border-b border-border w-16"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((w) => {
                const hasChildren = allWbs.some(
                  (c) => c.code !== w.code && c.code.startsWith(w.code + ".")
                );
                const isExpanded =
                  expanded[w.code] !== undefined
                    ? expanded[w.code]
                    : w.level <= 1;

                const pSum = w.isLeaf ? sumByDateMap(planned, w.code, project.reportDate) : 0;
                const rSum = w.isLeaf ? sumByDateMap(realized, w.code, project.reportDate) : 0;

                // Effective weight
                let effective = 0;
                let customSum = 0;
                if (w.isLeaf) {
                  effective = effectiveMap[w.code] ?? 0;
                  customSum = w.weight || 0;
                } else {
                  // Parent: descendant leaves'in toplamı
                  const descendants = descendantLeaves(w.code);
                  for (const d of descendants) {
                    effective += effectiveMap[d.code] ?? 0;
                    customSum += d.weight || 0;
                  }
                }

                const effectivePct = effective * 100;

                return (
                  <tr key={w.id} className={cn("hover:bg-bg2/40 transition-colors", w.level === 0 && "bg-accent/5")}>
                    {/* Kod / Ad */}
                    <td className={cn(
                      "px-3 py-2.5 border-b border-border",
                      w.level === 0 && "font-bold text-accent",
                      w.level === 1 && "font-semibold text-blue",
                      w.level === 2 && "font-medium text-text",
                      w.level === 3 && "text-text2"
                    )}>
                      <div className="flex items-center gap-1.5" style={{ paddingLeft: `${(w.level) * 14}px` }}>
                        {hasChildren ? (
                          <button
                            onClick={() => toggleExpand(w.code)}
                            className="text-text3 hover:text-text shrink-0"
                          >
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </button>
                        ) : (
                          <span className="w-3 shrink-0" />
                        )}
                        <span className="font-mono text-xs shrink-0">{w.code}</span>
                        <span className="truncate">{w.name}</span>
                      </div>
                    </td>
                    {/* Disiplin */}
                    <td className="px-3 py-2.5 border-b border-border">
                      {w.discipline && <Badge variant="gray">{w.discipline}</Badge>}
                    </td>
                    {/* Miktar */}
                    <td className="px-3 py-2.5 border-b border-border text-right font-mono text-xs tabular-nums">
                      {w.isLeaf && w.quantity > 0 ? formatNumber(w.quantity, 0) : ""}
                    </td>
                    {/* Birim */}
                    <td className="px-3 py-2.5 border-b border-border text-xs text-text3">{w.unit}</td>

                    {/* Özel Ağırlık */}
                    <td className="px-2 py-1.5 border-b border-border text-center">
                      {w.isLeaf ? (
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={w.weight || ""}
                          onChange={(e) => updateLeafWeight(w.id, e.target.value)}
                          placeholder="0"
                          className={cn(
                            "w-24 h-8 px-2 rounded-lg bg-white border border-border2 text-center font-mono text-xs tabular-nums",
                            "focus:outline-none focus:border-accent focus:shadow-focus",
                            (w.weight || 0) > 0 && "border-accent/40 bg-accent/5 font-semibold text-accent"
                          )}
                        />
                      ) : (
                        <span className="font-mono text-xs text-text3 tabular-nums">
                          Σ {customSum.toFixed(3)}
                        </span>
                      )}
                    </td>

                    {/* Nihai Ağırlık (%) */}
                    <td className="px-3 py-2.5 border-b border-border text-right">
                      <span className={cn(
                        "font-mono text-xs tabular-nums font-semibold",
                        w.isLeaf ? "text-text" : "text-accent"
                      )}>
                        {effectivePct.toFixed(2)}%
                      </span>
                    </td>

                    {/* Dağılım barı */}
                    <td className="px-3 py-2.5 border-b border-border">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-bg3 rounded-full overflow-hidden max-w-[160px]">
                          <div
                            className={cn(
                              "h-full rounded-full transition-[width] duration-500",
                              w.isLeaf ? "bg-accent" : "bg-blue"
                            )}
                            style={{ width: `${Math.min(100, effectivePct * 3)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Plan / Real % */}
                    <td className="px-3 py-2.5 border-b border-border text-right whitespace-nowrap">
                      {w.isLeaf && w.quantity > 0 ? (
                        <span className="font-mono text-xs">
                          <span className="text-planned font-semibold">
                            {formatPct(pSum / w.quantity, 0)}
                          </span>
                          <span className="text-text3 mx-1">/</span>
                          <span className="text-realized font-semibold">
                            {formatPct(rSum / w.quantity, 0)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-text3 text-xs">—</span>
                      )}
                    </td>

                    {/* Aksiyonlar */}
                    <td className="px-3 py-2.5 border-b border-border">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => setEditing(w)}
                          className="p-1.5 rounded-lg text-text3 hover:bg-bg3 hover:text-accent transition-colors"
                          title="Düzenle"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`"${w.name}" silinsin mi? (Çöp Kutusu'ndan geri yüklenebilir)`))
                              softDeleteWbs(w.id);
                          }}
                          className="p-1.5 rounded-lg text-text3 hover:bg-bg3 hover:text-red transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {/* TOPLAM SATIR */}
              <tr className="sticky bottom-0 z-10 bg-white border-t-2 border-accent/30 font-bold">
                <td className="px-3 py-3 text-text">
                  <div className="flex items-center gap-2">
                    <Scale size={14} className="text-accent" />
                    Toplam ({totalLeaves} yaprak)
                  </div>
                </td>
                <td></td>
                <td></td>
                <td></td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={cn(
                      "font-mono text-xs tabular-nums",
                      isAutoWeight
                        ? "text-text3"
                        : isCustomBalanced
                        ? "text-green"
                        : "text-yellow"
                    )}
                  >
                    Σ {customWeightTotal.toFixed(3)}
                  </span>
                  {!isAutoWeight && !isCustomBalanced && (
                    <AlertTriangle size={11} className="inline ml-1 text-yellow" />
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="font-mono text-xs tabular-nums text-accent">100.00%</span>
                </td>
                <td className="px-3 py-3">
                  <div className="h-2 bg-bg3 rounded-full overflow-hidden max-w-[160px]">
                    <div className="h-full w-full bg-accent rounded-full" />
                  </div>
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  <span className="font-mono text-xs">
                    <span className="text-planned font-semibold">{formatPct(planPct, 1)}</span>
                    <span className="text-text3 mx-1">/</span>
                    <span className="text-realized font-semibold">{formatPct(realPct, 1)}</span>
                  </span>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <WbsForm
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(data) => {
          if (!project) return;
          addWbs({
            ...data,
            projectId: project.id,
            parentCode: data.code.includes(".") ? data.code.split(".").slice(0, -1).join(".") : undefined,
          });
          setCreating(false);
        }}
      />
      <WbsForm
        open={!!editing}
        onClose={() => setEditing(null)}
        initial={editing || undefined}
        onSubmit={(data) => {
          if (!editing) return;
          updateWbs(editing.id, data);
          setEditing(null);
        }}
      />
    </>
  );
}

// ============================================================
// StatBlock
// ============================================================
const STAT_COLORS: Record<string, string> = {
  accent: "border-accent/30 bg-accent/5",
  green: "border-green/30 bg-green/5",
  yellow: "border-yellow/30 bg-yellow/5",
  realized: "border-green/30",
  muted: "border-border",
};
const STAT_ICON_BG: Record<string, string> = {
  accent: "bg-accent/10 text-accent",
  green: "bg-green/10 text-green",
  yellow: "bg-yellow/10 text-yellow",
  realized: "bg-green/10 text-green",
  muted: "bg-bg3 text-text3",
};

function StatBlock({
  label,
  value,
  sub,
  icon,
  color = "muted",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  color?: string;
}) {
  return (
    <div className={cn(
      "rounded-xl bg-white border p-4 shadow-soft",
      STAT_COLORS[color] || STAT_COLORS.muted
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-wider font-bold text-text3">{label}</div>
        {icon && (
          <span className={cn(
            "inline-flex items-center justify-center w-8 h-8 rounded-lg",
            STAT_ICON_BG[color] || STAT_ICON_BG.muted
          )}>
            {icon}
          </span>
        )}
      </div>
      <div className="font-mono text-xl font-bold leading-none text-text tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-text2 mt-1.5 font-medium">{sub}</div>}
    </div>
  );
}

// ============================================================
// WbsForm
// ============================================================
function WbsForm({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  initial?: WbsItem;
  onSubmit: (data: Omit<WbsItem, "id" | "projectId" | "deletedAt">) => void;
}) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [level, setLevel] = useState<0 | 1 | 2 | 3>(initial?.level ?? 3);
  const [isLeaf, setIsLeaf] = useState(initial?.isLeaf ?? true);
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
  const [unit, setUnit] = useState(initial?.unit ?? "adet");
  const [weight, setWeight] = useState(initial?.weight ?? 0);
  const [discipline, setDiscipline] = useState<WbsItem["discipline"]>(initial?.discipline);

  return (
    <Dialog open={open} onClose={onClose} title={initial ? "WBS Düzenle" : "Yeni WBS"} size="md">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Kod (örn. 1.4.10)">
          <Input value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <Field label="Seviye">
          <Select value={level} onChange={(e) => setLevel(Number(e.target.value) as 0 | 1 | 2 | 3)}>
            <option value={0}>Level 0 — Kök</option>
            <option value={1}>Level 1</option>
            <option value={2}>Level 2</option>
            <option value={3}>Level 3 — Yaprak</option>
          </Select>
        </Field>
        <Field label="Ad" className="sm:col-span-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Yaprak mı?">
          <Select value={isLeaf ? "yes" : "no"} onChange={(e) => setIsLeaf(e.target.value === "yes")}>
            <option value="yes">Evet (puantaj/plana konu)</option>
            <option value="no">Hayır (Üst başlık)</option>
          </Select>
        </Field>
        <Field label="Disiplin">
          <Select value={discipline ?? ""} onChange={(e) => setDiscipline((e.target.value || undefined) as WbsItem["discipline"])}>
            <option value="">—</option>
            <option value="mekanik">Mekanik</option>
            <option value="elektrik">Elektrik</option>
            <option value="insaat">İnşaat</option>
            <option value="muhendislik">Mühendislik</option>
            <option value="idari">İdari</option>
            <option value="diger">Diğer</option>
          </Select>
        </Field>
        <Field label="Miktar">
          <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 0)} />
        </Field>
        <Field label="Birim">
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="adet, m³, m..." />
        </Field>
        <Field label="Özel Ağırlık (0 = otomatik)" hint="Tüm yaprakların toplamı 1.000 olmalı">
          <Input
            type="number"
            step="0.001"
            min="0"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value) || 0)}
          />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>İptal</Button>
        <Button
          variant="accent"
          onClick={() => onSubmit({ code, name, level, isLeaf, quantity, unit, weight, discipline })}
        >
          Kaydet
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

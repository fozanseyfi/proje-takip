"use client";

import { Fragment, useMemo, useState } from "react";
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Layers3,
  Layers2,
  Layers,
  FileText,
} from "lucide-react";
import { useStore, useCurrentProject, useProjectWbs } from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { cn, formatNumber } from "@/lib/utils";
import {
  computeHierarchicalWeights,
  getParentWeightSummaries,
} from "@/lib/calc/sections";
import type { WbsItem } from "@/lib/store/types";

type ViewMode = "all" | "main" | "sub" | "items";

// Level renkleri (bar + nihai ağırlık)
const LEVEL_COLOR: Record<number, { bar: string; barBg: string; text: string }> = {
  0: { bar: "bg-slate-500", barBg: "bg-slate-200", text: "text-slate-700" },
  1: { bar: "bg-blue",      barBg: "bg-blue/20",  text: "text-blue" },
  2: { bar: "bg-purple",    barBg: "bg-purple/20", text: "text-purple" },
  3: { bar: "bg-accent",    barBg: "bg-accent/20", text: "text-accent" },
};

const LEVEL_LABEL: Record<number, string> = {
  0: "Proje",
  1: "Ana Başlık",
  2: "Alt Başlık",
  3: "İş Kalemi",
};

export default function WbsPage() {
  const project = useCurrentProject();
  const allWbs = useProjectWbs(project?.id);
  const addWbs = useStore((s) => s.addWbs);
  const updateWbs = useStore((s) => s.updateWbs);
  const softDeleteWbs = useStore((s) => s.softDeleteWbs);

  const [editing, setEditing] = useState<WbsItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState<boolean>(false);
  const [filterDiscipline, setFilterDiscipline] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  const sorted = useMemo(
    () => [...allWbs].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
    [allWbs]
  );

  // Hiyerarşik ağırlıklar
  const hierarchicalMap = useMemo(() => computeHierarchicalWeights(allWbs), [allWbs]);
  const parentSummaries = useMemo(() => getParentWeightSummaries(allWbs), [allWbs]);

  // Doğrulama: kaç parent'ta yerel ağırlık toplamı ≠ %100?
  const unbalanced = parentSummaries.filter(
    (p) => !p.isAutoMode && !p.isBalanced
  );
  const autoCount = parentSummaries.filter((p) => p.isAutoMode).length;
  const balancedCount = parentSummaries.filter((p) => p.isBalanced).length;

  // Görünür satırlar
  function isVisible(code: string): boolean {
    const parts = code.split(".");
    for (let i = 1; i < parts.length; i++) {
      const ancestor = parts.slice(0, i).join(".");
      // hiyerarşi atlama olabilir, sadece var olan ataları kontrol et
      const ancestorExists = allWbs.some((w) => w.code === ancestor);
      if (!ancestorExists) continue;
      const exp = expanded[ancestor];
      if (exp === false) return false;
      // Default: L0 (code "1") açık, gerisi kapalı
      if (exp === undefined && ancestor.includes(".")) return false;
    }
    return true;
  }

  const visible = sorted.filter((w) => {
    // L0 (Proje kökü) hiç gösterilmez
    if (w.level === 0) return false;
    // Disiplin filtresi
    if (filterDiscipline && w.discipline !== filterDiscipline) return false;
    // Görünüm modu
    if (viewMode === "main") return w.level === 1;
    if (viewMode === "sub") return w.level === 2;
    if (viewMode === "items") return w.level === 3;
    // mode "all": expand mantığına göre
    return isVisible(w.code);
  });

  // En yakın existing parent'ı bul (sample data'da bazı ara parent'lar
  // eksik olabiliyor, yukarı çıkıp ilk var olanı bul)
  function findClosestParent(code: string): WbsItem | undefined {
    if (!code.includes(".")) return undefined;
    let p = code.split(".").slice(0, -1).join(".");
    while (p.length > 0) {
      const f = allWbs.find((x) => x.code === p);
      if (f) return f;
      if (!p.includes(".")) return undefined;
      p = p.split(".").slice(0, -1).join(".");
    }
    return undefined;
  }

  // Grup mantığı (sadece main/sub/items modunda)
  const groups = useMemo(() => {
    if (viewMode === "all") return null;
    const map = new Map<string, { parent: WbsItem | null; children: WbsItem[]; rawSum: number }>();
    for (const w of visible) {
      const parent = findClosestParent(w.code) ?? null;
      const key = parent?.code ?? "__root__";
      if (!map.has(key)) map.set(key, { parent, children: [], rawSum: 0 });
      const g = map.get(key)!;
      g.children.push(w);
      g.rawSum += w.weight || 0;
    }
    return Array.from(map.values()).sort((a, b) => {
      const ac = a.parent?.code ?? "";
      const bc = b.parent?.code ?? "";
      return ac.localeCompare(bc, undefined, { numeric: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, viewMode, allWbs]);

  function toggleExpand(code: string) {
    setExpanded((s) => {
      const current = s[code];
      const isOpen = current === undefined ? code.split(".").length <= 1 : current;
      return { ...s, [code]: !isOpen };
    });
  }

  function toggleAll() {
    if (allExpanded) {
      // Tümünü kapa: sadece kök (L0) açık
      const m: Record<string, boolean> = {};
      for (const w of allWbs) {
        if (w.code.includes(".")) m[w.code] = false;
        else m[w.code] = true;
      }
      setExpanded(m);
      setAllExpanded(false);
    } else {
      // Tümünü aç
      const m: Record<string, boolean> = {};
      for (const w of allWbs) m[w.code] = true;
      setExpanded(m);
      setAllExpanded(true);
    }
  }

  function updateLeafWeight(id: string, raw: string) {
    const value = Math.max(0, Number(raw) || 0);
    updateWbs(id, { weight: value });
  }

  // ============= Row & Group renders =============
  function renderRow(w: WbsItem) {
    const hier = hierarchicalMap.get(w.code);
    const localPct = hier ? hier.localPct * 100 : 0;
    const finalPct = hier ? hier.finalPct * 100 : 0;
    const hasChildren = (hier?.childCount ?? 0) > 0;
    const isExpanded =
      expanded[w.code] !== undefined
        ? expanded[w.code]
        : !w.code.includes(".");
    const barWidth = w.level === 0 ? 100 : Math.max(0.5, finalPct);
    const c = LEVEL_COLOR[w.level] || LEVEL_COLOR[3];
    const borderColorClass =
      w.level === 1 ? "border-blue/40" : w.level === 2 ? "border-purple/40" : "border-accent/40";

    return (
      <tr key={w.id} className="hover:bg-bg2/40 transition-colors">
        {/* Kod / Ad */}
        <td
          className={cn(
            "px-3 py-2.5 border-b border-border",
            w.level === 1 && "font-semibold text-blue",
            w.level === 2 && "font-semibold text-purple",
            w.level === 3 && "text-text"
          )}
        >
          <div className="flex items-center gap-1.5" style={{ paddingLeft: `${(w.level - 1) * 16}px` }}>
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(w.code)}
                className="text-text3 hover:text-text shrink-0 w-4 h-4 flex items-center justify-center"
              >
                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <span className="font-mono text-xs shrink-0">{w.code}</span>
            <span className="truncate">{w.name}</span>
            {w.discipline && (
              <Badge variant="gray" className="ml-1.5 shrink-0">
                {w.discipline}
              </Badge>
            )}
          </div>
        </td>

        <td className="px-3 py-2.5 border-b border-border">
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", c.text)}>
            {LEVEL_LABEL[w.level]}
          </span>
        </td>

        <td className="px-3 py-2.5 border-b border-border text-right font-mono text-xs tabular-nums">
          {w.isLeaf && w.quantity > 0 ? formatNumber(w.quantity, 0) : ""}
        </td>

        <td className="px-3 py-2.5 border-b border-border text-xs text-text3">{w.unit}</td>

        {/* Yerel Ağırlık */}
        <td className="px-2 py-1.5 border-b border-border text-center">
          <div className="relative inline-block">
            <input
              type="number"
              step="0.1"
              min="0"
              value={w.weight || ""}
              onChange={(e) => updateLeafWeight(w.id, e.target.value)}
              placeholder={localPct.toFixed(1)}
              className={cn(
                "w-24 h-8 px-2 rounded-lg bg-white border border-border2 text-center font-mono text-xs tabular-nums",
                "focus:outline-none focus:border-accent focus:shadow-focus",
                (w.weight || 0) > 0 && [c.text, "border-2", borderColorClass, "font-semibold"]
              )}
            />
            {!w.weight && (
              <span className={cn("absolute -bottom-3.5 left-0 right-0 text-[9px] tabular-nums opacity-60", c.text)}>
                auto {localPct.toFixed(1)}
              </span>
            )}
          </div>
        </td>

        {/* Nihai Ağırlık · Dağılım */}
        <td className="px-3 py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className={cn("flex-1 h-3 rounded-full overflow-hidden", c.barBg)}>
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500 shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)]",
                  c.bar
                )}
                style={{ width: `${Math.min(100, barWidth)}%` }}
              />
            </div>
            <span className={cn("text-[10px] font-mono font-bold tabular-nums w-12 text-right", c.text)}>
              {finalPct < 0.01 ? "<0.01" : finalPct.toFixed(2)}%
            </span>
          </div>
        </td>

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
  }

  function renderGroupHeader(g: { parent: WbsItem | null; children: WbsItem[] }) {
    const headerColor = g.parent
      ? LEVEL_COLOR[g.parent.level]
      : LEVEL_COLOR[0];
    const title = g.parent ? `${g.parent.code} · ${g.parent.name}` : "Proje Kökü";
    return (
      <tr key={`hdr-${g.parent?.code ?? "root"}`} className="bg-gradient-to-r from-bg2 to-transparent">
        <td colSpan={7} className="px-3 py-2.5 border-b border-border2">
          <div className="flex items-center gap-3">
            <span className={cn("w-1.5 h-5 rounded-full", headerColor.bar)} />
            <span className={cn("text-xs font-bold uppercase tracking-wider", headerColor.text)}>
              {g.parent ? LEVEL_LABEL[g.parent.level] : "Proje"}
            </span>
            <span className="text-text font-bold text-sm">{title}</span>
            <span className="ml-auto text-[11px] text-text3 font-medium">
              {g.children.length} alt kalem
            </span>
          </div>
        </td>
      </tr>
    );
  }

  function renderGroupFooter(g: { parent: WbsItem | null; children: WbsItem[]; rawSum: number }) {
    const isAuto = g.rawSum === 0;
    const isBalanced = !isAuto && Math.abs(g.rawSum - 100) < 0.5;
    let bgClass = "bg-bg2/30";
    let textClass = "text-text3";
    let icon = null;
    let message = "Otomatik eşit dağıtım";
    if (!isAuto) {
      if (isBalanced) {
        bgClass = "bg-green/5";
        textClass = "text-green";
        icon = <CheckCircle2 size={13} className="text-green" />;
        message = "Σ = 100 ✓ Doğru";
      } else {
        bgClass = "bg-yellow/5";
        textClass = "text-yellow";
        icon = <AlertTriangle size={13} className="text-yellow" />;
        const diff = g.rawSum - 100;
        message = `Σ = ${g.rawSum.toFixed(1)} · ${diff > 0 ? "+" : ""}${diff.toFixed(1)} fark`;
      }
    }
    return (
      <tr key={`ftr-${g.parent?.code ?? "root"}`} className={bgClass}>
        <td colSpan={4} className="px-3 py-2 border-b-2 border-border2 text-right text-xs font-bold text-text2">
          {g.parent ? `${g.parent.code} altında toplam:` : "Proje altında toplam:"}
        </td>
        <td className="px-3 py-2 border-b-2 border-border2 text-center">
          <span className={cn("font-mono text-sm font-bold tabular-nums", textClass)}>
            {g.rawSum.toFixed(1)}
          </span>
        </td>
        <td colSpan={2} className="px-3 py-2 border-b-2 border-border2">
          <div className="flex items-center gap-1.5">
            {icon}
            <span className={cn("text-xs font-semibold", textClass)}>{message}</span>
          </div>
        </td>
      </tr>
    );
  }

  if (!project) {
    return (
      <Card>
        <CardTitle>Proje Yok</CardTitle>
        <p className="text-sm text-text2">Önce bir proje seç.</p>
      </Card>
    );
  }

  const totalNodes = allWbs.length;
  const leafCount = allWbs.filter((w) => w.isLeaf).length;
  const l1Count = allWbs.filter((w) => w.level === 1).length;
  const l2Count = allWbs.filter((w) => w.level === 2).length;

  return (
    <>
      <PageHeader
        title="WBS Yapısı & Hiyerarşik Ağırlık"
        description={`${totalNodes} madde · ${l1Count} ana başlık · ${l2Count} alt başlık · ${leafCount} iş kalemi`}
        icon={FolderTree}
        actions={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus size={14} /> Yeni WBS
          </Button>
        }
      />

      {/* GÖRÜNÜM MODU */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[10px] uppercase tracking-wider font-bold text-text3 mr-1">Görünüm:</span>
        <div className="inline-flex gap-1 p-1 bg-bg2 border border-border rounded-xl">
          <ModePill
            active={viewMode === "main"}
            onClick={() => setViewMode("main")}
            icon={<Layers3 size={14} />}
            label="Ana Başlıklar"
            count={l1Count}
            colorClass="text-blue"
          />
          <ModePill
            active={viewMode === "sub"}
            onClick={() => setViewMode("sub")}
            icon={<Layers2 size={14} />}
            label="Alt Başlıklar"
            count={l2Count}
            colorClass="text-purple"
          />
          <ModePill
            active={viewMode === "items"}
            onClick={() => setViewMode("items")}
            icon={<FileText size={14} />}
            label="İş Kalemleri"
            count={leafCount}
            colorClass="text-accent"
          />
          <ModePill
            active={viewMode === "all"}
            onClick={() => setViewMode("all")}
            icon={<Layers size={14} />}
            label="Tümü"
            count={totalNodes - 1}
            colorClass="text-text"
          />
        </div>
        {viewMode === "all" && (
          <Button variant="outline" onClick={toggleAll} className="ml-2">
            {allExpanded ? (
              <>
                <ChevronsDownUp size={14} /> Tümünü Kapa
              </>
            ) : (
              <>
                <ChevronsUpDown size={14} /> Tümünü Aç
              </>
            )}
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="text-text3 font-bold uppercase tracking-wider">Disiplin:</span>
          <Select
            value={filterDiscipline}
            onChange={(e) => setFilterDiscipline(e.target.value)}
            className="!h-9 !min-w-[140px]"
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
      </div>

      {/* Üst stat */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatBlock
          color="slate"
          label="Toplam Madde"
          value={`${totalNodes}`}
          sub={`${l1Count} ana · ${l2Count} alt · ${leafCount} iş`}
          icon={<FolderTree size={16} />}
        />
        <StatBlock
          color="blue"
          label="Otomatik Mod"
          value={`${autoCount}`}
          sub="seviyede eşit dağıtım (kullanıcı girmemiş)"
          icon={<Sparkles size={16} />}
        />
        <StatBlock
          color="green"
          label="Doğru Ağırlıklı"
          value={`${balancedCount}`}
          sub="seviyede Σ ≈ 100 ✓"
          icon={<CheckCircle2 size={16} />}
        />
        <StatBlock
          color={unbalanced.length === 0 ? "green" : "yellow"}
          label="Dengesiz"
          value={`${unbalanced.length}`}
          sub={unbalanced.length === 0 ? "tüm seviyeler tutarlı" : "seviyede Σ ≠ 100"}
          icon={
            unbalanced.length === 0 ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertTriangle size={16} />
            )
          }
        />
      </div>

      {/* Bilgi mesajı */}
      <Alert variant="info" className="mb-4">
        <strong>Nasıl çalışır:</strong> Proje ağırlığı her zaman %100&apos;dür. Ana başlıkların kendi
        aralarındaki toplamı %100. Bir ana başlığın alt başlıkları da kendi içlerinde %100. İş
        kalemleri ise alt başlığın içinde %100. <strong>Nihai ağırlık</strong> = ana × alt × kalem (kümülatif çarpım).
        Bir seviye için yerel ağırlık girmezsen <em>otomatik eşit dağıtım</em> uygulanır.
      </Alert>

      {unbalanced.length > 0 && (
        <Alert variant="warning" className="mb-4">
          <strong>{unbalanced.length} seviyede</strong> kardeş ağırlık toplamı %100 değil — sistem
          orantılı normalize ediyor ama netlik için 100&apos;e tamamla. Etkilenen başlıklar:{" "}
          <span className="font-mono text-xs">
            {unbalanced.slice(0, 5).map((u) => u.parentName).join(", ")}
            {unbalanced.length > 5 ? "…" : ""}
          </span>
        </Alert>
      )}

      {/* Ana tablo */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto max-h-[72vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="sticky top-0 z-20 bg-bg2 px-3 py-3 text-left text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap min-w-[22rem]">
                  Kod / Ad
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-3 py-3 text-left text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  Seviye
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-3 py-3 text-right text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  Miktar
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-3 py-3 text-left text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  Birim
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-3 py-3 text-center text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap min-w-[7rem]">
                  Yerel Ağırlık (%)
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-3 py-3 text-left text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border min-w-[20rem]">
                  Nihai Ağırlık · Dağılım
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-3 py-3 border-b border-border w-16"></th>
              </tr>
            </thead>
            <tbody>
              {viewMode === "all"
                ? visible.map((w) => renderRow(w))
                : groups?.map((g) => (
                    <Fragment key={g.parent?.code ?? "__root__"}>
                      {renderGroupHeader(g)}
                      {g.children.map((w) => renderRow(w))}
                      {renderGroupFooter(g)}
                    </Fragment>
                  ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-text3 text-sm">
                    Görünür kalem yok. Filtre veya genişletme durumunu kontrol et.
                  </td>
                </tr>
              )}
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
// ModePill — görünüm modu butonu
// ============================================================
function ModePill({
  active,
  onClick,
  icon,
  label,
  count,
  colorClass,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  colorClass: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
        active
          ? "bg-white shadow-soft border border-border text-text"
          : "text-text2 hover:text-text"
      )}
    >
      <span className={active ? colorClass : "text-text3"}>{icon}</span>
      {label}
      <span
        className={cn(
          "inline-flex items-center justify-center min-w-[22px] h-[20px] px-1.5 rounded-md text-[11px] font-bold tabular-nums",
          active ? "bg-bg3 text-text2" : "bg-bg3 text-text3"
        )}
      >
        {count}
      </span>
    </button>
  );
}

// ============================================================
// StatBlock
// ============================================================
const STAT_COLORS: Record<string, { bg: string; icon: string }> = {
  slate: { bg: "border-border bg-white", icon: "bg-slate-100 text-slate-600" },
  blue: { bg: "border-blue/20 bg-blue/5", icon: "bg-blue/10 text-blue" },
  green: { bg: "border-green/20 bg-green/5", icon: "bg-green/10 text-green" },
  yellow: { bg: "border-yellow/30 bg-yellow/5", icon: "bg-yellow/10 text-yellow" },
};

function StatBlock({
  label,
  value,
  sub,
  icon,
  color = "slate",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  color?: string;
}) {
  const c = STAT_COLORS[color] || STAT_COLORS.slate;
  return (
    <div className={cn("rounded-xl border p-4 shadow-soft", c.bg)}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-wider font-bold text-text3">{label}</div>
        {icon && (
          <span className={cn("inline-flex items-center justify-center w-8 h-8 rounded-lg", c.icon)}>
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
            <option value={0}>L0 — Proje Kökü</option>
            <option value={1}>L1 — Ana Başlık</option>
            <option value={2}>L2 — Alt Başlık</option>
            <option value={3}>L3 — İş Kalemi (Yaprak)</option>
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
        <Field
          label="Yerel Ağırlık (%)"
          hint="0 girilirse otomatik eşit dağıtım. Kardeşlerin toplamı 100 olması beklenir."
          className="sm:col-span-2"
        >
          <Input
            type="number"
            step="0.1"
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

"use client";

import { useMemo, useState } from "react";
import { FolderTree, Plus, Pencil, Trash2, ChevronRight, ChevronDown } from "lucide-react";
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
import { cn, formatNumber, formatPct } from "@/lib/utils";
import { computeProgress, sumByDateMap } from "@/lib/calc/progress";
import type { WbsItem } from "@/lib/store/types";

export default function WbsPage() {
  const project = useCurrentProject();
  const wbs = useProjectWbs(project?.id);
  const planned = useProjectPlanned(project?.id);
  const realized = useProjectRealized(project?.id);
  const addWbs = useStore((s) => s.addWbs);
  const updateWbs = useStore((s) => s.updateWbs);
  const softDeleteWbs = useStore((s) => s.softDeleteWbs);

  const [editing, setEditing] = useState<WbsItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    // Default: tüm L0 ve L1 açık
    const m: Record<string, boolean> = {};
    return m;
  });
  const [filterDiscipline, setFilterDiscipline] = useState<string>("");

  // Hesaplama: progress
  const items = wbs.map((w) => ({
    code: w.code,
    isLeaf: w.isLeaf,
    quantity: w.quantity,
    weight: w.weight,
  }));
  const { planPct, realPct } = useMemo(
    () => computeProgress(items, planned, realized, project?.reportDate || ""),
    [items, planned, realized, project?.reportDate]
  );

  // Ağaç sırasında göster (code'a göre sıralı)
  const sorted = useMemo(() => {
    return [...wbs].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [wbs]);

  // Ağırlık toplamı
  const customWeightTotal = wbs.filter((w) => w.isLeaf).reduce((s, w) => s + (w.weight || 0), 0);

  function toggleExpand(code: string) {
    setExpanded((s) => ({ ...s, [code]: !s[code] }));
  }

  function isVisible(code: string): boolean {
    // Eğer ata path'ı kapalıysa görünme. Path: "1.2.3.4" → ataları "1.2.3", "1.2", "1"
    const parts = code.split(".");
    for (let i = 1; i < parts.length; i++) {
      const ancestor = parts.slice(0, i).join(".");
      if (expanded[ancestor] === false) return false;
      if (expanded[ancestor] === undefined && i < parts.length - 1 /* L0/L1 default açık */ && i > 1)
        return false; // L2+ default kapalı
    }
    return true;
  }

  const visible = sorted.filter((w) => isVisible(w.code) && (!filterDiscipline || w.discipline === filterDiscipline));

  if (!project) return <Empty />;

  return (
    <>
      <PageHeader
        title="WBS Yapısı"
        description={`${wbs.length} madde — Ağırlık ${customWeightTotal > 0 ? "özelleştirilmiş" : "otomatik eşit dağılım"}`}
        icon={FolderTree}
        actions={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus size={14} /> Yeni WBS
          </Button>
        }
      />

      {customWeightTotal > 0 && Math.abs(customWeightTotal - 1) > 0.01 && (
        <Alert variant="warning" className="mb-4">
          Özel ağırlıklar toplamı <strong>{customWeightTotal.toFixed(3)}</strong> (1.000 olması beklenir).
          Eksik ağırlıklar otomatik normalize edilir.
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="bg-bg4/80 text-left px-3 py-2.5 text-text3 text-[10px] uppercase tracking-[1.5px] font-display font-semibold border-b border-border2">
                    Kod / Ad
                  </th>
                  <th className="bg-bg4/80 px-3 py-2.5 text-text3 text-[10px] uppercase tracking-[1.5px] font-display font-semibold border-b border-border2 text-right">
                    Miktar
                  </th>
                  <th className="bg-bg4/80 px-3 py-2.5 text-text3 text-[10px] uppercase tracking-[1.5px] font-display font-semibold border-b border-border2">
                    Birim
                  </th>
                  <th className="bg-bg4/80 px-3 py-2.5 text-text3 text-[10px] uppercase tracking-[1.5px] font-display font-semibold border-b border-border2 text-right">
                    Plan / Real
                  </th>
                  <th className="bg-bg4/80 px-3 py-2.5 text-text3 text-[10px] uppercase tracking-[1.5px] font-display font-semibold border-b border-border2 text-right">
                    Ağırlık
                  </th>
                  <th className="bg-bg4/80 px-3 py-2.5 text-text3 text-[10px] uppercase tracking-[1.5px] font-display font-semibold border-b border-border2"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((w) => {
                  const hasChildren = wbs.some((c) => c.code !== w.code && c.code.startsWith(w.code + "."));
                  const isExpanded =
                    expanded[w.code] !== undefined
                      ? expanded[w.code]
                      : w.level <= 1; // default L0/L1 açık
                  const pSum = w.isLeaf ? sumByDateMap(planned, w.code, project.reportDate) : 0;
                  const rSum = w.isLeaf ? sumByDateMap(realized, w.code, project.reportDate) : 0;
                  return (
                    <tr key={w.id} className="hover:bg-bg3/40 border-b border-border">
                      <td
                        className={cn(
                          "px-3 py-2",
                          w.level === 0 && "font-bold text-accent bg-accent3/5",
                          w.level === 1 && "font-semibold text-blue bg-blue/5",
                          w.level === 2 && "font-medium text-text",
                          w.level === 3 && "text-text2 pl-10"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          {hasChildren ? (
                            <button
                              onClick={() => toggleExpand(w.code)}
                              className="text-text3 hover:text-text"
                            >
                              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </button>
                          ) : (
                            <span className="w-3" />
                          )}
                          <span className="font-mono text-xs">{w.code}</span>
                          <span>{w.name}</span>
                          {w.discipline && <Badge variant="gray">{w.discipline}</Badge>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {w.isLeaf && w.quantity > 0 ? formatNumber(w.quantity, 0) : ""}
                      </td>
                      <td className="px-3 py-2 text-xs text-text3">{w.unit}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {w.isLeaf && w.quantity > 0 ? (
                          <span>
                            <span className="text-planned">{formatPct(pSum / w.quantity, 0)}</span>
                            <span className="text-text3 mx-1">/</span>
                            <span className="text-realized">{formatPct(rSum / w.quantity, 0)}</span>
                          </span>
                        ) : (
                          ""
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {w.isLeaf ? formatNumber(w.weight, 3) : ""}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => setEditing(w)}
                            className="p-1 rounded text-text3 hover:bg-bg3 hover:text-accent"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`"${w.name}" silinsin mi? (Çöp Kutusu'ndan geri yüklenebilir)`))
                                softDeleteWbs(w.id);
                            }}
                            className="p-1 rounded text-text3 hover:bg-bg3 hover:text-red"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle>Genel İlerleme</CardTitle>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text3">Planlanan</span>
                  <span className="font-mono text-planned">{formatPct(planPct, 1)}</span>
                </div>
                <div className="h-1.5 bg-bg4 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-planned transition-all"
                    style={{ width: `${planPct * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text3">Gerçekleşen</span>
                  <span className="font-mono text-realized">{formatPct(realPct, 1)}</span>
                </div>
                <div className="h-1.5 bg-bg4 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-realized transition-all"
                    style={{ width: `${realPct * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>Filtreler</CardTitle>
            <Field label="Disiplin">
              <Select value={filterDiscipline} onChange={(e) => setFilterDiscipline(e.target.value)}>
                <option value="">Tümü</option>
                <option value="mekanik">Mekanik</option>
                <option value="elektrik">Elektrik</option>
                <option value="insaat">İnşaat</option>
                <option value="muhendislik">Mühendislik</option>
                <option value="idari">İdari</option>
                <option value="diger">Diğer</option>
              </Select>
            </Field>
          </Card>
        </div>
      </div>

      <WbsForm
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(data) => {
          if (!project) return;
          addWbs({
            ...data,
            projectId: project.id,
            parentCode: data.code.includes(".")
              ? data.code.split(".").slice(0, -1).join(".")
              : undefined,
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
        <Field label="Yaprak mı? (puantaj/planlamaya konu)">
          <Select value={isLeaf ? "yes" : "no"} onChange={(e) => setIsLeaf(e.target.value === "yes")}>
            <option value="yes">Evet</option>
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
        <Field label="Ağırlık (0 = otomatik)">
          <Input
            type="number"
            step="0.001"
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

function Empty() {
  return (
    <Card>
      <CardTitle>Proje Yok</CardTitle>
      <p className="text-sm text-text2">Önce bir proje seç.</p>
    </Card>
  );
}

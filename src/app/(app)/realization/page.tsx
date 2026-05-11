"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Save, ChevronLeft, ChevronRight, Copy, ListChecks } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { sumByDateMap } from "@/lib/calc/progress";
import { formatNumber, formatDate, toISODate, daysBetween, cn, spiLevel } from "@/lib/utils";
import { PlanRealList } from "@/components/wbs/plan-real-list";

export default function RealizationPage() {
  const project = useCurrentProject();
  const wbs = useProjectWbs(project?.id);
  const realized = useProjectRealized(project?.id);
  const planned = useProjectPlanned(project?.id);
  const setRealized = useStore((s) => s.setRealized);
  const toast = useToast((s) => s.push);

  const [date, setDate] = useState(toISODate(new Date()));

  const leafs = useMemo(
    () => wbs
      .filter((w) => w.isLeaf)
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
    [wbs]
  );

  // Local draft: o günkü değerler için
  const [draft, setDraft] = useState<Record<string, string>>({});

  // Tarih değişince draft'ı doldur
  useEffect(() => {
    const d: Record<string, string> = {};
    for (const w of leafs) {
      const v = realized[w.code]?.[date];
      if (v) d[w.code] = String(v);
    }
    setDraft(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  if (!project) {
    return (
      <Card>
        <CardTitle>Proje Yok</CardTitle>
        <p className="text-sm text-text2">Önce bir proje seç.</p>
      </Card>
    );
  }

  // proje gün numarası
  const projectDay = daysBetween(project.startDate, date) + 1;

  function shiftDate(delta: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(toISODate(d));
  }

  function copyFromYesterday() {
    if (!project) return;
    const yesterday = toISODate(new Date(new Date(date).getTime() - 86400000));
    const d: Record<string, string> = {};
    let count = 0;
    for (const w of leafs) {
      const v = realized[w.code]?.[yesterday];
      if (v) {
        d[w.code] = String(v);
        count++;
      }
    }
    setDraft(d);
    toast(`Önceki gün (${formatDate(yesterday)}) — ${count} kayıt kopyalandı`, "info");
  }

  function saveAll() {
    if (!project) return;
    let count = 0;
    // Silinen değerler için, eski draft'ta vardı ama yeni'de yoksa 0 yaz
    const oldKeys = new Set<string>();
    for (const w of leafs) {
      if (realized[w.code]?.[date] != null) oldKeys.add(w.code);
    }
    for (const [code, value] of Object.entries(draft)) {
      const qty = Number(value) || 0;
      const prev = realized[code]?.[date] ?? 0;
      if (qty !== prev) {
        setRealized(project.id, code, date, qty);
        count++;
      }
      oldKeys.delete(code);
    }
    // draft'tan silinmiş olanları temizle
    for (const code of oldKeys) {
      setRealized(project.id, code, date, 0);
      count++;
    }
    toast(`${formatDate(date)} kaydedildi · ${count} kayıt güncellendi`, "success");
  }

  return (
    <>
      <PageHeader
        title="Günlük Gerçekleşme Girişi"
        description={`Seçili tarih için her WBS kalemi sahada ne kadar ilerledi`}
        icon={CheckCircle2}
        actions={
          <>
            <Button variant="outline" onClick={copyFromYesterday}>
              <Copy size={14} /> Önceki Günden Kopyala
            </Button>
            <Button variant="accent" onClick={saveAll}>
              <Save size={14} /> Kaydet
            </Button>
          </>
        }
      />

      {/* Tarih navigasyon */}
      <Card className="mb-4 !p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => shiftDate(-1)}
            className="w-10 h-10 rounded-lg bg-white border border-border hover:bg-bg2 hover:border-text3 text-text2 flex items-center justify-center transition-all shadow-soft"
          >
            <ChevronLeft size={16} />
          </button>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={project.startDate}
            max={project.plannedEnd}
            className="w-52 !h-10 font-mono text-sm"
          />
          <button
            onClick={() => shiftDate(1)}
            className="w-10 h-10 rounded-lg bg-white border border-border hover:bg-bg2 hover:border-text3 text-text2 flex items-center justify-center transition-all shadow-soft"
          >
            <ChevronRight size={16} />
          </button>
          <div className="ml-2 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-bold">
            Gün {projectDay} / {project.durationDays}
          </div>
          <Button
            variant="ghost"
            onClick={() => setDate(toISODate(new Date()))}
            className="ml-auto"
          >
            Bugün
          </Button>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="sticky top-0 z-20 bg-bg2 px-4 py-3 text-left text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  WBS Kodu
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-4 py-3 text-left text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border min-w-[16rem]">
                  Açıklama
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-4 py-3 text-right text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  Toplam Miktar
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-4 py-3 text-left text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  Birim
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-4 py-3 text-right text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  Bugüne Kadar
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-4 py-3 text-center text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap min-w-[10rem]">
                  Bugünkü Gerçekleşme
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-4 py-3 text-right text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  Kümülatif %
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-4 py-3 text-right text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  Plan %
                </th>
                <th className="sticky top-0 z-20 bg-bg2 px-4 py-3 text-right text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  SPI
                </th>
              </tr>
            </thead>
            <tbody>
              {leafs.map((w) => {
                // bu güne kadar kümülatif (bugün hariç)
                const yesterday = toISODate(new Date(new Date(date).getTime() - 86400000));
                const cumUntilYesterday = sumByDateMap(realized, w.code, yesterday);
                const todayValue = Number(draft[w.code]) || 0;
                const cumIncludingToday = cumUntilYesterday + todayValue;
                const realPct = w.quantity > 0 ? (cumIncludingToday / w.quantity) * 100 : 0;

                const cumPlan = sumByDateMap(planned, w.code, date);
                const planPct = w.quantity > 0 ? (cumPlan / w.quantity) * 100 : 0;

                const spi = planPct > 0 ? realPct / planPct : null;
                const spiL = spiLevel(spi != null ? spi / 1 : null);

                const isActive = todayValue > 0;
                const today = toISODate(new Date());
                const isToday = date === today;

                return (
                  <tr key={w.id} className={cn("hover:bg-bg2/40", isActive && "bg-realized/5")}>
                    <td className="px-4 py-3 border-b border-border font-mono text-xs text-text3 whitespace-nowrap">
                      {w.code}
                    </td>
                    <td className="px-4 py-3 border-b border-border text-sm">{w.name}</td>
                    <td className="px-4 py-3 border-b border-border text-right font-mono text-xs text-text2 tabular-nums">
                      {formatNumber(w.quantity, 0)}
                    </td>
                    <td className="px-4 py-3 border-b border-border text-xs text-text3">{w.unit}</td>
                    <td className="px-4 py-3 border-b border-border text-right font-mono text-xs text-text2 tabular-nums">
                      {formatNumber(cumUntilYesterday, 1)}
                    </td>
                    <td className="px-4 py-3 border-b border-border">
                      <input
                        type="number"
                        step="any"
                        value={draft[w.code] ?? ""}
                        onChange={(e) =>
                          setDraft((s) => ({ ...s, [w.code]: e.target.value }))
                        }
                        placeholder="0"
                        className={cn(
                          "w-full h-9 px-3 rounded-lg bg-white border border-border2 text-center font-mono text-sm tabular-nums",
                          "focus:outline-none focus:border-accent focus:shadow-focus",
                          isActive && "border-realized/40 bg-realized/5 text-realized font-semibold",
                          isToday && "ring-1 ring-accent/10"
                        )}
                      />
                    </td>
                    <td className="px-4 py-3 border-b border-border text-right font-mono text-xs tabular-nums">
                      <span className={cn(realPct >= 99 ? "text-green font-semibold" : "text-text")}>
                        {realPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 border-b border-border text-right font-mono text-xs tabular-nums">
                      <span className={cn("text-planned", planPct >= 99 && "font-semibold")}>
                        {planPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 border-b border-border text-right font-mono text-xs tabular-nums">
                      {spi == null ? (
                        <span className="text-text3">—</span>
                      ) : (
                        <span
                          className={cn(
                            "font-semibold",
                            spiL === "good" && "text-green",
                            spiL === "warn" && "text-yellow",
                            spiL === "bad" && "text-red"
                          )}
                        >
                          {spi.toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {leafs.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-text3 text-sm">
                    WBS leaf maddesi yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Alt: Gerçekleşme Görüntüleme Listesi (salt okunur) */}
      <PlanRealList
        title="Gerçekleşmiş İşler — Gözlem Listesi"
        icon={<ListChecks size={14} className="text-realized" />}
        variant="realized"
        wbs={wbs}
        data={realized}
      />
    </>
  );
}

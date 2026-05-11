"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Save,
  Zap,
  Download,
  Info,
} from "lucide-react";
import {
  useStore,
  useCurrentProject,
  useProjectWbs,
  useProjectPlanned,
} from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { computeProgress } from "@/lib/calc/progress";
import { formatNumber, formatDate, toISODate, addDays, daysBetween, cn } from "@/lib/utils";
import { PlanRealList } from "@/components/wbs/plan-real-list";
import { ListChecks } from "lucide-react";

const MONTH_NAMES_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const MONTH_NAMES_SHORT = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

interface MonthInfo {
  key: string;        // "2026-03"
  year: number;
  month: number;      // 1-12
  label: string;      // "Mar 2026"
  longLabel: string;  // "Mart 2026"
  daysInMonth: number;
  firstDate: string;  // ISO
  lastDate: string;   // ISO
}

function getProjectMonths(startISO: string, endISO: string): MonthInfo[] {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const months: MonthInfo[] = [];
  let y = start.getFullYear();
  let m = start.getMonth();
  while (y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth())) {
    const lastDay = new Date(y, m + 1, 0).getDate();
    months.push({
      key: `${y}-${String(m + 1).padStart(2, "0")}`,
      year: y,
      month: m + 1,
      label: `${MONTH_NAMES_SHORT[m]} ${y}`,
      longLabel: `${MONTH_NAMES_TR[m]} ${y}`,
      daysInMonth: lastDay,
      firstDate: `${y}-${String(m + 1).padStart(2, "0")}-01`,
      lastDate: `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    });
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return months;
}

export default function PlanningPage() {
  const project = useCurrentProject();
  const wbs = useProjectWbs(project?.id);
  const planned = useProjectPlanned(project?.id);
  const setPlanned = useStore((s) => s.setPlanned);
  const toast = useToast((s) => s.push);

  const leafs = useMemo(
    () => wbs
      .filter((w) => w.isLeaf)
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
    [wbs]
  );

  const months = useMemo(
    () => project ? getProjectMonths(project.startDate, project.plannedEnd) : [],
    [project]
  );

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>("");
  const [autoOpen, setAutoOpen] = useState(false);

  // local draft: { [code]: { [date]: string } }
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});

  // İlk yüklemede planned'dan draft'a kopya
  useEffect(() => {
    const d: Record<string, Record<string, string>> = {};
    for (const [code, byDate] of Object.entries(planned)) {
      d[code] = {};
      for (const [date, qty] of Object.entries(byDate)) {
        d[code][date] = String(qty);
      }
    }
    setDraft(d);
  }, [planned]);

  // Selected month default
  useEffect(() => {
    if (selectedMonthKey || months.length === 0) return;
    const today = toISODate(new Date());
    const idx = months.findIndex((m) => today >= m.firstDate && today <= m.lastDate);
    setSelectedMonthKey(months[idx >= 0 ? idx : 0].key);
  }, [months, selectedMonthKey]);

  const selectedMonth = months.find((m) => m.key === selectedMonthKey) || months[0];

  if (!project) {
    return (
      <Card>
        <CardTitle>Proje Yok</CardTitle>
        <p className="text-sm text-text2">Önce bir proje seç.</p>
      </Card>
    );
  }

  // Helpers
  function getDraftValue(code: string, date: string): string {
    return draft[code]?.[date] ?? "";
  }
  function setDraftValue(code: string, date: string, value: string) {
    setDraft((s) => ({
      ...s,
      [code]: { ...(s[code] || {}), [date]: value },
    }));
  }

  // Hesaplama: bir leaf'in TOPLAM planı (tüm proje boyunca)
  function totalForLeaf(code: string): number {
    const byDate = draft[code] || {};
    return Object.values(byDate).reduce((s, v) => s + (Number(v) || 0), 0);
  }
  // Selected ay toplamı
  function monthTotalForLeaf(code: string, month: MonthInfo): number {
    const byDate = draft[code] || {};
    let s = 0;
    for (const [d, v] of Object.entries(byDate)) {
      if (d >= month.firstDate && d <= month.lastDate) s += Number(v) || 0;
    }
    return s;
  }

  // Save (commit draft → store)
  function saveAll() {
    if (!project) return;
    let count = 0;
    for (const [code, byDate] of Object.entries(draft)) {
      // önce mevcut planned'ı temizle (kaldırılmış değerler için)
      const prev = planned[code] || {};
      for (const d of Object.keys(prev)) {
        if (byDate[d] === undefined || byDate[d] === "" || Number(byDate[d]) === 0) {
          setPlanned(project.id, code, d, 0);
        }
      }
      // yeni değerleri yaz
      for (const [d, v] of Object.entries(byDate)) {
        const qty = Number(v) || 0;
        const prevQty = prev[d] ?? 0;
        if (qty !== prevQty) {
          setPlanned(project.id, code, d, qty);
          count++;
        }
      }
    }
    toast(`Plan kaydedildi · ${count} hücre güncellendi`, "success");
  }

  // Otomatik dağıt: bir WBS leaf için başlangıç-bitiş arası eşit dağıtım
  function autoDistribute(code: string, startDate: string, endDate: string, totalQty: number) {
    if (!project) return;
    const days = daysBetween(startDate, endDate) + 1;
    if (days <= 0) return;
    const perDay = totalQty / days;
    const newCodeMap: Record<string, string> = {};
    const start = new Date(startDate);
    for (let i = 0; i < days; i++) {
      const d = toISODate(addDays(start, i));
      if (d > project.plannedEnd || d < project.startDate) continue;
      newCodeMap[d] = String(perDay);
    }
    setDraft((s) => ({ ...s, [code]: newCodeMap }));
    setAutoOpen(false);
    toast(`Otomatik dağıtıldı · ${days} güne ${formatNumber(perDay, 2)} ${leafs.find((l) => l.code === code)?.unit || ""}/gün`, "success");
  }

  // CSV export
  function exportCSV() {
    if (!project) return;
    const lines: string[] = [];
    const headerCols = ["WBS Kodu", "Açıklama", "Birim", "Tarih", "Miktar"];
    lines.push(headerCols.join(","));
    for (const w of leafs) {
      const byDate = draft[w.code] || {};
      for (const [d, v] of Object.entries(byDate)) {
        const qty = Number(v) || 0;
        if (qty === 0) continue;
        lines.push([w.code, `"${w.name}"`, w.unit, d, qty.toString()].join(","));
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "-")}-plan-${toISODate(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Bugüne kadar kümülatif plan %
  const cumProgress = useMemo(() => {
    // draft içeren planned hesabı yap
    const plannedAsMap: Record<string, Record<string, number>> = {};
    for (const [c, m] of Object.entries(draft)) {
      plannedAsMap[c] = {};
      for (const [d, v] of Object.entries(m)) {
        const q = Number(v) || 0;
        if (q > 0) plannedAsMap[c][d] = q;
      }
    }
    const items = wbs.map((w) => ({
      code: w.code,
      isLeaf: w.isLeaf,
      quantity: w.quantity,
      weight: w.weight,
    }));
    return computeProgress(items, plannedAsMap, {}, project.reportDate).planPct;
  }, [draft, wbs, project.reportDate]);

  // Gün başlıkları
  const dayHeaders = useMemo(() => {
    if (!selectedMonth) return [] as { date: string; day: number }[];
    const arr: { date: string; day: number }[] = [];
    for (let d = 1; d <= selectedMonth.daysInMonth; d++) {
      const dateStr = `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      arr.push({ date: dateStr, day: d });
    }
    return arr;
  }, [selectedMonth]);

  return (
    <>
      <PageHeader
        title="Proje Baseline Planı — Tüm Proje Takvimi"
        description="Her imalat kalemi için gün gün planlama. Yan menüden ay seç, hücrelere miktar gir, Planı Kaydet."
        icon={CalendarDays}
        actions={
          <>
            <Button variant="outline" onClick={exportCSV}>
              <Download size={14} /> CSV Aktar
            </Button>
            <Button variant="primary" onClick={() => setAutoOpen(true)}>
              <Zap size={14} /> Otomatik Dağıt
            </Button>
            <Button variant="accent" onClick={saveAll}>
              <Save size={14} /> Planı Kaydet
            </Button>
          </>
        }
      />

      <Alert variant="info" className="mb-4">
        <strong>Nasıl kullanılır:</strong> Bu sayfa projenin başında bir kez doldurulur. Her imalat kalemi için
        hangi günde ne kadar yapılacağı girilir. Ay sekmeleriyle gezin, hücrelere miktar yazın ve <strong>Planı Kaydet</strong>&apos;e
        basın. &quot;Otomatik Dağıt&quot; ile başlangıç-bitiş günü seçerek miktarı eşit dağıtabilirsiniz.
      </Alert>

      {/* AY SEÇ */}
      <Card className="mb-4 !p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[10px] uppercase tracking-wider font-bold text-text3">AY SEÇ:</span>
          <div className="flex flex-wrap gap-1 p-1 bg-bg2 border border-border rounded-lg">
            {months.map((m) => {
              const isCurrent =
                toISODate(new Date()) >= m.firstDate && toISODate(new Date()) <= m.lastDate;
              return (
                <button
                  key={m.key}
                  onClick={() => setSelectedMonthKey(m.key)}
                  className={cn(
                    "px-3 h-8 rounded text-xs font-semibold transition-all flex items-center gap-1.5",
                    selectedMonthKey === m.key
                      ? "bg-white text-text shadow-soft border border-border"
                      : "text-text2 hover:text-text"
                  )}
                >
                  {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-red animate-pulse-soft" />}
                  {m.label}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-5 text-xs text-text2">
            <span className="flex items-center gap-1.5">
              <Info size={12} className="text-text3" />
              Gösterilen: <strong className="text-text">{selectedMonth?.longLabel}</strong>
            </span>
            <span>
              Bugüne kadar kümülatif plan:{" "}
              <strong className="text-accent font-mono">{(cumProgress * 100).toFixed(1)}%</strong>
            </span>
            <span>
              Proje toplam gün: <strong className="font-mono text-text">{project.durationDays}</strong>
            </span>
          </div>
        </div>
      </Card>

      {/* MATRİS TABLOSU */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="sticky top-0 z-30 bg-bg2 px-3 py-2 text-left text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border w-20 min-w-[5rem] border-r" style={{ left: 0 }}>
                  WBS
                </th>
                <th className="sticky top-0 z-30 bg-bg2 px-3 py-2 text-left text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border min-w-[14rem]" style={{ left: 80 }}>
                  Açıklama
                </th>
                <th className="sticky top-0 z-30 bg-bg2 px-3 py-2 text-right text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border min-w-[5rem]" style={{ left: 304 }}>
                  Toplam
                </th>
                <th className="sticky top-0 z-30 bg-bg2 px-3 py-2 text-left text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border min-w-[3.5rem] border-r-2 border-r-border2" style={{ left: 384 }}>
                  Birim
                </th>
                {dayHeaders.map(({ date, day }) => {
                  const isToday = date === project.reportDate;
                  const inProject = date >= project.startDate && date <= project.plannedEnd;
                  return (
                    <th
                      key={date}
                      className={cn(
                        "sticky top-0 z-20 px-1 py-2 text-center text-[10px] font-bold border-b border-border min-w-[2.75rem]",
                        isToday ? "bg-accent/15 text-accent" : "bg-bg2 text-text2",
                        !inProject && "opacity-40"
                      )}
                    >
                      <div className="text-[11px]">{day}</div>
                      <div className="text-[9px] font-normal text-text3">
                        {daysBetween(project.startDate, date) + 1}
                      </div>
                    </th>
                  );
                })}
                <th className="sticky top-0 z-30 bg-bg2 px-3 py-2 text-right text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border min-w-[6rem] border-l-2 border-l-border2" style={{ right: 96 }}>
                  Bu Ay
                </th>
                <th className="sticky top-0 z-30 bg-bg2 px-3 py-2 text-right text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border min-w-[6rem]" style={{ right: 0 }}>
                  Kümülatif %
                </th>
              </tr>
            </thead>
            <tbody>
              {leafs.map((w) => {
                const totalDraft = totalForLeaf(w.code);
                const monthSum = selectedMonth ? monthTotalForLeaf(w.code, selectedMonth) : 0;
                const cumPct = w.quantity > 0 ? (totalDraft / w.quantity) * 100 : 0;
                return (
                  <tr key={w.id} className="group hover:bg-bg2/50">
                    <td className="sticky z-20 bg-white group-hover:bg-bg2/50 px-3 py-2 border-b border-border font-mono text-xs text-text3 w-20 min-w-[5rem]" style={{ left: 0 }}>
                      {w.code}
                    </td>
                    <td className="sticky z-20 bg-white group-hover:bg-bg2/50 px-3 py-2 border-b border-border min-w-[14rem]" style={{ left: 80 }}>
                      <div className="text-xs text-text font-medium truncate max-w-[20rem]" title={w.name}>
                        {w.name}
                      </div>
                    </td>
                    <td className="sticky z-20 bg-white group-hover:bg-bg2/50 px-3 py-2 border-b border-border text-right font-mono text-xs text-text2 tabular-nums min-w-[5rem]" style={{ left: 304 }}>
                      {formatNumber(w.quantity, 0)}
                    </td>
                    <td className="sticky z-20 bg-white group-hover:bg-bg2/50 px-3 py-2 border-b border-border text-xs text-text3 border-r-2 border-r-border2 min-w-[3.5rem]" style={{ left: 384 }}>
                      {w.unit}
                    </td>
                    {dayHeaders.map(({ date }) => {
                      const inProject = date >= project.startDate && date <= project.plannedEnd;
                      const isToday = date === project.reportDate;
                      const value = getDraftValue(w.code, date);
                      return (
                        <td
                          key={date}
                          className={cn(
                            "border-b border-border p-0.5",
                            isToday && "bg-accent/5",
                            !inProject && "bg-bg2/40"
                          )}
                        >
                          <input
                            type="number"
                            step="any"
                            value={value}
                            disabled={!inProject}
                            onChange={(e) => setDraftValue(w.code, date, e.target.value)}
                            className={cn(
                              "w-full px-0.5 py-1 bg-transparent text-center text-[11px] font-mono tabular-nums rounded leading-tight",
                              "focus:outline-none focus:bg-white focus:ring-2 focus:ring-accent/30 focus:shadow-focus",
                              !inProject && "text-text3 cursor-not-allowed",
                              value && "bg-blue/5 text-planned font-semibold"
                            )}
                            placeholder=""
                          />
                        </td>
                      );
                    })}
                    <td className="sticky z-20 bg-white group-hover:bg-bg2/50 px-3 py-2 border-b border-border text-right font-mono font-semibold text-text tabular-nums text-xs border-l-2 border-l-border2 min-w-[6rem]" style={{ right: 96 }}>
                      {formatNumber(monthSum, 2)}
                    </td>
                    <td className="sticky z-20 bg-white group-hover:bg-bg2/50 px-3 py-2 border-b border-border text-right min-w-[6rem]" style={{ right: 0 }}>
                      <span
                        className={cn(
                          "font-mono text-xs tabular-nums font-semibold",
                          cumPct >= 99 ? "text-green" : cumPct < 1 ? "text-text3" : "text-text"
                        )}
                      >
                        {cumPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              {leafs.length === 0 && (
                <tr>
                  <td colSpan={6 + dayHeaders.length} className="px-3 py-10 text-center text-text3 text-sm">
                    WBS leaf maddesi yok. Önce WBS Yapısı sayfasından eklemen gerek.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Alt: Plan Görüntüleme Listesi (salt okunur) */}
      <PlanRealList
        title="Planlanan İşler — Gözlem Listesi"
        icon={<ListChecks size={14} className="text-planned" />}
        variant="planned"
        wbs={wbs}
        data={planned}
      />

      <AutoDistributeDialog
        open={autoOpen}
        onClose={() => setAutoOpen(false)}
        leafs={leafs}
        startDate={project.startDate}
        endDate={project.plannedEnd}
        onSubmit={autoDistribute}
      />
    </>
  );
}

function AutoDistributeDialog({
  open,
  onClose,
  leafs,
  startDate,
  endDate,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  leafs: { code: string; name: string; quantity: number; unit: string }[];
  startDate: string;
  endDate: string;
  onSubmit: (code: string, start: string, end: string, qty: number) => void;
}) {
  const [code, setCode] = useState("");
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const [qty, setQty] = useState<string>("");

  useEffect(() => {
    if (!code && leafs.length > 0) {
      setCode(leafs[0].code);
    }
  }, [leafs, code]);

  const selectedLeaf = leafs.find((l) => l.code === code);
  const days = Math.max(1, daysBetween(start, end) + 1);
  const perDay = (Number(qty) || 0) / days;

  return (
    <Dialog open={open} onClose={onClose} title="Otomatik Dağıt" size="md">
      <p className="text-sm text-text2 mb-4">
        Bir WBS kalemi için başlangıç ve bitiş günü seç, miktarı gün sayısına eşit dağıtalım.
        Bu kalemin önceki tüm günlük plan değerleri <strong className="text-red">silinir</strong> ve yeni dağıtım yapılır.
      </p>
      <div className="space-y-3">
        <Field label="WBS Maddesi">
          <Select value={code} onChange={(e) => setCode(e.target.value)}>
            {leafs.map((l) => (
              <option key={l.code} value={l.code}>
                {l.code} — {l.name} ({formatNumber(l.quantity, 0)} {l.unit})
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Başlangıç">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} min={startDate} max={endDate} />
          </Field>
          <Field label="Bitiş">
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} min={startDate} max={endDate} />
          </Field>
        </div>
        <Field label="Toplam Miktar" hint={`Varsayılan: ${selectedLeaf ? formatNumber(selectedLeaf.quantity, 0) + ' ' + selectedLeaf.unit : '—'}`}>
          <Input
            type="number"
            step="any"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder={selectedLeaf ? String(selectedLeaf.quantity) : ""}
          />
        </Field>
        {qty && (
          <Alert variant="info">
            <strong>{days}</strong> gün boyunca günlük{" "}
            <strong className="font-mono">{formatNumber(perDay, 3)}</strong> {selectedLeaf?.unit || ""} dağıtılır.
            <br />
            <span className="text-xs text-text3">
              {formatDate(start)} → {formatDate(end)}
            </span>
          </Alert>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>İptal</Button>
        <Button
          variant="accent"
          onClick={() => {
            const numQty = Number(qty) || selectedLeaf?.quantity || 0;
            if (numQty <= 0) return;
            onSubmit(code, start, end, numQty);
            setQty("");
          }}
          disabled={!code}
        >
          <Zap size={14} /> Dağıt
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

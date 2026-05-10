"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import {
  useStore,
  useCurrentProject,
  useProjectWbs,
  useProjectPlanned,
} from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { formatDate, formatNumber, toISODate } from "@/lib/utils";

export default function PlanningPage() {
  const project = useCurrentProject();
  const wbs = useProjectWbs(project?.id);
  const planned = useProjectPlanned(project?.id);
  const setPlanned = useStore((s) => s.setPlanned);

  const leafs = useMemo(() => wbs.filter((w) => w.isLeaf), [wbs]);

  const [date, setDate] = useState(toISODate(new Date()));
  const [code, setCode] = useState("");
  const [qty, setQty] = useState("");

  function add() {
    if (!project || !code || !qty) return;
    setPlanned(project.id, code, date, Number(qty));
    setQty("");
  }

  // O gün için kayıt listesi
  const entriesOnDate = useMemo(() => {
    const list: { code: string; name: string; qty: number; unit: string }[] = [];
    for (const w of leafs) {
      const v = planned[w.code]?.[date];
      if (v) list.push({ code: w.code, name: w.name, qty: v, unit: w.unit });
    }
    return list;
  }, [planned, date, leafs]);

  // Tüm kayıtlar (özet)
  const allEntries = useMemo(() => {
    const map: Record<string, { date: string; code: string; qty: number; name: string; unit: string }[]> = {};
    for (const w of leafs) {
      const byDate = planned[w.code] || {};
      for (const [d, v] of Object.entries(byDate)) {
        if (!map[d]) map[d] = [];
        map[d].push({ date: d, code: w.code, qty: v, name: w.name, unit: w.unit });
      }
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, list]) => ({ date: d, items: list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })) }));
  }, [planned, leafs]);

  if (!project)
    return (
      <Card>
        <CardTitle>Proje Yok</CardTitle>
        <p className="text-sm text-text2">Önce bir proje seç.</p>
      </Card>
    );

  return (
    <>
      <PageHeader title="Planlama" description="Günlük plan girişleri" icon={CalendarDays} />

      <Card className="mb-6">
        <CardTitle>Yeni Plan Kaydı</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_140px_auto] gap-3 items-end">
          <Field label="Tarih">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="WBS Maddesi">
            <Select value={code} onChange={(e) => setCode(e.target.value)}>
              <option value="">— Seçin —</option>
              {leafs.map((w) => (
                <option key={w.id} value={w.code}>
                  {w.code} — {w.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Miktar">
            <Input
              type="number"
              step="0.01"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Button variant="accent" onClick={add}>
            <Plus size={14} /> Ekle
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle>{formatDate(date)} Kayıtları</CardTitle>
          {entriesOnDate.length === 0 ? (
            <p className="text-sm text-text3">Bu tarih için kayıt yok.</p>
          ) : (
            <div className="space-y-1.5">
              {entriesOnDate.map((e) => (
                <div
                  key={e.code}
                  className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-bg3"
                >
                  <div>
                    <span className="font-mono text-text3">{e.code}</span>
                    <span className="ml-2 text-text">{e.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-planned">
                      {formatNumber(e.qty, 2)} {e.unit}
                    </span>
                    <button
                      onClick={() => setPlanned(project.id, e.code, date, 0)}
                      className="p-1 text-text3 hover:text-red rounded"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Tüm Plan Geçmişi</CardTitle>
          {allEntries.length === 0 ? (
            <p className="text-sm text-text3">Henüz plan kaydı yok.</p>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto">
              {allEntries.map((g) => (
                <div key={g.date}>
                  <div className="text-xs text-text3 font-display uppercase tracking-wider mb-1">
                    {formatDate(g.date)} · {g.items.length} kayıt
                  </div>
                  <div className="space-y-1 pl-2 border-l border-border">
                    {g.items.map((it) => (
                      <div key={`${g.date}-${it.code}`} className="text-xs text-text2 flex justify-between">
                        <span>
                          <span className="font-mono text-text3">{it.code}</span> {it.name}
                        </span>
                        <span className="font-mono text-planned">
                          {formatNumber(it.qty, 2)} {it.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

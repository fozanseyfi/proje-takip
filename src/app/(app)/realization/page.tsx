"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import {
  useStore,
  useCurrentProject,
  useProjectWbs,
  useProjectRealized,
  useProjectPlanned,
} from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { formatDate, formatNumber, formatPct, toISODate } from "@/lib/utils";
import { sumByDateMap } from "@/lib/calc/progress";

export default function RealizationPage() {
  const project = useCurrentProject();
  const wbs = useProjectWbs(project?.id);
  const realized = useProjectRealized(project?.id);
  const planned = useProjectPlanned(project?.id);
  const setRealized = useStore((s) => s.setRealized);

  const leafs = useMemo(() => wbs.filter((w) => w.isLeaf), [wbs]);

  const [date, setDate] = useState(toISODate(new Date()));
  const [code, setCode] = useState("");
  const [qty, setQty] = useState("");

  function add() {
    if (!project || !code || !qty) return;
    setRealized(project.id, code, date, Number(qty));
    setQty("");
  }

  const entriesOnDate = useMemo(() => {
    const list: { code: string; name: string; qty: number; unit: string; quantity: number; cumReal: number }[] = [];
    for (const w of leafs) {
      const v = realized[w.code]?.[date];
      if (v) {
        const cum = sumByDateMap(realized, w.code, date);
        list.push({ code: w.code, name: w.name, qty: v, unit: w.unit, quantity: w.quantity, cumReal: cum });
      }
    }
    return list;
  }, [realized, date, leafs]);

  if (!project)
    return (
      <Card>
        <CardTitle>Proje Yok</CardTitle>
        <p className="text-sm text-text2">Önce bir proje seç.</p>
      </Card>
    );

  return (
    <>
      <PageHeader
        title="Gerçekleşme"
        description="Sahada yapılan iş miktarları"
        icon={CheckCircle2}
      />

      <Card className="mb-6">
        <CardTitle>Yeni Gerçekleşme Kaydı</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_140px_auto] gap-3 items-end">
          <Field label="Tarih">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="WBS Maddesi">
            <Select value={code} onChange={(e) => setCode(e.target.value)}>
              <option value="">— Seçin —</option>
              {leafs.map((w) => {
                const planSum = sumByDateMap(planned, w.code, date);
                return (
                  <option key={w.id} value={w.code}>
                    {w.code} — {w.name} {planSum > 0 ? `(Plan: ${formatNumber(planSum, 0)} ${w.unit})` : ""}
                  </option>
                );
              })}
            </Select>
          </Field>
          <Field label="Miktar">
            <Input type="number" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Button variant="accent" onClick={add}>
            <Plus size={14} /> Ekle
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>{formatDate(date)} — Gerçekleşmeler</CardTitle>
        {entriesOnDate.length === 0 ? (
          <p className="text-sm text-text3">Bu tarih için kayıt yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="text-[10px] uppercase tracking-wider font-display text-text3 py-2">
                    Kod / İş
                  </th>
                  <th className="text-[10px] uppercase tracking-wider font-display text-text3 text-right py-2">
                    Bugün Yapılan
                  </th>
                  <th className="text-[10px] uppercase tracking-wider font-display text-text3 text-right py-2">
                    Kümülatif / Hedef
                  </th>
                  <th className="text-[10px] uppercase tracking-wider font-display text-text3 text-right py-2">
                    %
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entriesOnDate.map((e) => (
                  <tr key={e.code} className="border-t border-border hover:bg-bg3/40">
                    <td className="py-2">
                      <span className="font-mono text-xs text-text3">{e.code}</span>{" "}
                      <span className="text-text">{e.name}</span>
                    </td>
                    <td className="py-2 text-right font-mono text-realized">
                      {formatNumber(e.qty, 2)} {e.unit}
                    </td>
                    <td className="py-2 text-right font-mono text-xs text-text2">
                      {formatNumber(e.cumReal, 2)} / {formatNumber(e.quantity, 2)}
                    </td>
                    <td className="py-2 text-right font-mono text-xs text-realized">
                      {e.quantity > 0 ? formatPct(e.cumReal / e.quantity, 0) : "—"}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => setRealized(project.id, e.code, date, 0)}
                        className="p-1 text-text3 hover:text-red rounded"
                      >
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

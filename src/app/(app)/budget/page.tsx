"use client";

import { useMemo, useState } from "react";
import { Wallet, Plus, Pencil, Trash2 } from "lucide-react";
import { useStore, useCurrentProject, useCurrentUser, useProjectWbs, useProjectRealized } from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle, KpiCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { TableWrap, Table, THead, TBody, TR, TH, TD, Empty } from "@/components/ui/table";
import { formatMoney, formatPct, cpiLevel } from "@/lib/utils";
import { computeProgress } from "@/lib/calc/progress";
import type { BudgetCategory } from "@/lib/store/types";
import type { Currency } from "@/lib/utils";

export default function BudgetPage() {
  const project = useCurrentProject();
  const user = useCurrentUser();
  const wbs = useProjectWbs(project?.id);
  const realized = useProjectRealized(project?.id);
  const planned = useStore((s) => (project ? s.planned[project.id] || {} : {}));
  const categories = useStore((s) => s.budgetCategories).filter((c) => c.projectId === project?.id);
  const actuals = useStore((s) => s.budgetActuals).filter((a) => a.projectId === project?.id);
  const addCategory = useStore((s) => s.addBudgetCategory);
  const updateCategory = useStore((s) => s.updateBudgetCategory);
  const deleteCategory = useStore((s) => s.deleteBudgetCategory);
  const addActual = useStore((s) => s.addBudgetActual);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BudgetCategory | null>(null);
  const [actualOpen, setActualOpen] = useState<string | null>(null);

  const items = wbs.map((w) => ({
    code: w.code,
    isLeaf: w.isLeaf,
    quantity: w.quantity,
    weight: w.weight,
  }));
  const { realPct } = useMemo(
    () => computeProgress(items, planned, realized, project?.reportDate || ""),
    [items, planned, realized, project?.reportDate]
  );

  // CPI hesabı (basitleştirilmiş — EV = realPct * BAC, AC = toplam actual)
  const totalPlannedBudget = useMemo(
    () =>
      categories.reduce(
        (s, c) => s + c.plannedAmount * (c.currency === "TRY" ? 1 : c.currency === "USD" ? 33 : 36),
        0
      ),
    [categories]
  );
  const totalActual = useMemo(
    () =>
      actuals.reduce(
        (s, a) => s + (a.amountInProjectCurrency ?? a.amount * (a.currency === "TRY" ? 1 : a.currency === "USD" ? 33 : 36)),
        0
      ),
    [actuals]
  );
  const ev = realPct * totalPlannedBudget;
  const cpi = totalActual > 0 ? ev / totalActual : null;
  const eac = cpi && cpi > 0 ? totalActual + (totalPlannedBudget - ev) / cpi : null;
  const cpiL = cpiLevel(cpi);

  function actualsByCategory(catId: string) {
    return actuals.filter((a) => a.categoryId === catId).reduce((s, a) => s + a.amount, 0);
  }

  if (!project)
    return (
      <Card>
        <CardTitle>Proje Yok</CardTitle>
      </Card>
    );

  return (
    <>
      <PageHeader
        title="Bütçe & CPI"
        description="Finansal sağlık ve maliyet performans takibi"
        icon={Wallet}
        actions={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus size={14} /> Yeni Kategori
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Toplam Bütçe (BAC)"
          value={formatMoney(totalPlannedBudget, "TRY", 0)}
        />
        <KpiCard label="Earned Value (EV)" value={formatMoney(ev, "TRY", 0)} valueClassName="text-blue" />
        <KpiCard label="Gerçekleşen Maliyet (AC)" value={formatMoney(totalActual, "TRY", 0)} valueClassName="text-yellow" />
        <KpiCard
          label="CPI"
          value={cpi == null ? "—" : cpi.toFixed(3)}
          sub={
            cpiL === "good"
              ? "İyi (>= 1.0)"
              : cpiL === "warn"
              ? "Uyarı (0.9 — 1.0)"
              : cpiL === "bad"
              ? "Kritik (< 0.9)"
              : "Veri yok"
          }
          valueClassName={
            cpiL === "good" ? "text-green" : cpiL === "warn" ? "text-yellow" : cpiL === "bad" ? "text-red" : ""
          }
        />
      </div>

      {eac && (
        <Card className="mb-4 !p-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <span className="text-text3 uppercase font-display text-[10px] tracking-wider">
              Tahmini Final Maliyet (EAC):
            </span>
            <span className="font-mono text-lg font-bold text-accent">{formatMoney(eac, "TRY", 0)}</span>
            <span className="text-text3 text-xs">
              ≈ {eac > totalPlannedBudget ? "+" : ""}
              {formatPct((eac - totalPlannedBudget) / totalPlannedBudget, 1)} vs BAC
            </span>
          </div>
        </Card>
      )}

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>Kategori</TH>
              <TH className="text-right">Planlanan</TH>
              <TH className="text-right">Gerçekleşen</TH>
              <TH className="text-right">Sapma</TH>
              <TH className="text-right">Kalan</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {categories.length === 0 ? (
              <Empty colSpan={6}>Henüz bütçe kategorisi yok.</Empty>
            ) : (
              categories.map((c) => {
                const ac = actualsByCategory(c.id);
                const variance = ac - c.plannedAmount;
                const variancePct = c.plannedAmount > 0 ? variance / c.plannedAmount : 0;
                return (
                  <TR key={c.id}>
                    <TD className="font-medium">{c.name}</TD>
                    <TD className="text-right font-mono">{formatMoney(c.plannedAmount, c.currency)}</TD>
                    <TD className="text-right font-mono">{formatMoney(ac, c.currency)}</TD>
                    <TD className={`text-right font-mono text-xs ${variance > 0 ? "text-red" : "text-green"}`}>
                      {variance > 0 ? "+" : ""}
                      {formatMoney(variance, c.currency)} ({formatPct(variancePct, 1)})
                    </TD>
                    <TD className="text-right font-mono text-xs">
                      {formatMoney(c.plannedAmount - ac, c.currency)}
                    </TD>
                    <TD>
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setActualOpen(c.id)}>
                          <Plus size={11} /> Gerçek
                        </Button>
                        <button onClick={() => setEditing(c)} className="p-1 text-text3 hover:text-accent rounded">
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Kategori silinsin mi?")) deleteCategory(c.id);
                          }}
                          className="p-1 text-text3 hover:text-red rounded"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      </TableWrap>

      <CategoryForm
        open={creating}
        onClose={() => setCreating(false)}
        sortOrder={categories.length}
        onSubmit={(data) => {
          addCategory({ ...data, projectId: project.id });
          setCreating(false);
        }}
      />
      <CategoryForm
        open={!!editing}
        initial={editing || undefined}
        sortOrder={editing?.sortOrder ?? 0}
        onClose={() => setEditing(null)}
        onSubmit={(data) => {
          if (!editing) return;
          updateCategory(editing.id, data);
          setEditing(null);
        }}
      />

      <ActualDialog
        open={!!actualOpen}
        categoryId={actualOpen || ""}
        onClose={() => setActualOpen(null)}
        onSubmit={(data) => {
          if (!user) return;
          addActual({ ...data, projectId: project.id, recordedBy: user.id });
          setActualOpen(null);
        }}
      />
    </>
  );
}

function CategoryForm({
  open,
  initial,
  sortOrder,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial?: BudgetCategory;
  sortOrder: number;
  onClose: () => void;
  onSubmit: (data: Omit<BudgetCategory, "id" | "projectId">) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [plannedAmount, setPlannedAmount] = useState(initial?.plannedAmount ?? 0);
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "TRY");

  return (
    <Dialog open={open} onClose={onClose} title={initial ? "Kategori Düzenle" : "Yeni Bütçe Kategorisi"} size="sm">
      <div className="space-y-3">
        <Field label="Kategori Adı">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Solar Panel, İşçilik..." />
        </Field>
        <Field label="Planlanan Tutar">
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              className="flex-1"
              value={plannedAmount}
              onChange={(e) => setPlannedAmount(Number(e.target.value) || 0)}
            />
            <Select className="w-24" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </Select>
          </div>
        </Field>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>İptal</Button>
        <Button
          variant="accent"
          onClick={() => onSubmit({ name, plannedAmount, currency, sortOrder })}
        >
          Kaydet
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function ActualDialog({
  open,
  categoryId,
  onClose,
  onSubmit,
}: {
  open: boolean;
  categoryId: string;
  onClose: () => void;
  onSubmit: (data: { categoryId: string; date: string; amount: number; currency: Currency; description?: string; invoiceRef?: string }) => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<Currency>("TRY");
  const [description, setDescription] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");

  return (
    <Dialog open={open} onClose={onClose} title="Gerçekleşen Maliyet Ekle" size="sm">
      <div className="space-y-3">
        <Field label="Tarih">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Tutar">
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              className="flex-1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
            />
            <Select className="w-24" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </Select>
          </div>
        </Field>
        <Field label="Açıklama">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </Field>
        <Field label="Fatura Ref.">
          <Input value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>İptal</Button>
        <Button
          variant="accent"
          onClick={() =>
            onSubmit({
              categoryId,
              date,
              amount,
              currency,
              description: description || undefined,
              invoiceRef: invoiceRef || undefined,
            })
          }
        >
          Ekle
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  ShoppingCart,
  Plus,
  Pencil,
  Trash2,
  Star,
  CheckCircle2,
  Truck,
  Package,
  CalendarClock,
} from "lucide-react";
import { useStore, useCurrentProject } from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatMoney, formatNumber, cn, toISODate } from "@/lib/utils";
import type { ProcurementItem } from "@/lib/store/types";
import type { Currency } from "@/lib/utils";

const STATUS_LABELS: Record<ProcurementItem["status"], string> = {
  talep: "Talep",
  siparis: "Sipariş",
  yolda: "Yolda",
  teslim: "Teslim",
  iade: "İade",
};

const STATUS_VARIANT: Record<ProcurementItem["status"], "gray" | "yellow" | "blue" | "green" | "red"> = {
  talep: "gray",
  siparis: "yellow",
  yolda: "blue",
  teslim: "green",
  iade: "red",
};

export default function ProcurementPage() {
  const project = useCurrentProject();
  const items = useStore((s) => s.procurement).filter((p) => p.projectId === project?.id);
  const add = useStore((s) => s.addProcurement);
  const update = useStore((s) => s.updateProcurement);
  const del = useStore((s) => s.deleteProcurement);
  const toast = useToast((s) => s.push);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProcurementItem | null>(null);
  const [actualizing, setActualizing] = useState<ProcurementItem | null>(null);
  const [filterCritical, setFilterCritical] = useState(false);

  const filtered = useMemo(
    () => filterCritical ? items.filter((p) => p.isCritical) : items,
    [items, filterCritical]
  );

  const totalsByCurrency = useMemo(() => {
    const planned: Record<Currency, number> = { TRY: 0, USD: 0, EUR: 0 };
    const actual: Record<Currency, number> = { TRY: 0, USD: 0, EUR: 0 };
    for (const it of items) {
      planned[it.currency] += it.quantity * it.unitPrice;
      if (it.actualQuantity != null && it.actualUnitPrice != null) {
        const ac = it.actualCurrency ?? it.currency;
        actual[ac] += it.actualQuantity * it.actualUnitPrice;
      }
    }
    return { planned, actual };
  }, [items]);

  const criticalCount = items.filter((p) => p.isCritical).length;

  if (!project) {
    return (
      <Card>
        <CardTitle>Proje Yok</CardTitle>
      </Card>
    );
  }

  function toggleCritical(it: ProcurementItem) {
    update(it.id, { isCritical: !it.isCritical });
    toast(
      it.isCritical
        ? `${it.material} — kritik bayrağı kaldırıldı`
        : `${it.material} — kritik işaretlendi · Dashboard'da sürekli görünür`,
      "info"
    );
  }

  return (
    <>
      <PageHeader
        title="Satın Alma"
        description={`${items.length} kayıt · ${criticalCount} kritik malzeme`}
        icon={ShoppingCart}
        actions={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus size={14} /> Yeni Kayıt
          </Button>
        }
      />

      {/* Toplam kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {(["TRY", "USD", "EUR"] as Currency[]).map((c) => (
          <Card key={c} className="!p-4">
            <div className="text-[10px] text-text3 uppercase font-bold tracking-wider mb-1">
              Toplam {c}
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-mono text-xl font-bold text-text tabular-nums">
                {formatMoney(totalsByCurrency.planned[c], c, 0)}
              </div>
              <div className="text-[11px] text-text3 text-right">
                <div>planlanan</div>
                <div className="font-mono font-semibold text-green">
                  {formatMoney(totalsByCurrency.actual[c], c, 0)} <span className="text-text3 font-normal">gerç.</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Kritik filtre */}
      <div className="flex items-center gap-2 mb-3">
        <Button
          variant={filterCritical ? "soft" : "outline"}
          size="sm"
          onClick={() => setFilterCritical(!filterCritical)}
        >
          <Star size={14} className={filterCritical ? "fill-yellow text-yellow" : ""} />
          {filterCritical ? "Sadece Kritikler" : "Tümü Göster"} ({criticalCount} kritik)
        </Button>
      </div>

      {/* Tablo */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="bg-bg2 px-2 py-2.5 border-b border-border w-8"></th>
                <th className="bg-bg2 px-3 py-2.5 text-left text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap min-w-[14rem]">
                  Malzeme / Kategori
                </th>
                <th className="bg-bg2 px-3 py-2.5 text-left text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  Tedarikçi
                </th>
                <th className="bg-bg2 px-3 py-2.5 text-center text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  Plan
                </th>
                <th className="bg-bg2 px-3 py-2.5 text-right text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap min-w-[10rem]">
                  Miktar × Fiyat
                </th>
                <th className="bg-bg2 px-3 py-2.5 text-right text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  Toplam
                </th>
                <th className="bg-bg2 px-3 py-2.5 text-center text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  RFQ
                </th>
                <th className="bg-bg2 px-3 py-2.5 text-center text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  PO
                </th>
                <th className="bg-bg2 px-3 py-2.5 text-center text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  EXW
                </th>
                <th className="bg-bg2 px-3 py-2.5 text-center text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border whitespace-nowrap">
                  Teslim
                </th>
                <th className="bg-bg2 px-3 py-2.5 text-center text-[10px] uppercase tracking-wider font-bold text-text2 border-b border-border">
                  Durum
                </th>
                <th className="bg-bg2 px-3 py-2.5 border-b border-border w-32"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-3 py-10 text-center text-text3 text-sm">
                    {filterCritical ? "Kritik işaretli malzeme yok." : "Henüz kayıt yok."}
                  </td>
                </tr>
              ) : (
                filtered.map((it) => (
                  <ProcRow
                    key={it.id}
                    item={it}
                    onEdit={() => setEditing(it)}
                    onActualize={() => setActualizing(it)}
                    onDelete={() => {
                      if (confirm(`"${it.material}" silinsin mi?`)) del(it.id);
                    }}
                    onToggleCritical={() => toggleCritical(it)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ProcForm
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(data) => {
          add({ ...data, projectId: project.id });
          setCreating(false);
          toast(`${data.material} eklendi`, "success");
        }}
      />
      <ProcForm
        open={!!editing}
        initial={editing || undefined}
        onClose={() => setEditing(null)}
        onSubmit={(data) => {
          if (!editing) return;
          update(editing.id, data);
          setEditing(null);
          toast(`${data.material} güncellendi`, "success");
        }}
      />
      <ActualizeDialog
        open={!!actualizing}
        item={actualizing}
        onClose={() => setActualizing(null)}
        onSubmit={(actuals) => {
          if (!actualizing) return;
          update(actualizing.id, actuals);
          setActualizing(null);
          toast(`${actualizing.material} — gerçekleşme kaydedildi`, "success");
        }}
      />
    </>
  );
}

/* ============================================================ */
/* Satır component (planlanan üst / gerçekleşen alt) */
/* ============================================================ */
function ProcRow({
  item,
  onEdit,
  onActualize,
  onDelete,
  onToggleCritical,
}: {
  item: ProcurementItem;
  onEdit: () => void;
  onActualize: () => void;
  onDelete: () => void;
  onToggleCritical: () => void;
}) {
  // Legacy fallback
  const plannedPo = item.plannedPoDate ?? item.orderDate;
  const plannedExw = item.plannedExwDate;
  const plannedDelivery = item.plannedDeliveryDate ?? item.expectedDate;
  const actualPo = item.actualPoDate;
  const actualExw = item.actualExwDate;
  const actualDelivery = item.actualDeliveredDate ?? item.deliveredDate;

  const hasActual =
    item.actualQuantity != null ||
    item.actualUnitPrice != null ||
    actualPo ||
    actualExw ||
    actualDelivery;

  const plannedTotal = item.quantity * item.unitPrice;
  const actualTotal =
    item.actualQuantity != null && item.actualUnitPrice != null
      ? item.actualQuantity * item.actualUnitPrice
      : null;
  const diff = actualTotal != null ? actualTotal - plannedTotal : null;

  return (
    <>
      {/* PLANNED ROW */}
      <tr className={cn("hover:bg-bg2/30", item.isCritical && "bg-yellow/5")}>
        <td className="px-2 py-2 border-b border-border/50 align-middle" rowSpan={hasActual ? 2 : 1}>
          <button
            onClick={onToggleCritical}
            className={cn(
              "p-1 rounded-md transition-colors",
              item.isCritical
                ? "text-yellow hover:bg-yellow/10"
                : "text-text3 hover:text-yellow hover:bg-yellow/5"
            )}
            title={item.isCritical ? "Kritik bayrağını kaldır" : "Kritik işaretle"}
          >
            <Star size={16} className={item.isCritical ? "fill-yellow" : ""} />
          </button>
        </td>
        <td className="px-3 py-2 border-b border-border/50 align-middle" rowSpan={hasActual ? 2 : 1}>
          <div className="text-xs text-text3 uppercase tracking-wider font-bold mb-0.5">
            {item.category}
          </div>
          <div className="font-medium text-sm">{item.material}</div>
        </td>
        <td className="px-3 py-2 border-b border-border/50 text-sm text-text2 align-middle" rowSpan={hasActual ? 2 : 1}>
          {item.supplier || "—"}
        </td>
        <td className="px-2 py-2 border-b border-border/50">
          <Badge variant="blue" className="!text-[9px]">PLAN</Badge>
        </td>
        <td className="px-3 py-2 border-b border-border/50 text-right font-mono text-xs tabular-nums">
          {formatNumber(item.quantity, 0)} {item.unit} ×{" "}
          <span className="font-semibold">{formatMoney(item.unitPrice, item.currency)}</span>
        </td>
        <td className="px-3 py-2 border-b border-border/50 text-right font-mono font-bold text-planned tabular-nums">
          {formatMoney(plannedTotal, item.currency, 0)}
        </td>
        <DateCell planned={item.rfqEndDate} actual={undefined} hideActual />
        <DateCell planned={plannedPo} actual={actualPo} hideActual />
        <DateCell planned={plannedExw} actual={actualExw} hideActual />
        <DateCell planned={plannedDelivery} actual={actualDelivery} hideActual />
        <td className="px-3 py-2 border-b border-border/50 text-center align-middle" rowSpan={hasActual ? 2 : 1}>
          <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABELS[item.status]}</Badge>
        </td>
        <td className="px-3 py-2 border-b border-border/50 align-middle" rowSpan={hasActual ? 2 : 1}>
          <div className="flex gap-0.5 justify-end">
            <button
              onClick={onActualize}
              className="p-1.5 rounded text-text3 hover:text-green hover:bg-green/10"
              title="Gerçekleşme Kaydet"
            >
              <CheckCircle2 size={14} />
            </button>
            <button
              onClick={onEdit}
              className="p-1.5 rounded text-text3 hover:text-accent hover:bg-accent/10"
              title="Düzenle"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded text-text3 hover:text-red hover:bg-red/10"
              title="Sil"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </td>
      </tr>

      {/* ACTUAL ROW (sadece veri varsa) */}
      {hasActual && (
        <tr className={cn("border-b-2 border-border bg-green/3", item.isCritical && "bg-green/3")}>
          <td className="px-2 py-2 border-b-2 border-border">
            <Badge variant="green" className="!text-[9px]">GERÇ.</Badge>
          </td>
          <td className="px-3 py-2 border-b-2 border-border text-right font-mono text-xs tabular-nums">
            {item.actualQuantity != null ? (
              <>
                {formatNumber(item.actualQuantity, 0)} {item.unit} ×{" "}
                <span className="font-semibold">
                  {formatMoney(item.actualUnitPrice ?? 0, item.actualCurrency ?? item.currency)}
                </span>
              </>
            ) : (
              <span className="text-text3 italic">miktar/fiyat bekleniyor</span>
            )}
          </td>
          <td className="px-3 py-2 border-b-2 border-border text-right font-mono tabular-nums">
            {actualTotal != null ? (
              <>
                <span className="font-bold text-realized">
                  {formatMoney(actualTotal, item.actualCurrency ?? item.currency, 0)}
                </span>
                {diff != null && Math.abs(diff) > 0.5 && (
                  <div className={cn("text-[10px] font-mono", diff > 0 ? "text-red" : "text-green")}>
                    {diff > 0 ? "+" : ""}{formatMoney(diff, item.actualCurrency ?? item.currency, 0)}
                  </div>
                )}
              </>
            ) : (
              <span className="text-text3 italic">—</span>
            )}
          </td>
          <DateCell planned={undefined} actual={undefined} hideAll />
          <DateCell planned={undefined} actual={actualPo} variant="actual" plannedRef={plannedPo} />
          <DateCell planned={undefined} actual={actualExw} variant="actual" plannedRef={plannedExw} />
          <DateCell planned={undefined} actual={actualDelivery} variant="actual" plannedRef={plannedDelivery} />
        </tr>
      )}
    </>
  );
}

function DateCell({
  planned,
  actual,
  hideActual = false,
  hideAll = false,
  variant = "planned",
  plannedRef,
}: {
  planned?: string;
  actual?: string;
  hideActual?: boolean;
  hideAll?: boolean;
  variant?: "planned" | "actual";
  plannedRef?: string;
}) {
  if (hideAll) {
    return <td className="px-2 py-2 border-b border-border/50 text-center"></td>;
  }
  if (variant === "planned") {
    return (
      <td className="px-2 py-2 border-b border-border/50 text-center">
        {planned ? (
          <span className="text-[11px] font-mono text-planned tabular-nums">
            {formatDate(planned)}
          </span>
        ) : (
          <span className="text-text3 text-xs">—</span>
        )}
      </td>
    );
  }
  // actual
  const delayDays = plannedRef && actual ? Math.ceil((new Date(actual).getTime() - new Date(plannedRef).getTime()) / 86400000) : null;
  return (
    <td className="px-2 py-2 border-b-2 border-border text-center">
      {actual ? (
        <>
          <span className="text-[11px] font-mono text-realized font-semibold tabular-nums">
            {formatDate(actual)}
          </span>
          {delayDays != null && delayDays !== 0 && (
            <div className={cn("text-[9px] font-mono tabular-nums", delayDays > 0 ? "text-red" : "text-green")}>
              {delayDays > 0 ? `+${delayDays}g` : `${delayDays}g`}
            </div>
          )}
        </>
      ) : (
        <span className="text-text3 text-xs italic">bekleniyor</span>
      )}
    </td>
  );
}

/* ============================================================ */
/* Yeni / Düzenle dialog */
/* ============================================================ */
function ProcForm({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial?: ProcurementItem;
  onClose: () => void;
  onSubmit: (data: Omit<ProcurementItem, "id" | "projectId">) => void;
}) {
  const [category, setCategory] = useState(initial?.category ?? "");
  const [material, setMaterial] = useState(initial?.material ?? "");
  const [supplier, setSupplier] = useState(initial?.supplier ?? "");
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
  const [unit, setUnit] = useState(initial?.unit ?? "adet");
  const [unitPrice, setUnitPrice] = useState(initial?.unitPrice ?? 0);
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "USD");
  const [status, setStatus] = useState<ProcurementItem["status"]>(initial?.status ?? "talep");
  const [isCritical, setIsCritical] = useState(initial?.isCritical ?? false);
  const [rfqStartDate, setRfqStartDate] = useState(initial?.rfqStartDate ?? "");
  const [rfqEndDate, setRfqEndDate] = useState(initial?.rfqEndDate ?? "");
  const [plannedPoDate, setPlannedPoDate] = useState(initial?.plannedPoDate ?? initial?.orderDate ?? "");
  const [plannedExwDate, setPlannedExwDate] = useState(initial?.plannedExwDate ?? "");
  const [plannedDeliveryDate, setPlannedDeliveryDate] = useState(initial?.plannedDeliveryDate ?? initial?.expectedDate ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const planTotal = quantity * unitPrice;

  return (
    <Dialog open={open} onClose={onClose} title={initial ? "Satın Alma Düzenle" : "Yeni Satın Alma Kaydı"} size="lg">
      <div className="space-y-4">
        {/* Temel bilgi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Kategori">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Solar Panel, Trafo, Kablo..." />
          </Field>
          <Field label="Malzeme">
            <Input value={material} onChange={(e) => setMaterial(e.target.value)} />
          </Field>
          <Field label="Tedarikçi" className="sm:col-span-2">
            <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </Field>
          <Field label="Miktar">
            <div className="flex gap-2">
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                className="flex-1"
              />
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} className="w-20" placeholder="adet" />
            </div>
          </Field>
          <Field label="Birim Fiyat">
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                className="flex-1"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
              />
              <Select className="w-24" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </Select>
            </div>
          </Field>
          <Field label="Durum">
            <Select value={status} onChange={(e) => setStatus(e.target.value as ProcurementItem["status"])}>
              <option value="talep">Talep</option>
              <option value="siparis">Sipariş</option>
              <option value="yolda">Yolda</option>
              <option value="teslim">Teslim</option>
              <option value="iade">İade</option>
            </Select>
          </Field>
          <Field label="Toplam Tutar (planlanan)">
            <div className="h-10 flex items-center px-3 rounded-lg bg-bg2 border border-border font-mono font-bold text-planned tabular-nums">
              {formatMoney(planTotal, currency, 0)}
            </div>
          </Field>
        </div>

        <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-yellow/30 bg-yellow/5">
          <input
            type="checkbox"
            checked={isCritical}
            onChange={(e) => setIsCritical(e.target.checked)}
            className="w-4 h-4 accent-yellow"
          />
          <Star size={14} className={isCritical ? "fill-yellow text-yellow" : "text-text3"} />
          <span className="text-sm font-semibold text-text">Kritik Malzeme</span>
          <span className="text-xs text-text3">
            (Dashboard procurement follow-up&apos;ta sürekli görünür)
          </span>
        </label>

        {/* Planlanan tarihler */}
        <div className="rounded-xl border border-planned/30 bg-blue/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={14} className="text-planned" />
            <span className="text-sm font-bold text-planned uppercase tracking-wider">
              Planlanan Tarihler
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="RFQ Başlangıç">
              <Input type="date" value={rfqStartDate} onChange={(e) => setRfqStartDate(e.target.value)} />
            </Field>
            <Field label="RFQ Bitiş">
              <Input type="date" value={rfqEndDate} onChange={(e) => setRfqEndDate(e.target.value)} />
            </Field>
            <Field label="PO Tarihi">
              <Input type="date" value={plannedPoDate} onChange={(e) => setPlannedPoDate(e.target.value)} />
            </Field>
            <Field label="EXW Tarihi" hint="Fabrika çıkış / hazır">
              <Input type="date" value={plannedExwDate} onChange={(e) => setPlannedExwDate(e.target.value)} />
            </Field>
            <Field label="Teslimat Tarihi" hint="Sahaya geliş">
              <Input type="date" value={plannedDeliveryDate} onChange={(e) => setPlannedDeliveryDate(e.target.value)} />
            </Field>
          </div>
        </div>

        <Field label="Notlar">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>İptal</Button>
        <Button
          variant="accent"
          onClick={() =>
            onSubmit({
              category,
              material,
              supplier: supplier || undefined,
              quantity,
              unit,
              unitPrice,
              currency,
              status,
              isCritical,
              rfqStartDate: rfqStartDate || undefined,
              rfqEndDate: rfqEndDate || undefined,
              plannedPoDate: plannedPoDate || undefined,
              plannedExwDate: plannedExwDate || undefined,
              plannedDeliveryDate: plannedDeliveryDate || undefined,
              notes: notes || undefined,
              // Gerçekleşen alanlar mevcut değerleri korusun (edit ediliyorsa)
              actualPoDate: initial?.actualPoDate,
              actualExwDate: initial?.actualExwDate,
              actualDeliveredDate: initial?.actualDeliveredDate,
              actualQuantity: initial?.actualQuantity,
              actualUnitPrice: initial?.actualUnitPrice,
              actualCurrency: initial?.actualCurrency,
              actualNotes: initial?.actualNotes,
            })
          }
        >
          Kaydet
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/* ============================================================ */
/* Gerçekleşme Kaydet dialog */
/* ============================================================ */
function ActualizeDialog({
  open,
  item,
  onClose,
  onSubmit,
}: {
  open: boolean;
  item: ProcurementItem | null;
  onClose: () => void;
  onSubmit: (data: Partial<ProcurementItem>) => void;
}) {
  const [actualPoDate, setActualPoDate] = useState("");
  const [actualExwDate, setActualExwDate] = useState("");
  const [actualDeliveredDate, setActualDeliveredDate] = useState("");
  const [actualQuantity, setActualQuantity] = useState<string>("");
  const [actualUnitPrice, setActualUnitPrice] = useState<string>("");
  const [actualCurrency, setActualCurrency] = useState<Currency>("USD");
  const [actualNotes, setActualNotes] = useState("");
  const [newStatus, setNewStatus] = useState<ProcurementItem["status"]>("teslim");

  // Item değişince state'i doldur
  useMemo(() => {
    if (item) {
      setActualPoDate(item.actualPoDate ?? "");
      setActualExwDate(item.actualExwDate ?? "");
      setActualDeliveredDate(item.actualDeliveredDate ?? item.deliveredDate ?? "");
      setActualQuantity(item.actualQuantity != null ? String(item.actualQuantity) : String(item.quantity));
      setActualUnitPrice(item.actualUnitPrice != null ? String(item.actualUnitPrice) : String(item.unitPrice));
      setActualCurrency(item.actualCurrency ?? item.currency);
      setActualNotes(item.actualNotes ?? "");
      setNewStatus(item.status);
    }
  }, [item]);

  if (!item) return null;

  const plannedTotal = item.quantity * item.unitPrice;
  const actualTotal = (Number(actualQuantity) || 0) * (Number(actualUnitPrice) || 0);
  const diff = actualTotal - plannedTotal;

  return (
    <Dialog open={open} onClose={onClose} title={`Gerçekleşme Kaydı — ${item.material}`} size="lg">
      <div className="space-y-4">
        <Alert variant="info">
          Bu satınalma için gerçekleşen tarihleri, miktarı ve gerçek bütçeyi gir.
          Planlanan değerler korunur; tabloda alt alta karşılaştırma görünür.
        </Alert>

        {/* Gerçek tarihler */}
        <div className="rounded-xl border border-realized/30 bg-green/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck size={14} className="text-realized" />
            <span className="text-sm font-bold text-realized uppercase tracking-wider">
              Gerçekleşen Tarihler
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field
              label="PO Tarihi"
              hint={item.plannedPoDate ? `Plan: ${formatDate(item.plannedPoDate)}` : undefined}
            >
              <Input type="date" value={actualPoDate} onChange={(e) => setActualPoDate(e.target.value)} />
            </Field>
            <Field
              label="EXW Tarihi"
              hint={item.plannedExwDate ? `Plan: ${formatDate(item.plannedExwDate)}` : undefined}
            >
              <Input type="date" value={actualExwDate} onChange={(e) => setActualExwDate(e.target.value)} />
            </Field>
            <Field
              label="Teslim Tarihi"
              hint={item.plannedDeliveryDate ? `Plan: ${formatDate(item.plannedDeliveryDate)}` : undefined}
            >
              <Input type="date" value={actualDeliveredDate} onChange={(e) => setActualDeliveredDate(e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Gerçek miktar + bütçe */}
        <div className="rounded-xl border border-realized/30 bg-green/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package size={14} className="text-realized" />
            <span className="text-sm font-bold text-realized uppercase tracking-wider">
              Gerçekleşen Miktar & Bütçe
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Gerçek Miktar" hint={`Plan: ${formatNumber(item.quantity, 0)} ${item.unit}`}>
              <Input type="number" value={actualQuantity} onChange={(e) => setActualQuantity(e.target.value)} />
            </Field>
            <Field label="Gerçek Birim Fiyat" hint={`Plan: ${formatMoney(item.unitPrice, item.currency)}`}>
              <Input
                type="number"
                step="0.01"
                value={actualUnitPrice}
                onChange={(e) => setActualUnitPrice(e.target.value)}
              />
            </Field>
            <Field label="Para Birimi">
              <Select value={actualCurrency} onChange={(e) => setActualCurrency(e.target.value as Currency)}>
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </Select>
            </Field>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="px-3 py-2 rounded-lg bg-white border border-border">
              <div className="text-[10px] uppercase tracking-wider font-bold text-text3">Plan Tutar</div>
              <div className="font-mono font-bold text-planned tabular-nums">
                {formatMoney(plannedTotal, item.currency, 0)}
              </div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white border border-border">
              <div className="text-[10px] uppercase tracking-wider font-bold text-text3">Gerçek Tutar</div>
              <div className="font-mono font-bold text-realized tabular-nums">
                {formatMoney(actualTotal, actualCurrency, 0)}
              </div>
            </div>
            <div className={cn("px-3 py-2 rounded-lg bg-white border", diff > 0 ? "border-red/30" : "border-green/30")}>
              <div className="text-[10px] uppercase tracking-wider font-bold text-text3">Fark</div>
              <div className={cn("font-mono font-bold tabular-nums", diff > 0 ? "text-red" : "text-green")}>
                {diff > 0 ? "+" : ""}{formatMoney(diff, actualCurrency, 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Durum (güncelleyebilirsin)">
            <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value as ProcurementItem["status"])}>
              <option value="talep">Talep</option>
              <option value="siparis">Sipariş</option>
              <option value="yolda">Yolda</option>
              <option value="teslim">Teslim</option>
              <option value="iade">İade</option>
            </Select>
          </Field>
        </div>

        <Field label="Gerçekleşme Notu">
          <Textarea value={actualNotes} onChange={(e) => setActualNotes(e.target.value)} rows={2} />
        </Field>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>İptal</Button>
        <Button
          variant="accent"
          onClick={() => {
            onSubmit({
              actualPoDate: actualPoDate || undefined,
              actualExwDate: actualExwDate || undefined,
              actualDeliveredDate: actualDeliveredDate || undefined,
              actualQuantity: actualQuantity ? Number(actualQuantity) : undefined,
              actualUnitPrice: actualUnitPrice ? Number(actualUnitPrice) : undefined,
              actualCurrency: actualCurrency,
              actualNotes: actualNotes || undefined,
              status: newStatus,
            });
          }}
        >
          <CheckCircle2 size={14} /> Gerçekleşmeyi Kaydet
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

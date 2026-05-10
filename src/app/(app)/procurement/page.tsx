"use client";

import { useMemo, useState } from "react";
import { ShoppingCart, Plus, Pencil, Trash2 } from "lucide-react";
import { useStore, useCurrentProject } from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableWrap, Table, THead, TBody, TR, TH, TD, Empty } from "@/components/ui/table";
import { formatDate, formatMoney, formatNumber } from "@/lib/utils";
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

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProcurementItem | null>(null);

  const totalsByCurrency = useMemo(() => {
    const m: Record<Currency, number> = { TRY: 0, USD: 0, EUR: 0 };
    for (const it of items) {
      m[it.currency] += it.quantity * it.unitPrice;
    }
    return m;
  }, [items]);

  if (!project)
    return (
      <Card>
        <CardTitle>Proje Yok</CardTitle>
      </Card>
    );

  return (
    <>
      <PageHeader
        title="Satın Alma"
        description={`${items.length} kayıt`}
        icon={ShoppingCart}
        actions={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus size={14} /> Yeni Kayıt
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {(["TRY", "USD", "EUR"] as Currency[]).map((c) => (
          <Card key={c} className="!p-4">
            <div className="text-[10px] text-text3 uppercase font-display tracking-wider">
              Toplam {c}
            </div>
            <div className="font-mono text-xl font-bold mt-1">{formatMoney(totalsByCurrency[c], c)}</div>
          </Card>
        ))}
      </div>

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>Kategori</TH>
              <TH>Malzeme</TH>
              <TH>Tedarikçi</TH>
              <TH className="text-right">Miktar</TH>
              <TH className="text-right">Birim Fiyat</TH>
              <TH className="text-right">Toplam</TH>
              <TH>Durum</TH>
              <TH>Beklenen</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {items.length === 0 ? (
              <Empty colSpan={9}>Henüz kayıt yok.</Empty>
            ) : (
              items.map((it) => (
                <TR key={it.id}>
                  <TD className="text-xs">{it.category}</TD>
                  <TD className="font-medium">{it.material}</TD>
                  <TD className="text-xs text-text2">{it.supplier || "—"}</TD>
                  <TD className="text-right font-mono text-xs">
                    {formatNumber(it.quantity, 0)} {it.unit}
                  </TD>
                  <TD className="text-right font-mono text-xs">
                    {formatMoney(it.unitPrice, it.currency)}
                  </TD>
                  <TD className="text-right font-mono">
                    {formatMoney(it.quantity * it.unitPrice, it.currency)}
                  </TD>
                  <TD>
                    <Badge variant={STATUS_VARIANT[it.status]}>{STATUS_LABELS[it.status]}</Badge>
                  </TD>
                  <TD className="text-xs">{it.expectedDate ? formatDate(it.expectedDate) : "—"}</TD>
                  <TD>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setEditing(it)} className="p-1 text-text3 hover:text-accent rounded">
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Silinsin mi?")) del(it.id);
                        }}
                        className="p-1 text-text3 hover:text-red rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </TableWrap>

      <ProcForm
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(data) => {
          add({ ...data, projectId: project.id });
          setCreating(false);
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
        }}
      />
    </>
  );
}

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
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "TRY");
  const [status, setStatus] = useState<ProcurementItem["status"]>(initial?.status ?? "talep");
  const [orderDate, setOrderDate] = useState(initial?.orderDate ?? "");
  const [expectedDate, setExpectedDate] = useState(initial?.expectedDate ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <Dialog open={open} onClose={onClose} title={initial ? "Düzenle" : "Yeni Satın Alma"} size="md">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Kategori">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Solar Panel, Kablo..." />
        </Field>
        <Field label="Malzeme">
          <Input value={material} onChange={(e) => setMaterial(e.target.value)} />
        </Field>
        <Field label="Tedarikçi" className="sm:col-span-2">
          <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </Field>
        <Field label="Miktar">
          <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 0)} />
        </Field>
        <Field label="Birim">
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
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
        <Field label="Sipariş Tarihi">
          <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
        </Field>
        <Field label="Beklenen Tarih">
          <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
        </Field>
        <Field label="Notlar" className="sm:col-span-2">
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
              orderDate: orderDate || undefined,
              expectedDate: expectedDate || undefined,
              notes: notes || undefined,
            })
          }
        >
          Kaydet
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

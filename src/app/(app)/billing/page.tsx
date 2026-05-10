"use client";

import { useMemo, useState } from "react";
import { Receipt, Plus, Pencil, Trash2 } from "lucide-react";
import { useStore, useCurrentProject } from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableWrap, Table, THead, TBody, TR, TH, TD, Empty } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/utils";
import type { BillingItem } from "@/lib/store/types";
import type { Currency } from "@/lib/utils";

const STATUS_LABEL: Record<BillingItem["status"], string> = {
  taslak: "Taslak",
  gonderildi: "Gönderildi",
  odendi: "Ödendi",
  iptal: "İptal",
};

const STATUS_VARIANT: Record<BillingItem["status"], "gray" | "blue" | "green" | "red"> = {
  taslak: "gray",
  gonderildi: "blue",
  odendi: "green",
  iptal: "red",
};

export default function BillingPage() {
  const project = useCurrentProject();
  const items = useStore((s) => s.billing).filter((b) => b.projectId === project?.id);
  const add = useStore((s) => s.addBilling);
  const update = useStore((s) => s.updateBilling);
  const del = useStore((s) => s.deleteBilling);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BillingItem | null>(null);

  const totals = useMemo(() => {
    const m: Record<Currency, { issued: number; paid: number }> = {
      TRY: { issued: 0, paid: 0 },
      USD: { issued: 0, paid: 0 },
      EUR: { issued: 0, paid: 0 },
    };
    for (const it of items) {
      if (it.status === "iptal") continue;
      m[it.currency].issued += it.amount;
      if (it.status === "odendi") m[it.currency].paid += it.amount;
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
        title="Faturalandırma"
        icon={Receipt}
        description={`${items.length} fatura · Manuel hakediş`}
        actions={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus size={14} /> Yeni Fatura
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {(["TRY", "USD", "EUR"] as Currency[]).map((c) => (
          <Card key={c} className="!p-4">
            <div className="text-[10px] text-text3 uppercase font-display tracking-wider mb-1">
              {c} Bakiye
            </div>
            <div className="font-mono text-xl font-bold">{formatMoney(totals[c].paid, c)}</div>
            <div className="text-[11px] text-text3 mt-1">
              / {formatMoney(totals[c].issued, c)} kesilen
            </div>
          </Card>
        ))}
      </div>

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>Fatura No</TH>
              <TH>Açıklama</TH>
              <TH className="text-right">Tutar</TH>
              <TH>Düzenleme</TH>
              <TH>Vade</TH>
              <TH>Ödendi</TH>
              <TH>Durum</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {items.length === 0 ? (
              <Empty colSpan={8}>Henüz fatura yok.</Empty>
            ) : (
              items.map((it) => (
                <TR key={it.id}>
                  <TD className="font-mono text-xs">{it.invoiceNo || "—"}</TD>
                  <TD>{it.description}</TD>
                  <TD className="text-right font-mono">{formatMoney(it.amount, it.currency)}</TD>
                  <TD className="text-xs">{formatDate(it.issueDate)}</TD>
                  <TD className="text-xs">{it.dueDate ? formatDate(it.dueDate) : "—"}</TD>
                  <TD className="text-xs">{it.paidDate ? formatDate(it.paidDate) : "—"}</TD>
                  <TD>
                    <Badge variant={STATUS_VARIANT[it.status]}>{STATUS_LABEL[it.status]}</Badge>
                  </TD>
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

      <BillingForm
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(data) => {
          add({ ...data, projectId: project.id });
          setCreating(false);
        }}
      />
      <BillingForm
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

function BillingForm({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial?: BillingItem;
  onClose: () => void;
  onSubmit: (data: Omit<BillingItem, "id" | "projectId">) => void;
}) {
  const [invoiceNo, setInvoiceNo] = useState(initial?.invoiceNo ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "TRY");
  const [issueDate, setIssueDate] = useState(initial?.issueDate ?? new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [paidDate, setPaidDate] = useState(initial?.paidDate ?? "");
  const [status, setStatus] = useState<BillingItem["status"]>(initial?.status ?? "taslak");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <Dialog open={open} onClose={onClose} title={initial ? "Düzenle" : "Yeni Fatura"} size="md">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fatura No">
          <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
        </Field>
        <Field label="Durum">
          <Select value={status} onChange={(e) => setStatus(e.target.value as BillingItem["status"])}>
            <option value="taslak">Taslak</option>
            <option value="gonderildi">Gönderildi</option>
            <option value="odendi">Ödendi</option>
            <option value="iptal">İptal</option>
          </Select>
        </Field>
        <Field label="Açıklama" className="sm:col-span-2">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Hakediş No.1 - Şubat 2026" />
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
        <Field label="Düzenleme Tarihi">
          <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </Field>
        <Field label="Vade">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field label="Ödeme Tarihi">
          <Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
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
              invoiceNo: invoiceNo || undefined,
              description,
              amount,
              currency,
              issueDate,
              dueDate: dueDate || undefined,
              paidDate: paidDate || undefined,
              status,
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

"use client";

import { useMemo, useState } from "react";
import { Receipt, Plus, Pencil, Trash2, FileText, Building2, Users2 } from "lucide-react";
import { useStore, useCurrentProject } from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { TableWrap, Table, THead, TBody, TR, TH, TD, Empty } from "@/components/ui/table";
import { formatDate, formatMoney, cn } from "@/lib/utils";
import type { BillingItem, Subcontractor, BillingDirection, Discipline } from "@/lib/store/types";
import type { Currency } from "@/lib/utils";

type Tab = "owner" | "subcontracts" | "subcontractor-invoices";

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

const SC_STATUS_LABEL: Record<Subcontractor["status"], string> = {
  aktif: "Aktif",
  tamamlandi: "Tamamlandı",
  iptal: "İptal",
  askida: "Askıda",
};
const SC_STATUS_VARIANT: Record<Subcontractor["status"], "green" | "blue" | "red" | "yellow"> = {
  aktif: "green",
  tamamlandi: "blue",
  iptal: "red",
  askida: "yellow",
};

export default function BillingPage() {
  const project = useCurrentProject();
  const billing = useStore((s) => s.billing).filter((b) => b.projectId === project?.id);
  const subcontractors = useStore((s) => s.subcontractors).filter((s) => s.projectId === project?.id);

  const [tab, setTab] = useState<Tab>("owner");

  if (!project) {
    return (
      <Card>
        <CardTitle>Proje Yok</CardTitle>
      </Card>
    );
  }

  const ownerInvoices = billing.filter((b) => b.direction === "owner_incoming");
  const subInvoices = billing.filter((b) => b.direction === "subcontractor_outgoing");

  return (
    <>
      <PageHeader
        title="Faturalandırma"
        description="İşveren faturaları · Alt yüklenici sözleşme & fatura takibi"
        icon={Receipt}
      />

      <div className="flex gap-1 p-1 bg-bg2 border border-border rounded-xl mb-5 w-fit overflow-x-auto">
        <TabButton active={tab === "owner"} onClick={() => setTab("owner")} icon={<Building2 size={14} />}>
          İşveren Faturaları
          <CountPill>{ownerInvoices.length}</CountPill>
        </TabButton>
        <TabButton active={tab === "subcontracts"} onClick={() => setTab("subcontracts")} icon={<Users2 size={14} />}>
          Alt Yüklenici Sözleşmeleri
          <CountPill>{subcontractors.length}</CountPill>
        </TabButton>
        <TabButton active={tab === "subcontractor-invoices"} onClick={() => setTab("subcontractor-invoices")} icon={<FileText size={14} />}>
          Alt Yüklenici Faturaları
          <CountPill>{subInvoices.length}</CountPill>
        </TabButton>
      </div>

      {tab === "owner" && <OwnerInvoicesTab projectId={project.id} items={ownerInvoices} />}
      {tab === "subcontracts" && <SubcontractsTab projectId={project.id} items={subcontractors} />}
      {tab === "subcontractor-invoices" && (
        <SubInvoicesTab projectId={project.id} items={subInvoices} subcontractors={subcontractors} />
      )}
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
        active
          ? "bg-white text-text shadow-soft border border-border"
          : "text-text2 hover:text-text"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function CountPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-md bg-bg3 text-text2 text-[11px] font-bold tabular-nums">
      {children}
    </span>
  );
}

// ============================================================
// TAB 1: İşveren Faturaları
// ============================================================
function OwnerInvoicesTab({ projectId, items }: { projectId: string; items: BillingItem[] }) {
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

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {(["TRY", "USD", "EUR"] as Currency[]).map((c) => (
          <Card key={c} className="!p-4">
            <div className="text-[10px] text-text3 uppercase font-bold tracking-wider mb-1">
              {c} Tahsil Edilen
            </div>
            <div className="font-mono text-xl font-bold text-green tabular-nums">
              {formatMoney(totals[c].paid, c)}
            </div>
            <div className="text-[11px] text-text3 mt-1">
              / {formatMoney(totals[c].issued, c)} kesilen
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-text2">İşverene kestiğiniz hakediş & faturalar</p>
        <Button variant="accent" onClick={() => setCreating(true)}>
          <Plus size={14} /> Yeni Fatura
        </Button>
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
              <Empty colSpan={8}>Henüz işveren faturası yok.</Empty>
            ) : (
              items.map((it) => (
                <TR key={it.id}>
                  <TD className="font-mono text-xs text-text2">{it.invoiceNo || "—"}</TD>
                  <TD className="font-medium">{it.description}</TD>
                  <TD className="text-right font-mono font-semibold tabular-nums">
                    {formatMoney(it.amount, it.currency)}
                  </TD>
                  <TD className="text-xs text-text2">{formatDate(it.issueDate)}</TD>
                  <TD className="text-xs text-text2">{it.dueDate ? formatDate(it.dueDate) : "—"}</TD>
                  <TD className="text-xs text-text2">{it.paidDate ? formatDate(it.paidDate) : "—"}</TD>
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

      <InvoiceForm
        open={creating}
        title="Yeni İşveren Faturası"
        onClose={() => setCreating(false)}
        onSubmit={(data) => {
          add({ ...data, projectId, direction: "owner_incoming" });
          setCreating(false);
        }}
      />
      <InvoiceForm
        open={!!editing}
        title="İşveren Faturası — Düzenle"
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

// ============================================================
// TAB 2: Alt Yüklenici Sözleşmeleri
// ============================================================
function SubcontractsTab({
  projectId,
  items,
}: {
  projectId: string;
  items: Subcontractor[];
}) {
  const billing = useStore((s) => s.billing);
  const add = useStore((s) => s.addSubcontractor);
  const update = useStore((s) => s.updateSubcontractor);
  const del = useStore((s) => s.deleteSubcontractor);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Subcontractor | null>(null);

  const totals = useMemo(() => {
    const m: Record<Currency, { contract: number; invoiced: number; paid: number }> = {
      TRY: { contract: 0, invoiced: 0, paid: 0 },
      USD: { contract: 0, invoiced: 0, paid: 0 },
      EUR: { contract: 0, invoiced: 0, paid: 0 },
    };
    for (const s of items) {
      if (s.status === "iptal") continue;
      m[s.currency].contract += s.contractAmount;
    }
    for (const b of billing) {
      if (b.direction !== "subcontractor_outgoing") continue;
      if (b.projectId !== projectId) continue;
      if (b.status === "iptal") continue;
      m[b.currency].invoiced += b.amount;
      if (b.status === "odendi") m[b.currency].paid += b.amount;
    }
    return m;
  }, [items, billing, projectId]);

  function getProgress(scId: string, currency: Currency) {
    const sc = items.find((x) => x.id === scId);
    if (!sc) return { invoiced: 0, paid: 0, pct: 0 };
    const myBills = billing.filter(
      (b) =>
        b.direction === "subcontractor_outgoing" &&
        b.projectId === projectId &&
        b.subcontractorId === scId &&
        b.currency === currency &&
        b.status !== "iptal"
    );
    const invoiced = myBills.reduce((s, b) => s + b.amount, 0);
    const paid = myBills.filter((b) => b.status === "odendi").reduce((s, b) => s + b.amount, 0);
    return {
      invoiced,
      paid,
      pct: sc.contractAmount > 0 ? (invoiced / sc.contractAmount) * 100 : 0,
    };
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {(["TRY", "USD", "EUR"] as Currency[]).map((c) => (
          <Card key={c} className="!p-4">
            <div className="text-[10px] text-text3 uppercase font-bold tracking-wider mb-1">
              {c} Sözleşme Tutarı
            </div>
            <div className="font-mono text-xl font-bold text-text tabular-nums">
              {formatMoney(totals[c].contract, c)}
            </div>
            <div className="text-[11px] text-text3 mt-1">
              Faturalanan: <span className="font-mono">{formatMoney(totals[c].invoiced, c)}</span>
            </div>
            <div className="text-[11px] text-text3">
              Ödenen: <span className="font-mono text-green">{formatMoney(totals[c].paid, c)}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-text2">Alt yüklenicilerle yapılan sözleşmeler</p>
        <Button variant="accent" onClick={() => setCreating(true)}>
          <Plus size={14} /> Yeni Sözleşme
        </Button>
      </div>

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>Alt Yüklenici</TH>
              <TH>İş Kapsamı</TH>
              <TH>Disiplin</TH>
              <TH className="text-right">Sözleşme Tutarı</TH>
              <TH className="text-right">Faturalanan / İlerleme</TH>
              <TH>Tarih</TH>
              <TH>Durum</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {items.length === 0 ? (
              <Empty colSpan={8}>Henüz alt yüklenici sözleşmesi yok.</Empty>
            ) : (
              items.map((s) => {
                const p = getProgress(s.id, s.currency);
                return (
                  <TR key={s.id}>
                    <TD>
                      <div className="font-semibold">{s.name}</div>
                      {s.contactName && <div className="text-[11px] text-text3">{s.contactName}</div>}
                    </TD>
                    <TD className="text-sm">{s.scopeOfWork}</TD>
                    <TD>{s.discipline && <Badge variant="blue">{s.discipline}</Badge>}</TD>
                    <TD className="text-right font-mono font-semibold tabular-nums">
                      {formatMoney(s.contractAmount, s.currency)}
                    </TD>
                    <TD className="text-right">
                      <div className="font-mono text-xs tabular-nums">
                        {formatMoney(p.invoiced, s.currency)}
                      </div>
                      <div className="h-1.5 bg-bg3 rounded-full overflow-hidden mt-1 w-32 ml-auto">
                        <div
                          className="h-full bg-accent transition-all"
                          style={{ width: `${Math.min(100, p.pct)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-text3 mt-0.5">{p.pct.toFixed(1)}%</div>
                    </TD>
                    <TD className="text-xs text-text2">
                      <div>{formatDate(s.contractDate)}</div>
                      {s.endDate && <div className="text-text3">→ {formatDate(s.endDate)}</div>}
                    </TD>
                    <TD>
                      <Badge variant={SC_STATUS_VARIANT[s.status]}>{SC_STATUS_LABEL[s.status]}</Badge>
                    </TD>
                    <TD>
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setEditing(s)} className="p-1 text-text3 hover:text-accent rounded">
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`${s.name} ve tüm faturaları silinsin mi?`)) del(s.id);
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

      <SubcontractForm
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(data) => {
          add({ ...data, projectId });
          setCreating(false);
        }}
      />
      <SubcontractForm
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

// ============================================================
// TAB 3: Alt Yüklenici Faturaları
// ============================================================
function SubInvoicesTab({
  projectId,
  items,
  subcontractors,
}: {
  projectId: string;
  items: BillingItem[];
  subcontractors: Subcontractor[];
}) {
  const add = useStore((s) => s.addBilling);
  const update = useStore((s) => s.updateBilling);
  const del = useStore((s) => s.deleteBilling);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BillingItem | null>(null);
  const [filterSc, setFilterSc] = useState<string>("");

  const filtered = useMemo(
    () => (filterSc ? items.filter((i) => i.subcontractorId === filterSc) : items),
    [items, filterSc]
  );

  const totals = useMemo(() => {
    const m: Record<Currency, { received: number; paid: number }> = {
      TRY: { received: 0, paid: 0 },
      USD: { received: 0, paid: 0 },
      EUR: { received: 0, paid: 0 },
    };
    for (const it of items) {
      if (it.status === "iptal") continue;
      m[it.currency].received += it.amount;
      if (it.status === "odendi") m[it.currency].paid += it.amount;
    }
    return m;
  }, [items]);

  if (subcontractors.length === 0) {
    return (
      <Alert variant="warning">
        Önce <strong>Alt Yüklenici Sözleşmeleri</strong> sekmesinden bir alt yüklenici ekleyin.
        Fatura kaydı için alt yüklenici bilgisi gereklidir.
      </Alert>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {(["TRY", "USD", "EUR"] as Currency[]).map((c) => (
          <Card key={c} className="!p-4">
            <div className="text-[10px] text-text3 uppercase font-bold tracking-wider mb-1">
              {c} Ödenen
            </div>
            <div className="font-mono text-xl font-bold text-green tabular-nums">
              {formatMoney(totals[c].paid, c)}
            </div>
            <div className="text-[11px] text-text3 mt-1">
              / {formatMoney(totals[c].received, c)} gelen fatura
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text3 font-semibold">Alt Yüklenici:</span>
          <Select
            value={filterSc}
            onChange={(e) => setFilterSc(e.target.value)}
            className="!h-9 !min-w-[200px] !py-0"
          >
            <option value="">Tümü</option>
            {subcontractors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="accent" onClick={() => setCreating(true)}>
          <Plus size={14} /> Yeni Fatura
        </Button>
      </div>

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>Fatura No</TH>
              <TH>Alt Yüklenici</TH>
              <TH>Açıklama</TH>
              <TH className="text-right">Tutar</TH>
              <TH>Düzenleme</TH>
              <TH>Vade</TH>
              <TH>Durum</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {filtered.length === 0 ? (
              <Empty colSpan={8}>Henüz alt yüklenici faturası yok.</Empty>
            ) : (
              filtered.map((it) => {
                const sc = subcontractors.find((s) => s.id === it.subcontractorId);
                return (
                  <TR key={it.id}>
                    <TD className="font-mono text-xs text-text2">{it.invoiceNo || "—"}</TD>
                    <TD className="text-sm font-medium">{sc?.name ?? "—"}</TD>
                    <TD className="text-sm">{it.description}</TD>
                    <TD className="text-right font-mono font-semibold tabular-nums">
                      {formatMoney(it.amount, it.currency)}
                    </TD>
                    <TD className="text-xs text-text2">{formatDate(it.issueDate)}</TD>
                    <TD className="text-xs text-text2">{it.dueDate ? formatDate(it.dueDate) : "—"}</TD>
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
                );
              })
            )}
          </TBody>
        </Table>
      </TableWrap>

      <InvoiceForm
        open={creating}
        title="Yeni Alt Yüklenici Faturası"
        showSubcontractor
        subcontractors={subcontractors}
        onClose={() => setCreating(false)}
        onSubmit={(data) => {
          add({ ...data, projectId, direction: "subcontractor_outgoing" });
          setCreating(false);
        }}
      />
      <InvoiceForm
        open={!!editing}
        title="Alt Yüklenici Faturası — Düzenle"
        showSubcontractor
        subcontractors={subcontractors}
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

// ============================================================
// Forms
// ============================================================
function InvoiceForm({
  open,
  title,
  initial,
  showSubcontractor,
  subcontractors,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initial?: BillingItem;
  showSubcontractor?: boolean;
  subcontractors?: Subcontractor[];
  onClose: () => void;
  onSubmit: (data: Omit<BillingItem, "id" | "projectId" | "direction">) => void;
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
  const [subcontractorId, setSubcontractorId] = useState(initial?.subcontractorId ?? "");

  return (
    <Dialog open={open} onClose={onClose} title={title} size="md">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {showSubcontractor && (
          <Field label="Alt Yüklenici" className="sm:col-span-2">
            <Select value={subcontractorId} onChange={(e) => setSubcontractorId(e.target.value)}>
              <option value="">Seçin</option>
              {(subcontractors || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({formatMoney(s.contractAmount, s.currency)})
                </option>
              ))}
            </Select>
          </Field>
        )}
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
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Hakediş No.1 — Şubat 2026"
          />
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
          onClick={() => {
            if (showSubcontractor && !subcontractorId) {
              alert("Alt yüklenici seçin");
              return;
            }
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
              subcontractorId: showSubcontractor ? subcontractorId : undefined,
            });
          }}
        >
          Kaydet
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function SubcontractForm({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial?: Subcontractor;
  onClose: () => void;
  onSubmit: (data: Omit<Subcontractor, "id" | "projectId" | "createdAt" | "updatedAt">) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [taxNo, setTaxNo] = useState(initial?.taxNo ?? "");
  const [contactName, setContactName] = useState(initial?.contactName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [scopeOfWork, setScopeOfWork] = useState(initial?.scopeOfWork ?? "");
  const [discipline, setDiscipline] = useState<Discipline | "">(initial?.discipline ?? "");
  const [contractAmount, setContractAmount] = useState(initial?.contractAmount ?? 0);
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "TRY");
  const [contractDate, setContractDate] = useState(initial?.contractDate ?? new Date().toISOString().slice(0, 10));
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [status, setStatus] = useState<Subcontractor["status"]>(initial?.status ?? "aktif");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <Dialog open={open} onClose={onClose} title={initial ? "Alt Yüklenici — Düzenle" : "Yeni Alt Yüklenici"} size="md">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Firma Adı" className="sm:col-span-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="X İnşaat Ltd. Şti." />
        </Field>
        <Field label="Vergi No">
          <Input value={taxNo} onChange={(e) => setTaxNo(e.target.value)} />
        </Field>
        <Field label="Yetkili">
          <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </Field>
        <Field label="Telefon">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="E-posta">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="İş Kapsamı" className="sm:col-span-2">
          <Input
            value={scopeOfWork}
            onChange={(e) => setScopeOfWork(e.target.value)}
            placeholder="Taşıyıcı sistem montajı"
          />
        </Field>
        <Field label="Disiplin">
          <Select value={discipline} onChange={(e) => setDiscipline(e.target.value as Discipline)}>
            <option value="">—</option>
            <option value="mekanik">Mekanik</option>
            <option value="elektrik">Elektrik</option>
            <option value="insaat">İnşaat</option>
            <option value="muhendislik">Mühendislik</option>
            <option value="idari">İdari</option>
            <option value="diger">Diğer</option>
          </Select>
        </Field>
        <Field label="Sözleşme Tutarı">
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              className="flex-1"
              value={contractAmount}
              onChange={(e) => setContractAmount(Number(e.target.value) || 0)}
            />
            <Select className="w-24" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </Select>
          </div>
        </Field>
        <Field label="Sözleşme Tarihi">
          <Input type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
        </Field>
        <Field label="Başlama">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="Bitiş">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
        <Field label="Durum">
          <Select value={status} onChange={(e) => setStatus(e.target.value as Subcontractor["status"])}>
            <option value="aktif">Aktif</option>
            <option value="askida">Askıda</option>
            <option value="tamamlandi">Tamamlandı</option>
            <option value="iptal">İptal</option>
          </Select>
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
              name,
              taxNo: taxNo || undefined,
              contactName: contactName || undefined,
              phone: phone || undefined,
              email: email || undefined,
              scopeOfWork,
              discipline: (discipline || undefined) as Discipline | undefined,
              contractAmount,
              currency,
              contractDate,
              startDate: startDate || undefined,
              endDate: endDate || undefined,
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

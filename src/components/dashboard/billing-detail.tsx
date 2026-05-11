"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Receipt, Users2 } from "lucide-react";
import { useStore, useCurrentProject } from "@/lib/store";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney, cn } from "@/lib/utils";
import type { BillingItem, Subcontractor } from "@/lib/store/types";

const STATUS_LABEL: Record<BillingItem["status"], string> = {
  taslak: "Taslak",
  gonderildi: "Beklemede",
  odendi: "Ödendi",
  iptal: "İptal",
};
const STATUS_VARIANT: Record<BillingItem["status"], "gray" | "yellow" | "green" | "red"> = {
  taslak: "gray",
  gonderildi: "yellow",
  odendi: "green",
  iptal: "red",
};

export function BillingDetailWidget() {
  const project = useCurrentProject();
  const billing = useStore((s) => s.billing).filter((b) => b.projectId === project?.id);
  const subs = useStore((s) => s.subcontractors).filter((s) => s.projectId === project?.id);

  const ownerInvoices = useMemo(
    () => billing
      .filter((b) => b.direction === "owner_incoming")
      .sort((a, b) => a.issueDate.localeCompare(b.issueDate)),
    [billing]
  );

  if (!project) return null;

  const contractAmount = project.totalBudget ?? 0;
  const ownerInvoicedTotal = ownerInvoices
    .filter((b) => b.status !== "iptal")
    .reduce((s, b) => s + b.amount, 0);
  const ownerPaidTotal = ownerInvoices
    .filter((b) => b.status === "odendi")
    .reduce((s, b) => s + b.amount, 0);
  const ownerInvoicedPct = contractAmount > 0 ? (ownerInvoicedTotal / contractAmount) * 100 : 0;

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <CardTitle className="mb-0">
          <Receipt size={14} className="text-accent" />
          Faturalandırma Durumu
        </CardTitle>
        <Link href="/billing" className="text-[11px] text-accent font-bold hover:underline">
          Detay →
        </Link>
      </div>

      <div className="px-6 py-5">
        {/* İŞVEREN */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-bold text-text3">
            İşveren
          </span>
          <span className="text-[10px] font-bold text-text3">— {project.budgetCurrency}</span>
        </div>
        <div className="flex items-center justify-between mb-2 text-sm">
          <div className="font-semibold">
            Sözleşme: {formatMoney(contractAmount, project.budgetCurrency, 0)}
          </div>
          <div className="text-text2">
            Faturalanan:{" "}
            <span className="font-mono font-semibold text-text">
              {formatMoney(ownerInvoicedTotal, project.budgetCurrency, 0)}
            </span>
            <span className="text-text3 ml-1">({ownerInvoicedPct.toFixed(1)}%)</span>
          </div>
        </div>
        <div className="h-2 bg-bg3 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-accent rounded-full transition-[width] duration-700"
            style={{ width: `${Math.min(100, ownerInvoicedPct)}%` }}
          />
        </div>

        <BillingTable items={ownerInvoices} currency={project.budgetCurrency} />

        {/* ALT YÜKLENİCİLER */}
        {subs.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
              <Users2 size={14} className="text-accent" />
              <span className="text-[10px] uppercase tracking-wider font-bold text-text2">
                Alt Yükleniciler
              </span>
            </div>
            <div className="space-y-4">
              {subs.map((sc) => (
                <SubcontractorBlock key={sc.id} sub={sc} bills={billing} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function BillingTable({ items, currency }: { items: BillingItem[]; currency: string }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-text3 py-4 text-center">Henüz fatura kaydı yok.</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider font-bold text-text3 border-b border-border">
            <th className="text-left py-2 px-1 w-10">No</th>
            <th className="text-left py-2 px-1">Açıklama</th>
            <th className="text-right py-2 px-1 whitespace-nowrap">Plan / Tarih</th>
            <th className="text-right py-2 px-1 whitespace-nowrap">Plan / Tutar</th>
            <th className="text-right py-2 px-1 whitespace-nowrap">Gerçek</th>
            <th className="text-left py-2 px-1 whitespace-nowrap">Durum</th>
          </tr>
        </thead>
        <tbody>
          {items.map((b, i) => {
            const isPaid = b.status === "odendi";
            const isOverdue = !isPaid && b.dueDate && new Date(b.dueDate) < new Date();
            return (
              <tr key={b.id} className="hover:bg-bg2/40 border-b border-border last:border-b-0">
                <td className="py-2.5 px-1 text-text3 font-mono text-xs">{i + 1}</td>
                <td className="py-2.5 px-1">
                  <div className="font-medium">{b.description}</div>
                  {b.invoiceNo && <div className="text-[10px] text-text3 font-mono">{b.invoiceNo}</div>}
                </td>
                <td className="py-2.5 px-1 text-right text-xs">
                  <span className={isOverdue ? "text-red" : "text-text2"}>
                    {b.dueDate ? formatDate(b.dueDate) : formatDate(b.issueDate)}
                  </span>
                </td>
                <td className="py-2.5 px-1 text-right font-mono font-semibold text-text tabular-nums whitespace-nowrap">
                  {formatMoney(b.amount, currency as "TRY" | "USD" | "EUR", 0)}
                </td>
                <td className="py-2.5 px-1 text-right font-mono whitespace-nowrap">
                  {isPaid ? (
                    <span className="text-green font-semibold tabular-nums">
                      {formatMoney(b.amount, currency as "TRY" | "USD" | "EUR", 0)}
                    </span>
                  ) : (
                    <span className="text-text3">—</span>
                  )}
                </td>
                <td className="py-2.5 px-1">
                  <Badge variant={STATUS_VARIANT[b.status]}>
                    {STATUS_LABEL[b.status]}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SubcontractorBlock({ sub, bills }: { sub: Subcontractor; bills: BillingItem[] }) {
  const myBills = useMemo(
    () => bills
      .filter((b) => b.direction === "subcontractor_outgoing" && b.subcontractorId === sub.id)
      .sort((a, b) => a.issueDate.localeCompare(b.issueDate)),
    [bills, sub.id]
  );
  const invoiced = myBills.filter((b) => b.status !== "iptal").reduce((s, b) => s + b.amount, 0);
  const paid = myBills.filter((b) => b.status === "odendi").reduce((s, b) => s + b.amount, 0);
  const pct = sub.contractAmount > 0 ? (invoiced / sub.contractAmount) * 100 : 0;
  return (
    <div className="rounded-xl border border-border bg-bg2/30 p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
        <div className="font-semibold text-sm text-text">{sub.name}</div>
        <div className="text-[11px] text-text3">— {sub.scopeOfWork}</div>
        <div className="ml-auto text-xs">
          <span className="font-mono font-semibold text-text">{formatMoney(invoiced, sub.currency, 0)}</span>
          <span className="text-text3 mx-1">/</span>
          <span className="font-mono text-text2">{formatMoney(sub.contractAmount, sub.currency, 0)}</span>
          <span className={cn("ml-2 font-bold", pct >= 80 ? "text-green" : pct >= 40 ? "text-yellow" : "text-text3")}>
            ({pct.toFixed(1)}%)
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-white border border-border rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-accent transition-[width] duration-500"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
        {paid > 0 && (
          <div
            className="h-full bg-green -mt-1.5 transition-[width] duration-500"
            style={{ width: `${Math.min(100, (paid / sub.contractAmount) * 100)}%` }}
          />
        )}
      </div>
      {myBills.length > 0 && <BillingTable items={myBills} currency={sub.currency} />}
    </div>
  );
}

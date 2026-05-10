"use client";

import { useMemo } from "react";
import { Trash2, RotateCcw, Trash } from "lucide-react";
import { useStore, useCurrentProject } from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TableWrap, Table, THead, TBody, TR, TH, TD, Empty } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";

export default function TrashPage() {
  const project = useCurrentProject();
  const wbsDeleted = useStore((s) =>
    s.wbs.filter((w) => w.deletedAt && (!project || w.projectId === project.id))
  );
  const personnelDeleted = useStore((s) => s.personnelMaster).filter((p) => p.deletedAt);
  const machinesDeleted = useStore((s) => s.machinesMaster).filter((m) => m.deletedAt);

  const restoreWbs = useStore((s) => s.restoreWbs);
  const hardDeleteWbs = useStore((s) => s.hardDeleteWbs);

  const total = wbsDeleted.length + personnelDeleted.length + machinesDeleted.length;

  return (
    <>
      <PageHeader
        title="Çöp Kutusu"
        description={`${total} silinmiş kayıt — 30 gün sonra otomatik kalıcı silinir`}
        icon={Trash2}
      />

      <Alert variant="info" className="mb-4">
        Soft delete edilen kayıtlar burada görüntülenir. Geri yükleyebilir veya kalıcı silebilirsin.
      </Alert>

      <Card className="mb-4">
        <CardTitle>WBS Maddeleri ({wbsDeleted.length})</CardTitle>
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Kod</TH>
                <TH>Ad</TH>
                <TH>Silinme Tarihi</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {wbsDeleted.length === 0 ? (
                <Empty colSpan={4}>Boş</Empty>
              ) : (
                wbsDeleted.map((w) => (
                  <TR key={w.id}>
                    <TD className="font-mono text-xs">{w.code}</TD>
                    <TD>{w.name}</TD>
                    <TD className="text-xs text-text3">{w.deletedAt && formatDate(w.deletedAt)}</TD>
                    <TD>
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="accent" onClick={() => restoreWbs(w.id)}>
                          <RotateCcw size={11} /> Geri Yükle
                        </Button>
                        <button
                          onClick={() => {
                            if (confirm("Kalıcı olarak silinsin mi?")) hardDeleteWbs(w.id);
                          }}
                          className="p-1.5 text-text3 hover:text-red rounded"
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </TableWrap>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Personel ({personnelDeleted.length})</CardTitle>
          {personnelDeleted.length === 0 ? (
            <p className="text-sm text-text3">Boş</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {personnelDeleted.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-1 border-b border-border">
                  <span>
                    {p.firstName} {p.lastName} <span className="text-text3 text-xs">({p.company})</span>
                  </span>
                  <span className="text-xs text-text3">{p.deletedAt && formatDate(p.deletedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>Makine ({machinesDeleted.length})</CardTitle>
          {machinesDeleted.length === 0 ? (
            <p className="text-sm text-text3">Boş</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {machinesDeleted.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-1 border-b border-border">
                  <span>
                    {m.name} <span className="text-text3 text-xs">({m.licensePlate || m.machineType})</span>
                  </span>
                  <span className="text-xs text-text3">{m.deletedAt && formatDate(m.deletedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

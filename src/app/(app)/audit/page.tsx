"use client";

import { History } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { TableWrap, Table, THead, TBody, TR, TH, TD, Empty } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { formatDate } from "@/lib/utils";

export default function AuditPage() {
  const entries = useStore((s) => s.auditLog);
  const users = useStore((s) => s.users);

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Sistem yazma işlemlerinin kaydı"
        icon={History}
      />

      <Alert variant="info" className="mb-4">
        Lokal sürümde audit log iskelet halinde. Supabase entegrasyonu sonrası tüm yazma işlemleri kaydedilecek.
      </Alert>

      <Card>
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Tarih</TH>
                <TH>Kullanıcı</TH>
                <TH>Aksiyon</TH>
                <TH>Varlık</TH>
              </TR>
            </THead>
            <TBody>
              {entries.length === 0 ? (
                <Empty colSpan={4}>Henüz kayıt yok.</Empty>
              ) : (
                entries
                  .slice()
                  .reverse()
                  .map((e) => {
                    const u = users.find((x) => x.id === e.userId);
                    return (
                      <TR key={e.id}>
                        <TD className="text-xs text-text3">{formatDate(e.createdAt)}</TD>
                        <TD className="text-xs">{u?.fullName ?? "—"}</TD>
                        <TD className="font-mono text-xs">{e.action}</TD>
                        <TD className="text-xs text-text2">
                          {e.entityType}
                          {e.entityId && (
                            <span className="text-text3"> #{e.entityId.slice(0, 8)}</span>
                          )}
                        </TD>
                      </TR>
                    );
                  })
              )}
            </TBody>
          </Table>
        </TableWrap>
      </Card>
    </>
  );
}

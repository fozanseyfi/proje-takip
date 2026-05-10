"use client";

import { Database, Download, Upload } from "lucide-react";
import { useStore, useCurrentProject } from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export default function BackupPage() {
  const project = useCurrentProject();
  const state = useStore.getState;

  function exportAll() {
    const data = state();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ges-takip-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportProject() {
    if (!project) return;
    const s = state();
    const payload = {
      project,
      wbs: s.wbs.filter((w) => w.projectId === project.id),
      planned: s.planned[project.id] || {},
      realized: s.realized[project.id] || {},
      members: s.members.filter((m) => m.projectId === project.id),
      personnelAttendance: s.personnelAttendance.filter((p) => p.projectId === project.id),
      machineAttendance: s.machineAttendance.filter((m) => m.projectId === project.id),
      dailyReports: s.dailyReports.filter((d) => d.projectId === project.id),
      procurement: s.procurement.filter((p) => p.projectId === project.id),
      billing: s.billing.filter((b) => b.projectId === project.id),
      budgetCategories: s.budgetCategories.filter((c) => c.projectId === project.id),
      budgetActuals: s.budgetActuals.filter((a) => a.projectId === project.id),
      lookahead: s.lookahead.filter((l) => l.projectId === project.id),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "-")}-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader title="Yedekleme & Geri Yükleme" icon={Database} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Yedekleme</CardTitle>
          <p className="text-sm text-text2 mb-4">
            Lokal verinin tamamını veya sadece aktif projeyi JSON olarak indir. Excel paketi (xlsx) Supabase
            entegrasyonu sonrası eklenecek.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="accent" onClick={exportAll}>
              <Download size={14} /> Tümünü İndir (JSON)
            </Button>
            <Button variant="ghost" onClick={exportProject} disabled={!project}>
              <Download size={14} /> Aktif Projeyi İndir
            </Button>
          </div>
        </Card>

        <Card>
          <CardTitle>Geri Yükleme</CardTitle>
          <Alert variant="warning" className="mb-3">
            Geri yükleme özelliği sonraki sürümlerde eklenecek. Şu an sadece export çalışıyor.
          </Alert>
          <Button variant="ghost" disabled>
            <Upload size={14} /> Dosya Yükle
          </Button>
        </Card>
      </div>
    </>
  );
}

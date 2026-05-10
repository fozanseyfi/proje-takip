"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Trash2 } from "lucide-react";
import { useStore, useCurrentProject } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { addDays, toISODate } from "@/lib/utils";
import type { Currency } from "@/lib/utils";
import type { Project } from "@/lib/store/types";

export default function SettingsPage() {
  const project = useCurrentProject();
  const updateProject = useStore((s) => s.updateProject);
  const deleteProject = useStore((s) => s.deleteProject);

  const [form, setForm] = useState<Partial<Project>>({});

  useEffect(() => {
    if (project) setForm({ ...project });
  }, [project?.id]);

  if (!project)
    return (
      <Card>
        <CardTitle>Proje Yok</CardTitle>
      </Card>
    );

  const toast = useToast((s) => s.push);

  function save() {
    if (!project) return;
    let plannedEnd = form.plannedEnd;
    if (form.startDate && form.durationDays != null) {
      plannedEnd = toISODate(addDays(form.startDate, form.durationDays));
    }
    updateProject(project.id, { ...form, plannedEnd });
    toast("Proje ayarları kaydedildi", "success");
  }

  return (
    <>
      <PageHeader
        title="Proje Ayarları"
        icon={Settings}
        actions={
          <Button variant="accent" onClick={save}>
            <Save size={14} /> Kaydet
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardTitle>Genel</CardTitle>
          <div className="space-y-3">
            <Field label="Proje Adı">
              <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Konum">
              <Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Enlem (lat)">
                <Input
                  type="number"
                  step="0.0001"
                  value={form.latitude ?? ""}
                  onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) || null })}
                />
              </Field>
              <Field label="Boylam (lng)">
                <Input
                  type="number"
                  step="0.0001"
                  value={form.longitude ?? ""}
                  onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) || null })}
                />
              </Field>
            </div>
            <Field label="Durum">
              <Select
                value={form.status ?? "active"}
                onChange={(e) => setForm({ ...form, status: e.target.value as Project["status"] })}
              >
                <option value="active">Aktif</option>
                <option value="completed">Tamamlandı</option>
                <option value="archived">Arşivlendi</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle>Tarih & Süre</CardTitle>
          <div className="space-y-3">
            <Field label="Başlangıç">
              <Input
                type="date"
                value={form.startDate ?? ""}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </Field>
            <Field label="Süre (gün)">
              <Input
                type="number"
                value={form.durationDays ?? 0}
                onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Sözleşme Bitiş">
              <Input
                type="date"
                value={form.contractEnd ?? ""}
                onChange={(e) => setForm({ ...form, contractEnd: e.target.value })}
              />
            </Field>
            <Field label="Rapor Tarihi">
              <Input
                type="date"
                value={form.reportDate ?? ""}
                onChange={(e) => setForm({ ...form, reportDate: e.target.value })}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle>Finansal</CardTitle>
          <div className="space-y-3">
            <Field label="Kurulu Güç (MW)">
              <Input
                type="number"
                step="0.01"
                value={form.installedCapacityMw ?? ""}
                onChange={(e) =>
                  setForm({ ...form, installedCapacityMw: Number(e.target.value) || null })
                }
              />
            </Field>
            <Field label="Toplam Bütçe">
              <Input
                type="number"
                value={form.totalBudget ?? ""}
                onChange={(e) => setForm({ ...form, totalBudget: Number(e.target.value) || null })}
              />
            </Field>
            <Field label="Para Birimi">
              <Select
                value={form.budgetCurrency ?? "TRY"}
                onChange={(e) => setForm({ ...form, budgetCurrency: e.target.value as Currency })}
              >
                <option value="TRY">TRY (₺)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </Select>
            </Field>
          </div>
        </Card>
      </div>

      <Card className="mt-4 border-red/30">
        <CardTitle>Tehlikeli Bölge</CardTitle>
        <Alert variant="warning" className="mb-3">
          Projeyi silmek geri alınamaz bir işlem değildir — tüm bağlı veriler (WBS, planlama, gerçekleşme,
          puantaj, vb.) silinir. (Lokal sürümde localStorage&apos;dan kaldırılır.)
        </Alert>
        <Button
          variant="danger"
          onClick={() => {
            if (confirm(`"${project.name}" projesi ve tüm verileri silinsin mi?`)) {
              deleteProject(project.id);
            }
          }}
        >
          <Trash2 size={14} /> Projeyi Sil
        </Button>
      </Card>
    </>
  );
}

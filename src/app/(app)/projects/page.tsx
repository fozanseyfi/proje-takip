"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FolderKanban, MapPin, Calendar, ArrowRight, Sun, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatDate, toISODate, addDays } from "@/lib/utils";
import { useCurrentUser } from "@/lib/store";
import type { Currency } from "@/lib/utils";
import { loadSampleProject } from "@/lib/data/sample-loader";

export default function ProjectsPage() {
  const projects = useStore((s) => s.projects);
  const createProject = useStore((s) => s.createProject);
  const setCurrentProject = useStore((s) => s.setCurrentProject);
  const user = useCurrentUser();
  const toast = useToast((s) => s.push);
  const [open, setOpen] = useState(false);

  function loadSample() {
    if (!user) return;
    if (projects.some((p) => p.name === "Ankara Polatlı GES")) {
      if (!confirm("'Ankara Polatlı GES' projesi zaten yüklenmiş. Yine de eklensin mi?")) return;
    }
    const { projectId } = loadSampleProject(user.id);
    setCurrentProject(projectId);
    toast("Ankara Polatlı GES örnek projesi yüklendi · Dashboard'a yönlendiriliyorsun", "success");
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 800);
  }

  const [form, setForm] = useState({
    name: "",
    location: "",
    startDate: toISODate(new Date()),
    durationDays: 180,
    installedCapacityMw: "",
    totalBudget: "",
    budgetCurrency: "TRY" as Currency,
  });

  function submit() {
    if (!form.name || !form.location || !user) return;
    const start = new Date(form.startDate);
    const end = addDays(start, form.durationDays);
    createProject({
      name: form.name,
      location: form.location,
      wbsNo: "1",
      startDate: form.startDate,
      durationDays: form.durationDays,
      plannedEnd: toISODate(end),
      contractEnd: toISODate(end),
      reportDate: toISODate(new Date()),
      installedCapacityMw: form.installedCapacityMw ? Number(form.installedCapacityMw) : null,
      totalBudget: form.totalBudget ? Number(form.totalBudget) : null,
      budgetCurrency: form.budgetCurrency,
      status: "active",
      createdBy: user.id,
    });
    setOpen(false);
    setForm({ ...form, name: "", location: "", installedCapacityMw: "", totalBudget: "" });
  }

  return (
    <>
      <PageHeader
        title="Projeler"
        description="Tüm projelerin listesi"
        icon={FolderKanban}
        actions={
          <>
            <Button variant="outline" onClick={loadSample}>
              <Sparkles size={14} /> Örnek Proje Yükle
            </Button>
            <Button variant="accent" onClick={() => setOpen(true)}>
              <Plus size={14} /> Yeni Proje
            </Button>
          </>
        }
      />

      {projects.length === 0 ? (
        <Card className="text-center py-12">
          <FolderKanban size={36} className="mx-auto text-text3 mb-3" />
          <CardTitle>Henüz proje yok</CardTitle>
          <p className="text-sm text-text2 mb-4">İlk projeni oluşturmak için aşağıdaki butonu kullan.</p>
          <Button variant="accent" onClick={() => setOpen(true)}>
            <Plus size={14} /> İlk Projeyi Oluştur
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p, i) => (
            <Card
              key={p.id}
              className={cn(
                "hover:border-accent/40 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-all duration-300",
                "animate-slide-up",
                i === 0 && "animate-slide-up-delay-1",
                i === 1 && "animate-slide-up-delay-2",
                i === 2 && "animate-slide-up-delay-3",
                i >= 3 && "animate-slide-up-delay-4"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <div className="font-display font-bold text-lg text-text mb-1 truncate">{p.name}</div>
                  <div className="flex items-center gap-1 text-xs text-text3">
                    <MapPin size={12} />
                    {p.location}
                  </div>
                </div>
                <Badge
                  variant={p.status === "active" ? "green" : p.status === "completed" ? "blue" : "gray"}
                >
                  {p.status}
                </Badge>
              </div>
              <div className="space-y-2 text-xs text-text2 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-text3" />
                  <span>
                    {formatDate(p.startDate)} → {formatDate(p.plannedEnd)}
                  </span>
                  <span className="text-text3 ml-auto font-mono">{p.durationDays}g</span>
                </div>
                {p.installedCapacityMw != null && (
                  <div className="flex items-center gap-2">
                    <Sun size={12} className="text-yellow" />
                    <span className="text-text3">Kurulu Güç</span>
                    <span className="font-mono text-text ml-auto">{p.installedCapacityMw} MW</span>
                  </div>
                )}
                {p.totalBudget != null && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 inline-flex items-center justify-center text-text3 text-[10px]">₺</span>
                    <span className="text-text3">Bütçe</span>
                    <span className="font-mono text-text ml-auto">
                      {p.totalBudget.toLocaleString("tr-TR")} {p.budgetCurrency}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Link href="/dashboard" className="flex-1">
                  <Button
                    variant="accent"
                    size="sm"
                    className="w-full"
                    onClick={() => setCurrentProject(p.id)}
                  >
                    Aç <ArrowRight size={12} />
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentProject(p.id)}
                  >
                    Ayarlar
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Yeni Proje" size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Proje Adı">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="örn. Konya GES 2"
            />
          </Field>
          <Field label="Konum">
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="il, ilçe"
            />
          </Field>
          <Field label="Başlangıç Tarihi">
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </Field>
          <Field label="Süre (gün)">
            <Input
              type="number"
              value={form.durationDays}
              onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Kurulu Güç (MW)">
            <Input
              type="number"
              step="0.01"
              value={form.installedCapacityMw}
              onChange={(e) => setForm({ ...form, installedCapacityMw: e.target.value })}
            />
          </Field>
          <Field label="Toplam Bütçe">
            <div className="flex gap-2">
              <Input
                type="number"
                className="flex-1"
                value={form.totalBudget}
                onChange={(e) => setForm({ ...form, totalBudget: e.target.value })}
              />
              <Select
                className="w-24"
                value={form.budgetCurrency}
                onChange={(e) => setForm({ ...form, budgetCurrency: e.target.value as Currency })}
              >
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </Select>
            </div>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>İptal</Button>
          <Button variant="accent" onClick={submit}>Oluştur</Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

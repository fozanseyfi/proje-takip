"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HardHat, ChevronLeft, ChevronRight, Users, Search, X } from "lucide-react";
import { useStore, useCurrentProject, useCurrentUser } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatDate, toISODate, cn, addDays } from "@/lib/utils";

export default function PersonnelAttendancePage() {
  const project = useCurrentProject();
  const user = useCurrentUser();
  const personnel = useStore((s) => s.personnelMaster).filter((p) => !p.deletedAt);
  const assignments = useStore((s) => s.personnelAssignments);
  const attendance = useStore((s) => s.personnelAttendance);
  const setAttendance = useStore((s) => s.setPersonnelAttendance);

  const [date, setDate] = useState(toISODate(new Date()));
  const [filterDiscipline, setFilterDiscipline] = useState<string>("");
  const [filterCompany, setFilterCompany] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Tüm atanmış personel (filtre uygulanmamış — toplam sayım için)
  const allAssigned = useMemo(() => {
    if (!project) return [];
    const ids = new Set(
      assignments
        .filter((a) => a.projectId === project.id && !a.assignedTo)
        .map((a) => a.personnelMasterId)
    );
    return personnel.filter((p) => ids.has(p.id));
  }, [assignments, personnel, project]);

  // Atanmış personeldeki benzersiz firmalar
  const companies = useMemo(
    () =>
      Array.from(new Set(allAssigned.map((p) => p.company).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "tr")
      ),
    [allAssigned]
  );

  const assignedPersonnel = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allAssigned
      .filter((p) => !filterDiscipline || p.discipline === filterDiscipline)
      .filter((p) => !filterCompany || p.company === filterCompany)
      .filter((p) => {
        if (!q) return true;
        return (
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          p.company.toLowerCase().includes(q) ||
          (p.jobTitle || "").toLowerCase().includes(q) ||
          (p.tcKimlikNo || "").includes(q)
        );
      });
  }, [allAssigned, filterDiscipline, filterCompany, search]);

  // Mevcut puantaj durumu (date için)
  const existingAttendance = useMemo(() => {
    if (!project) return new Map<string, { present: boolean; hours: number }>();
    const m = new Map<string, { present: boolean; hours: number }>();
    for (const a of attendance) {
      if (a.projectId === project.id && a.date === date) {
        m.set(a.personnelMasterId, { present: a.present, hours: a.hours });
      }
    }
    return m;
  }, [attendance, project, date]);

  // Yerel state: bu sayfa için draft (default: tüm atanmışlar present:true, 9 saat)
  type Draft = { present: boolean; hours: number };
  const [draft, setDraft] = useState<Record<string, Draft>>({});

  // İlk yükte veya tarih değişince draft'ı yenile (tüm atanmışlar için, search'ten bağımsız)
  useEffect(() => {
    const d: Record<string, Draft> = {};
    for (const p of allAssigned) {
      const ex = existingAttendance.get(p.id);
      d[p.id] = ex ?? { present: true, hours: 9 };
    }
    setDraft(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, allAssigned.length]);

  function togglePresent(id: string) {
    setDraft((s) => ({ ...s, [id]: { ...s[id], present: !s[id]?.present } }));
  }

  function setHours(id: string, hours: number) {
    setDraft((s) => ({ ...s, [id]: { ...s[id], hours } }));
  }

  const toast = useToast((s) => s.push);

  function save() {
    if (!project || !user) return;
    // Save tüm atanmış personeli kaydet (görünür olanlarla sınırlı değil)
    const records = allAssigned.map((p) => ({
      projectId: project.id,
      personnelMasterId: p.id,
      date,
      present: draft[p.id]?.present ?? true,
      hours: draft[p.id]?.hours ?? 9,
      recordedBy: user.id,
    }));
    setAttendance(records);
    toast(`${records.length} personel puantajı kaydedildi`, "success");
  }

  function shiftDate(delta: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(toISODate(d));
  }

  // Toplam: tüm atanmış personelin present sayısı (sayım için)
  const totalPresentCount = useMemo(
    () => allAssigned.filter((p) => draft[p.id]?.present).length,
    [allAssigned, draft]
  );
  // Görünür olanların kaçı işaretli
  const visiblePresentCount = useMemo(
    () => assignedPersonnel.filter((p) => draft[p.id]?.present).length,
    [assignedPersonnel, draft]
  );
  const allVisibleSelected =
    assignedPersonnel.length > 0 && visiblePresentCount === assignedPersonnel.length;

  function toggleAllVisible() {
    const newValue = !allVisibleSelected;
    setDraft((s) => {
      const newDraft = { ...s };
      for (const p of assignedPersonnel) {
        newDraft[p.id] = { ...newDraft[p.id], present: newValue, hours: newDraft[p.id]?.hours ?? 9 };
      }
      return newDraft;
    });
  }

  function clearFilters() {
    setSearch("");
    setFilterDiscipline("");
    setFilterCompany("");
  }

  const hasActiveFilter = !!(search || filterDiscipline || filterCompany);

  if (!project) {
    return (
      <Card>
        <CardTitle>Proje Yok</CardTitle>
        <p className="text-sm text-text2">Önce bir proje seç.</p>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title="Personel Puantajı"
        description="Atanmış personel checkbox listesi — sadece gelmeyenleri uncheck et"
        icon={HardHat}
        actions={
          <Button variant="accent" onClick={save}>
            Kaydet ({totalPresentCount}/{allAssigned.length})
          </Button>
        }
      />

      <Card className="mb-4 !p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Tarih navigasyon */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => shiftDate(-1)}
              className="w-10 h-10 rounded-lg bg-white border border-border hover:bg-bg2 hover:border-text3 text-text2 flex items-center justify-center transition-all shadow-soft"
            >
              <ChevronLeft size={16} />
            </button>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-44 !h-10 font-mono text-sm"
            />
            <button
              onClick={() => shiftDate(1)}
              className="w-10 h-10 rounded-lg bg-white border border-border hover:bg-bg2 hover:border-text3 text-text2 flex items-center justify-center transition-all shadow-soft"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Arama */}
          <Field label="Ara" className="min-w-[200px]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ad / soyad / firma / görev"
                className="pl-9 pr-8"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-text3 hover:text-text hover:bg-bg3"
                  aria-label="Temizle"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </Field>

          {/* Disiplin filtresi */}
          <Field label="Disiplin" className="w-40">
            <Select value={filterDiscipline} onChange={(e) => setFilterDiscipline(e.target.value)}>
              <option value="">Tümü</option>
              <option value="mekanik">Mekanik</option>
              <option value="elektrik">Elektrik</option>
              <option value="insaat">İnşaat</option>
              <option value="muhendislik">Mühendislik</option>
              <option value="idari">İdari</option>
              <option value="diger">Diğer</option>
            </Select>
          </Field>

          {/* Firma filtresi */}
          <Field label="Firma" className="min-w-[180px]">
            <Select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}>
              <option value="">Tümü ({companies.length})</option>
              {companies.map((c) => {
                const n = allAssigned.filter((p) => p.company === c).length;
                return (
                  <option key={c} value={c}>
                    {c} ({n})
                  </option>
                );
              })}
            </Select>
          </Field>

          {hasActiveFilter && (
            <Button variant="outline" onClick={clearFilters} size="md">
              <X size={14} /> Filtreyi Temizle
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button variant={allVisibleSelected ? "soft" : "outline"} onClick={toggleAllVisible} size="md">
              {allVisibleSelected ? "Görünürlerin Tikini Kaldır" : "Görünürlerin Hepsini Seç"}
            </Button>
            <div className="flex flex-col items-end gap-0.5 ml-1">
              <Badge variant="green">
                {totalPresentCount} / {allAssigned.length} toplam
              </Badge>
              {hasActiveFilter && (
                <Badge variant="blue">
                  {visiblePresentCount} / {assignedPersonnel.length} görünür
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {allAssigned.length === 0 ? (
        <Card>
          <CardTitle>Atanmış personel yok</CardTitle>
          <p className="text-sm text-text2 mb-3">
            Bu projeye henüz personel ataması yapılmamış.
          </p>
          <Link href="/master/personnel">
            <Button variant="accent">
              <Users size={14} /> Master Data&apos;ya git
            </Button>
          </Link>
        </Card>
      ) : assignedPersonnel.length === 0 ? (
        <Card>
          <CardTitle>Filtreye uyan kayıt yok</CardTitle>
          <p className="text-sm text-text2 mb-3">
            Arama: <strong className="text-text">{search || "—"}</strong> ·
            Disiplin: <strong className="text-text">{filterDiscipline || "tümü"}</strong> ·
            Firma: <strong className="text-text">{filterCompany || "tümü"}</strong>
          </p>
          <Button variant="accent" onClick={clearFilters}>
            <X size={14} /> Filtreyi Temizle
          </Button>
        </Card>
      ) : (
        <Card>
          <CardTitle>{formatDate(date)} — Puantaj</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {assignedPersonnel.map((p) => {
              const d = draft[p.id] ?? { present: true, hours: 9 };
              return (
                <label
                  key={p.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border",
                    d.present
                      ? "bg-green/5 border-green/30"
                      : "bg-bg3 border-border opacity-60"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={d.present}
                    onChange={() => togglePresent(p.id)}
                    className="w-5 h-5 accent-green"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text truncate">
                      {p.firstName} {p.lastName}
                    </div>
                    <div className="text-[11px] text-text3 truncate">
                      {p.company} · {p.discipline}
                    </div>
                  </div>
                  <div className="w-14">
                    <input
                      type="number"
                      step="0.5"
                      value={d.hours}
                      onChange={(e) => setHours(p.id, Number(e.target.value) || 0)}
                      disabled={!d.present}
                      className="w-full px-2 py-1 text-xs font-mono bg-bg2 border border-border rounded text-right"
                    />
                  </div>
                </label>
              );
            })}
          </div>
        </Card>
      )}

      {assignedPersonnel.length > 5 && (
        <Alert variant="info" className="mt-4">
          Tip: Tüm personel varsayılan olarak işaretli (geldi). Sadece gelmeyenleri uncheck et,
          sonra <strong>Kaydet</strong>.
        </Alert>
      )}
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HardHat, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useStore, useCurrentProject, useCurrentUser } from "@/lib/store";
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

  const assignedPersonnel = useMemo(() => {
    if (!project) return [];
    const ids = new Set(
      assignments
        .filter((a) => a.projectId === project.id && !a.assignedTo)
        .map((a) => a.personnelMasterId)
    );
    return personnel
      .filter((p) => ids.has(p.id))
      .filter((p) => !filterDiscipline || p.discipline === filterDiscipline);
  }, [assignments, personnel, project, filterDiscipline]);

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

  // İlk yükte veya tarih değişince draft'ı yenile
  useMemo(() => {
    const d: Record<string, Draft> = {};
    for (const p of assignedPersonnel) {
      const ex = existingAttendance.get(p.id);
      d[p.id] = ex ?? { present: true, hours: 9 };
    }
    setDraft(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, assignedPersonnel.length]);

  function togglePresent(id: string) {
    setDraft((s) => ({ ...s, [id]: { ...s[id], present: !s[id]?.present } }));
  }

  function setHours(id: string, hours: number) {
    setDraft((s) => ({ ...s, [id]: { ...s[id], hours } }));
  }

  function save() {
    if (!project || !user) return;
    const records = assignedPersonnel.map((p) => ({
      projectId: project.id,
      personnelMasterId: p.id,
      date,
      present: draft[p.id]?.present ?? true,
      hours: draft[p.id]?.hours ?? 9,
      recordedBy: user.id,
    }));
    setAttendance(records);
    alert(`${records.length} kayıt güncellendi.`);
  }

  function shiftDate(delta: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(toISODate(d));
  }

  const presentCount = Object.values(draft).filter((d) => d.present).length;

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
            Kaydet ({presentCount}/{assignedPersonnel.length})
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => shiftDate(-1)}
              className="p-2 rounded-md bg-bg4 hover:bg-bg3 text-text2"
            >
              <ChevronLeft size={14} />
            </button>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-44 font-mono"
            />
            <button
              onClick={() => shiftDate(1)}
              className="p-2 rounded-md bg-bg4 hover:bg-bg3 text-text2"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <Field label="Disiplin filtresi" className="w-44">
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
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="green">{presentCount} işaretli</Badge>
            <Badge variant="gray">{assignedPersonnel.length - presentCount} işaretsiz</Badge>
          </div>
        </div>
      </Card>

      {assignedPersonnel.length === 0 ? (
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

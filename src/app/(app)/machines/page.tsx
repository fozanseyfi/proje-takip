"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Truck, ChevronLeft, ChevronRight, Cog } from "lucide-react";
import { useStore, useCurrentProject, useCurrentUser } from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate, toISODate, cn } from "@/lib/utils";

export default function MachineAttendancePage() {
  const project = useCurrentProject();
  const user = useCurrentUser();
  const machines = useStore((s) => s.machinesMaster).filter((m) => !m.deletedAt);
  const assignments = useStore((s) => s.machineAssignments);
  const attendance = useStore((s) => s.machineAttendance);
  const setAttendance = useStore((s) => s.setMachineAttendance);

  const [date, setDate] = useState(toISODate(new Date()));

  const assigned = useMemo(() => {
    if (!project) return [];
    const ids = new Set(
      assignments
        .filter((a) => a.projectId === project.id && !a.assignedTo)
        .map((a) => a.machineMasterId)
    );
    return machines.filter((m) => ids.has(m.id));
  }, [assignments, machines, project]);

  const existing = useMemo(() => {
    if (!project) return new Map<string, { present: boolean; hours: number; fuelConsumed?: number }>();
    const m = new Map<string, { present: boolean; hours: number; fuelConsumed?: number }>();
    for (const a of attendance) {
      if (a.projectId === project.id && a.date === date) {
        m.set(a.machineMasterId, { present: a.present, hours: a.hours, fuelConsumed: a.fuelConsumed });
      }
    }
    return m;
  }, [attendance, project, date]);

  type Draft = { present: boolean; hours: number; fuelConsumed?: number };
  const [draft, setDraft] = useState<Record<string, Draft>>({});

  useMemo(() => {
    const d: Record<string, Draft> = {};
    for (const m of assigned) {
      d[m.id] = existing.get(m.id) ?? { present: true, hours: 9 };
    }
    setDraft(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, assigned.length]);

  function toggle(id: string) {
    setDraft((s) => ({ ...s, [id]: { ...s[id], present: !s[id]?.present } }));
  }

  function setHours(id: string, hours: number) {
    setDraft((s) => ({ ...s, [id]: { ...s[id], hours } }));
  }

  function setFuel(id: string, fuel: number) {
    setDraft((s) => ({ ...s, [id]: { ...s[id], fuelConsumed: fuel } }));
  }

  function save() {
    if (!project || !user) return;
    const records = assigned.map((m) => ({
      projectId: project.id,
      machineMasterId: m.id,
      date,
      present: draft[m.id]?.present ?? true,
      hours: draft[m.id]?.hours ?? 9,
      fuelConsumed: draft[m.id]?.fuelConsumed,
      recordedBy: user.id,
    }));
    setAttendance(records);
    alert(`${records.length} kayıt güncellendi.`);
  }

  function shift(delta: number) {
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
        title="Makine Puantajı"
        icon={Truck}
        actions={
          <Button variant="accent" onClick={save}>
            Kaydet ({presentCount}/{assigned.length})
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => shift(-1)} className="p-2 rounded-md bg-bg4 hover:bg-bg3 text-text2">
              <ChevronLeft size={14} />
            </button>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44 font-mono" />
            <button onClick={() => shift(1)} className="p-2 rounded-md bg-bg4 hover:bg-bg3 text-text2">
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="green">{presentCount} aktif</Badge>
            <Badge variant="gray">{assigned.length - presentCount} pasif</Badge>
          </div>
        </div>
      </Card>

      {assigned.length === 0 ? (
        <Card>
          <CardTitle>Atanmış makine yok</CardTitle>
          <Link href="/master/machines">
            <Button variant="accent">
              <Cog size={14} /> Master Data&apos;ya git
            </Button>
          </Link>
        </Card>
      ) : (
        <Card>
          <CardTitle>{formatDate(date)} — Makine Puantajı</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {assigned.map((m) => {
              const d = draft[m.id] ?? { present: true, hours: 9 };
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                    d.present ? "bg-purple/5 border-purple/30" : "bg-bg3 border-border opacity-60"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={d.present}
                    onChange={() => toggle(m.id)}
                    className="w-5 h-5 accent-purple"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{m.name}</div>
                    <div className="text-[11px] text-text3 truncate">
                      {m.licensePlate || m.machineType} · {m.company}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-32">
                    <div>
                      <div className="text-[9px] text-text3 uppercase mb-0.5">Saat</div>
                      <input
                        type="number"
                        step="0.5"
                        value={d.hours}
                        onChange={(e) => setHours(m.id, Number(e.target.value) || 0)}
                        disabled={!d.present}
                        className="w-full px-2 py-1 text-xs font-mono bg-bg2 border border-border rounded text-right"
                      />
                    </div>
                    <div>
                      <div className="text-[9px] text-text3 uppercase mb-0.5">Yakıt (L)</div>
                      <input
                        type="number"
                        step="1"
                        value={d.fuelConsumed ?? ""}
                        onChange={(e) => setFuel(m.id, Number(e.target.value) || 0)}
                        disabled={!d.present}
                        className="w-full px-2 py-1 text-xs font-mono bg-bg2 border border-border rounded text-right"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
}

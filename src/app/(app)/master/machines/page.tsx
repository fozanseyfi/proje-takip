"use client";

import { useMemo, useState } from "react";
import { Cog, Plus, Pencil, Trash2, Search, Truck } from "lucide-react";
import { useStore, useCurrentProject, useCurrentUser } from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableWrap, Table, THead, TBody, TR, TH, TD, Empty } from "@/components/ui/table";
import { formatMoney } from "@/lib/utils";
import type { MachineMaster, MachineType, FuelType } from "@/lib/store/types";
import type { Currency } from "@/lib/utils";

export default function MachinesMasterPage() {
  const machines = useStore((s) => s.machinesMaster).filter((m) => !m.deletedAt);
  const project = useCurrentProject();
  const user = useCurrentUser();
  const assignments = useStore((s) => s.machineAssignments);
  const addMachine = useStore((s) => s.addMachine);
  const updateMachine = useStore((s) => s.updateMachine);
  const softDeleteMachine = useStore((s) => s.softDeleteMachine);
  const assignMachine = useStore((s) => s.assignMachine);
  const unassignMachine = useStore((s) => s.unassignMachine);

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<MachineMaster | null>(null);
  const [creating, setCreating] = useState(false);
  const [filterType, setFilterType] = useState<string>("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return machines.filter((m) => {
      if (filterType && m.machineType !== filterType) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.company.toLowerCase().includes(q) ||
        (m.licensePlate || "").toLowerCase().includes(q)
      );
    });
  }, [machines, search, filterType]);

  function isAssigned(id: string) {
    if (!project) return false;
    return assignments.some(
      (a) => a.machineMasterId === id && a.projectId === project.id && !a.assignedTo
    );
  }

  function toggleAssignment(id: string) {
    if (!project) return;
    const ex = assignments.find(
      (a) => a.machineMasterId === id && a.projectId === project.id && !a.assignedTo
    );
    if (ex) {
      unassignMachine(ex.id);
    } else {
      assignMachine({
        projectId: project.id,
        machineMasterId: id,
        assignedFrom: project.reportDate,
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Makine — Master Listesi"
        description={`${machines.length} kayıtlı makine`}
        icon={Cog}
        actions={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus size={14} /> Yeni Makine
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-3">
          <Field label="Ara (isim/firma/plaka)">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </Field>
          <Field label="Tip">
            <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Tümü</option>
              <option value="ekskavator">Ekskavatör</option>
              <option value="kamyon">Kamyon</option>
              <option value="vinc">Vinç</option>
              <option value="forklift">Forklift</option>
              <option value="loder">Loder</option>
              <option value="greyder">Greyder</option>
              <option value="silindir">Silindir</option>
              <option value="jenerator">Jeneratör</option>
              <option value="diger">Diğer</option>
            </Select>
          </Field>
        </div>
      </Card>

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>İsim</TH>
              <TH>Tip</TH>
              <TH>Plaka</TH>
              <TH>Firma</TH>
              <TH>Yakıt</TH>
              <TH className="text-right">Yevmiye</TH>
              <TH>Proje Ataması</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {filtered.length === 0 ? (
              <Empty colSpan={8}>{search ? `"${search}" eşleşmesi yok.` : "Henüz makine eklenmemiş."}</Empty>
            ) : (
              filtered.map((m) => (
                <TR key={m.id}>
                  <TD className="font-medium">{m.name}</TD>
                  <TD>
                    <Badge variant="purple">{m.machineType}</Badge>
                  </TD>
                  <TD className="font-mono text-xs">{m.licensePlate || "—"}</TD>
                  <TD className="text-xs">{m.company}</TD>
                  <TD className="text-xs text-text3">{m.fuelType || "—"}</TD>
                  <TD className="text-right font-mono text-xs">
                    {m.dailyRate ? formatMoney(m.dailyRate, m.dailyRateCurrency || "TRY") : "—"}
                  </TD>
                  <TD>
                    {project ? (
                      <Button
                        size="sm"
                        variant={isAssigned(m.id) ? "accent" : "ghost"}
                        onClick={() => toggleAssignment(m.id)}
                      >
                        <Truck size={12} /> {isAssigned(m.id) ? "Atanmış" : "Ata"}
                      </Button>
                    ) : (
                      <span className="text-text3 text-xs">—</span>
                    )}
                  </TD>
                  <TD>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setEditing(m)} className="p-1 text-text3 hover:text-accent rounded">
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`${m.name} silinsin mi?`)) softDeleteMachine(m.id);
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

      <MachineForm
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(data) => {
          if (!user) return;
          addMachine({ ...data, ownerUserId: user.id });
          setCreating(false);
        }}
      />
      <MachineForm
        open={!!editing}
        initial={editing || undefined}
        onClose={() => setEditing(null)}
        onSubmit={(data) => {
          if (!editing) return;
          updateMachine(editing.id, data);
          setEditing(null);
        }}
      />
    </>
  );
}

function MachineForm({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial?: MachineMaster;
  onClose: () => void;
  onSubmit: (
    data: Omit<MachineMaster, "id" | "ownerUserId" | "createdAt" | "updatedAt" | "deletedAt">
  ) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [machineType, setMachineType] = useState<MachineType>(initial?.machineType ?? "diger");
  const [licensePlate, setLicensePlate] = useState(initial?.licensePlate ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [fuelType, setFuelType] = useState<FuelType | "">(initial?.fuelType ?? "");
  const [dailyRate, setDailyRate] = useState<string>(initial?.dailyRate?.toString() ?? "");
  const [dailyRateCurrency, setDailyRateCurrency] = useState<Currency>(
    initial?.dailyRateCurrency ?? "TRY"
  );
  const [status, setStatus] = useState<"active" | "inactive">(initial?.status ?? "active");

  function submit() {
    if (!name || !company) return;
    onSubmit({
      name,
      machineType,
      licensePlate: licensePlate || undefined,
      company,
      fuelType: (fuelType || undefined) as FuelType | undefined,
      dailyRate: dailyRate ? Number(dailyRate) : undefined,
      dailyRateCurrency: dailyRate ? dailyRateCurrency : undefined,
      status,
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title={initial ? "Makine Düzenle" : "Yeni Makine"} size="md">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="İsim">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Komatsu PC200" />
        </Field>
        <Field label="Tip">
          <Select value={machineType} onChange={(e) => setMachineType(e.target.value as MachineType)}>
            <option value="ekskavator">Ekskavatör</option>
            <option value="kamyon">Kamyon</option>
            <option value="vinc">Vinç</option>
            <option value="forklift">Forklift</option>
            <option value="loder">Loder</option>
            <option value="greyder">Greyder</option>
            <option value="silindir">Silindir</option>
            <option value="jenerator">Jeneratör</option>
            <option value="diger">Diğer</option>
          </Select>
        </Field>
        <Field label="Plaka">
          <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="34 ABC 123" />
        </Field>
        <Field label="Firma">
          <Input value={company} onChange={(e) => setCompany(e.target.value)} />
        </Field>
        <Field label="Yakıt Tipi">
          <Select value={fuelType} onChange={(e) => setFuelType(e.target.value as FuelType)}>
            <option value="">—</option>
            <option value="dizel">Dizel</option>
            <option value="benzin">Benzin</option>
            <option value="elektrik">Elektrik</option>
            <option value="diger">Diğer</option>
          </Select>
        </Field>
        <Field label="Durum">
          <Select value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")}>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </Select>
        </Field>
        <Field label="Günlük Yevmiye" className="sm:col-span-2">
          <div className="flex gap-2">
            <Input
              type="number"
              className="flex-1"
              value={dailyRate}
              onChange={(e) => setDailyRate(e.target.value)}
            />
            <Select
              className="w-24"
              value={dailyRateCurrency}
              onChange={(e) => setDailyRateCurrency(e.target.value as Currency)}
            >
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </Select>
          </div>
        </Field>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>İptal</Button>
        <Button variant="accent" onClick={submit}>Kaydet</Button>
      </DialogFooter>
    </Dialog>
  );
}

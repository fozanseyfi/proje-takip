"use client";

import { useMemo, useState } from "react";
import { UserCog, Plus, Pencil, Trash2, Search, UserPlus } from "lucide-react";
import { useStore, useCurrentProject, useCurrentUser } from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableWrap, Table, THead, TBody, TR, TH, TD, Empty } from "@/components/ui/table";
import { formatMoney } from "@/lib/utils";
import type { PersonnelMaster, Discipline } from "@/lib/store/types";
import type { Currency } from "@/lib/utils";

export default function PersonnelMasterPage() {
  const personnel = useStore((s) => s.personnelMaster).filter((p) => !p.deletedAt);
  const project = useCurrentProject();
  const user = useCurrentUser();
  const assignments = useStore((s) => s.personnelAssignments);
  const addPersonnel = useStore((s) => s.addPersonnel);
  const updatePersonnel = useStore((s) => s.updatePersonnel);
  const softDeletePersonnel = useStore((s) => s.softDeletePersonnel);
  const assignPersonnel = useStore((s) => s.assignPersonnel);
  const unassignPersonnel = useStore((s) => s.unassignPersonnel);

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<PersonnelMaster | null>(null);
  const [creating, setCreating] = useState(false);
  const [filterDiscipline, setFilterDiscipline] = useState<string>("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return personnel.filter((p) => {
      if (filterDiscipline && p.discipline !== filterDiscipline) return false;
      if (!q) return true;
      return (
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q) ||
        (p.tcKimlikNo || "").includes(q)
      );
    });
  }, [personnel, search, filterDiscipline]);

  function isAssigned(personnelId: string) {
    if (!project) return false;
    return assignments.some(
      (a) => a.personnelMasterId === personnelId && a.projectId === project.id && !a.assignedTo
    );
  }

  function toggleAssignment(personnelId: string) {
    if (!project) return;
    const ex = assignments.find(
      (a) => a.personnelMasterId === personnelId && a.projectId === project.id && !a.assignedTo
    );
    if (ex) {
      unassignPersonnel(ex.id);
    } else {
      assignPersonnel({
        projectId: project.id,
        personnelMasterId: personnelId,
        assignedFrom: project.reportDate,
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Personel — Master Listesi"
        description={`${personnel.length} kayıtlı personel · Projeye atamak için satır seç`}
        icon={UserCog}
        actions={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus size={14} /> Yeni Personel
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-3">
          <Field label="Ara (ad/soyad/firma/TC)">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text3 pointer-events-none"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="örn. ahm"
                className="pl-9"
              />
            </div>
          </Field>
          <Field label="Disiplin">
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
        </div>
      </Card>

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>Ad Soyad</TH>
              <TH>TC</TH>
              <TH>Firma</TH>
              <TH>Disiplin</TH>
              <TH>Görev</TH>
              <TH className="text-right">Yevmiye</TH>
              <TH>Proje Ataması</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {filtered.length === 0 ? (
              <Empty colSpan={8}>
                {search ? `"${search}" için eşleşme yok.` : "Henüz personel eklenmemiş."}
                {search && (
                  <button
                    onClick={() => setCreating(true)}
                    className="ml-2 text-accent underline"
                  >
                    + Yeni Personel Ekle: &quot;{search}&quot;
                  </button>
                )}
              </Empty>
            ) : (
              filtered.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <div className="font-medium">
                      {p.firstName} {p.lastName}
                    </div>
                    {p.phone && <div className="text-[11px] text-text3">{p.phone}</div>}
                  </TD>
                  <TD className="font-mono text-xs text-text2">{p.tcKimlikNo || "—"}</TD>
                  <TD className="text-xs">{p.company}</TD>
                  <TD>
                    <Badge variant="blue">{p.discipline}</Badge>
                  </TD>
                  <TD className="text-xs">{p.jobTitle || "—"}</TD>
                  <TD className="text-right font-mono text-xs">
                    {p.dailyRate ? formatMoney(p.dailyRate, p.dailyRateCurrency || "TRY") : "—"}
                  </TD>
                  <TD>
                    {project ? (
                      <Button
                        size="sm"
                        variant={isAssigned(p.id) ? "accent" : "ghost"}
                        onClick={() => toggleAssignment(p.id)}
                      >
                        <UserPlus size={12} /> {isAssigned(p.id) ? "Atanmış" : "Ata"}
                      </Button>
                    ) : (
                      <span className="text-text3 text-xs">Proje seçili değil</span>
                    )}
                  </TD>
                  <TD>
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => setEditing(p)}
                        className="p-1 text-text3 hover:text-accent rounded"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`${p.firstName} ${p.lastName} silinsin mi?`)) softDeletePersonnel(p.id);
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

      <PersonnelForm
        open={creating}
        defaultFirstName={search}
        onClose={() => {
          setCreating(false);
          setSearch("");
        }}
        onSubmit={(data) => {
          if (!user) return;
          addPersonnel({ ...data, ownerUserId: user.id });
          setCreating(false);
        }}
      />
      <PersonnelForm
        open={!!editing}
        initial={editing || undefined}
        onClose={() => setEditing(null)}
        onSubmit={(data) => {
          if (!editing) return;
          updatePersonnel(editing.id, data);
          setEditing(null);
        }}
      />
    </>
  );
}

function PersonnelForm({
  open,
  initial,
  defaultFirstName,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial?: PersonnelMaster;
  defaultFirstName?: string;
  onClose: () => void;
  onSubmit: (
    data: Omit<PersonnelMaster, "id" | "ownerUserId" | "createdAt" | "updatedAt" | "deletedAt">
  ) => void;
}) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? defaultFirstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [tcKimlikNo, setTcKimlikNo] = useState(initial?.tcKimlikNo ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [discipline, setDiscipline] = useState<Discipline>(initial?.discipline ?? "diger");
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [dailyRate, setDailyRate] = useState<string>(initial?.dailyRate?.toString() ?? "");
  const [dailyRateCurrency, setDailyRateCurrency] = useState<Currency>(
    initial?.dailyRateCurrency ?? "TRY"
  );
  const [status, setStatus] = useState<"active" | "inactive">(initial?.status ?? "active");

  function submit() {
    if (!firstName || !lastName || !company) return;
    onSubmit({
      firstName,
      lastName,
      tcKimlikNo: tcKimlikNo || undefined,
      company,
      discipline,
      jobTitle: jobTitle || undefined,
      phone: phone || undefined,
      dailyRate: dailyRate ? Number(dailyRate) : undefined,
      dailyRateCurrency: dailyRate ? dailyRateCurrency : undefined,
      status,
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title={initial ? "Personel Düzenle" : "Yeni Personel"} size="md">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Ad">
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <Field label="Soyad">
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </Field>
        <Field label="TC Kimlik No" hint="11 haneli">
          <Input
            value={tcKimlikNo}
            onChange={(e) => setTcKimlikNo(e.target.value.replace(/\D/g, "").slice(0, 11))}
            inputMode="numeric"
          />
        </Field>
        <Field label="Şirket">
          <Input value={company} onChange={(e) => setCompany(e.target.value)} />
        </Field>
        <Field label="Disiplin">
          <Select value={discipline} onChange={(e) => setDiscipline(e.target.value as Discipline)}>
            <option value="mekanik">Mekanik</option>
            <option value="elektrik">Elektrik</option>
            <option value="insaat">İnşaat</option>
            <option value="muhendislik">Mühendislik</option>
            <option value="idari">İdari</option>
            <option value="diger">Diğer</option>
          </Select>
        </Field>
        <Field label="Görev">
          <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Kaynakçı, Usta..." />
        </Field>
        <Field label="Telefon">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Günlük Yevmiye">
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
        <Field label="Durum">
          <Select value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")}>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </Select>
        </Field>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>İptal</Button>
        <Button variant="accent" onClick={submit}>Kaydet</Button>
      </DialogFooter>
    </Dialog>
  );
}

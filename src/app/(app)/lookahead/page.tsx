"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Plus, Trash2, CheckCircle2, FileDown } from "lucide-react";
import { useStore, useCurrentProject } from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { confirmAction } from "@/components/ui/confirm";
import { formatDate, toISODate, cn, addDays, daysBetween } from "@/lib/utils";
import type { Priority, LookaheadKind, LookaheadItem } from "@/lib/store/types";
import { useToast } from "@/components/ui/toast";

const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  critical: "Kritik",
};

const PRIORITY_VARIANT: Record<Priority, "gray" | "blue" | "yellow" | "red"> = {
  low: "gray",
  medium: "blue",
  high: "yellow",
  critical: "red",
};

const KIND_LABEL: Record<LookaheadKind, string> = {
  kritik_is: "Kritik İş",
  claim:     "Claim",
  tutanak:   "Tutanak",
  yazisma:   "Yazışma",
  ihbar:     "İhbar",
};

const KIND_STYLES: Record<LookaheadKind, { bg: string; text: string; border: string }> = {
  kritik_is: { bg: "bg-red/10",    text: "text-red",    border: "border-red/30" },
  claim:     { bg: "bg-purple/10", text: "text-purple", border: "border-purple/30" },
  tutanak:   { bg: "bg-blue/10",   text: "text-blue",   border: "border-blue/30" },
  yazisma:   { bg: "bg-accent/10", text: "text-accent", border: "border-accent/30" },
  ihbar:     { bg: "bg-yellow/10", text: "text-yellow", border: "border-yellow/30" },
};

export default function LookaheadPage() {
  const project = useCurrentProject();
  const items = useStore((s) => s.lookahead).filter((l) => l.projectId === project?.id);
  const add = useStore((s) => s.addLookahead);
  const del = useStore((s) => s.deleteLookahead);
  const toggle = useStore((s) => s.toggleLookaheadDone);

  const [creating, setCreating] = useState(false);
  const [filterKind, setFilterKind] = useState<LookaheadKind | "">("");

  const matchesKind = (it: typeof items[number]) =>
    !filterKind || (it.kind ?? "kritik_is") === filterKind;

  const activeItems = useMemo(
    () =>
      items
        .filter((i) => !i.done)
        .filter(matchesKind)
        .sort((a, b) => a.date.localeCompare(b.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, filterKind]
  );
  const doneItems = useMemo(
    () =>
      items
        .filter((i) => i.done)
        .filter(matchesKind)
        .sort((a, b) => b.date.localeCompare(a.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, filterKind]
  );

  const kindCounts = useMemo(() => {
    const c: Record<LookaheadKind, number> = { kritik_is: 0, claim: 0, tutanak: 0, yazisma: 0, ihbar: 0 };
    for (const i of items.filter((x) => !x.done)) {
      const k = (i.kind ?? "kritik_is") as LookaheadKind;
      c[k]++;
    }
    return c;
  }, [items]);

  const today = toISODate(new Date());
  const toast = useToast((s) => s.push);

  async function downloadWord(it: LookaheadItem) {
    if (!project) return;
    try {
      const { downloadTutanakDocx } = await import("@/lib/docx/tutanak");
      await downloadTutanakDocx(project, it);
    } catch (err) {
      console.error(err);
      toast("Word tutanağı oluşturulamadı", "error");
    }
  }

  if (!project)
    return (
      <Card>
        <CardTitle>Proje Yok</CardTitle>
      </Card>
    );

  return (
    <>
      <PageHeader
        title="Kritik İşler · Tutanak · Claim"
        description="15 günlük yakın takip — kritik iş kalemleri, tutanaklar, claim, yazışma, ihbar"
        icon={AlertTriangle}
        actions={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus size={14} /> Yeni Kayıt
          </Button>
        }
      />

      {/* Tip filtreleri */}
      <div className="flex flex-wrap gap-2 mb-4">
        <KindFilterChip
          active={filterKind === ""}
          onClick={() => setFilterKind("")}
          label="Tümü"
          count={items.filter((i) => !i.done).length}
          colors={{ bg: "bg-bg2", text: "text-text", border: "border-border" }}
        />
        {(Object.keys(KIND_LABEL) as LookaheadKind[]).map((k) => (
          <KindFilterChip
            key={k}
            active={filterKind === k}
            onClick={() => setFilterKind(k)}
            label={KIND_LABEL[k]}
            count={kindCounts[k]}
            colors={KIND_STYLES[k]}
          />
        ))}
      </div>

      {activeItems.length === 0 && doneItems.length === 0 ? (
        <Card>
          <CardTitle>Kayıt yok</CardTitle>
          <p className="text-sm text-text2">Yeni kayıt eklemek için yukarıdaki butonu kullan.</p>
        </Card>
      ) : (
        <>
          {/* AKTİF */}
          {activeItems.length === 0 ? (
            <Card className="!py-6 text-center text-text3 text-sm mb-4">
              Aktif kayıt yok 🎉 — kapanan konuları aşağıdan görebilirsiniz.
            </Card>
          ) : (
            <ItemsTable
              items={activeItems}
              done={false}
              today={today}
              onToggle={toggle}
              onWord={downloadWord}
              onDelete={async (id) => {
                if (await confirmAction({ title: "Kayıt silinsin mi?", message: "Bu kritik iş / tutanak kaydı silinecek.", danger: true, confirmText: "Sil" })) {
                  del(id);
                }
              }}
            />
          )}

          {/* KAPANAN KONULAR — collapsible */}
          {doneItems.length > 0 && (
            <details className="group rounded-xl border border-border bg-bg2/40 mb-4">
              <summary className="cursor-pointer px-5 py-3 list-none flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green" />
                <span className="font-display text-sm font-bold text-text">Kapanan Konular</span>
                <Badge variant="green">{doneItems.length}</Badge>
                <span className="text-[10px] text-text3 ml-2">arşiv · işareti kaldır ile aktife döner</span>
                <span className="ml-auto text-text3 transition-transform group-open:rotate-180">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </summary>
              <div className="border-t border-border bg-white">
                <ItemsTable
                  items={doneItems}
                  done
                  today={today}
                  onToggle={toggle}
                  onWord={downloadWord}
                  onDelete={async (id) => {
                    if (await confirmAction({ title: "Kalıcı silme", message: "Bu kayıt kalıcı olarak silinecek, geri yüklenemez.", danger: true, confirmText: "Kalıcı Sil" })) {
                      del(id);
                    }
                  }}
                />
              </div>
            </details>
          )}
        </>
      )}

      {items.some((i) => !i.done && daysBetween(today, i.date) < 0) && (
        <Alert variant="error" className="mt-4">
          Gecikmiş işler var. Hızlıca güncelleme yap.
        </Alert>
      )}

      <CreateDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(data) => {
          add({ ...data, projectId: project.id, done: false });
          setCreating(false);
        }}
      />
    </>
  );
}

function ItemsTable({
  items,
  done,
  today,
  onToggle,
  onWord,
  onDelete,
}: {
  items: LookaheadItem[];
  done: boolean;
  today: string;
  onToggle: (id: string) => void;
  onWord: (it: LookaheadItem) => void;
  onDelete: (id: string) => void;
}) {
  const th = "px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-text3 whitespace-nowrap";
  const td = "px-3 py-2.5 align-top";
  return (
    <div className={cn("overflow-x-auto bg-white", !done && "rounded-xl border border-border mb-6")}>
      <table className="w-full text-sm">
        <thead className="bg-bg2/60 border-b border-border">
          <tr>
            <th className={cn(th, "w-10")} aria-label="Durum" />
            <th className={th}>Tip</th>
            <th className={cn(th, "min-w-[260px]")}>Konu</th>
            <th className={th}>Tarih</th>
            {!done && <th className={th}>Kalan</th>}
            <th className={th}>Öncelik</th>
            <th className={th}>Sorumlu</th>
            <th className={cn(th, "text-right")}>Tutanak</th>
            <th className={cn(th, "w-10")} aria-label="Sil" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((it) => {
            const kind = (it.kind ?? "kritik_is") as LookaheadKind;
            const ks = KIND_STYLES[kind];
            const daysLeft = daysBetween(today, it.date);
            return (
              <tr key={it.id} className="hover:bg-bg2/40">
                <td className={td}>
                  <button
                    onClick={() => onToggle(it.id)}
                    className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                      done ? "bg-green border-green" : "border-text3 hover:border-accent hover:bg-accent/10"
                    )}
                    title={done ? "Aktife döndür" : "Tamamlandı olarak işaretle"}
                  >
                    {done && <CheckCircle2 size={12} className="text-white" />}
                  </button>
                </td>
                <td className={td}>
                  <span className={cn("text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded whitespace-nowrap", ks.bg, ks.text)}>
                    {KIND_LABEL[kind]}
                  </span>
                </td>
                <td className={td}>
                  <div className={cn("font-medium", done ? "text-text2 line-through" : "text-text")}>{it.task}</div>
                  {it.notes && <div className="text-xs text-text3 mt-0.5 whitespace-pre-line">{it.notes}</div>}
                </td>
                <td className={cn(td, "font-mono text-xs whitespace-nowrap")}>{formatDate(it.date)}</td>
                {!done && (
                  <td
                    className={cn(
                      td,
                      "text-xs whitespace-nowrap",
                      daysLeft < 0 ? "text-red font-semibold" : daysLeft <= 3 ? "text-yellow" : "text-text3"
                    )}
                  >
                    {daysLeft < 0 ? `${-daysLeft} gün gecikme` : `${daysLeft} gün`}
                  </td>
                )}
                <td className={td}>
                  <Badge variant={PRIORITY_VARIANT[it.priority]}>{PRIORITY_LABEL[it.priority]}</Badge>
                </td>
                <td className={cn(td, "text-xs text-text2 whitespace-nowrap")}>{it.owner ?? "—"}</td>
                <td className={cn(td, "text-right")}>
                  <Button variant="outline" size="sm" onClick={() => onWord(it)} title="İmzaya hazır Word tutanağı indir">
                    <FileDown size={13} /> Word
                  </Button>
                </td>
                <td className={td}>
                  <button
                    onClick={() => onDelete(it.id)}
                    className="p-1.5 text-text3 hover:text-red rounded"
                    title={done ? "Kalıcı sil" : "Sil"}
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function KindFilterChip({
  active,
  onClick,
  label,
  count,
  colors,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  colors: { bg: string; text: string; border: string };
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-semibold transition-all border",
        active ? [colors.bg, colors.text, colors.border, "shadow-soft"] : "bg-white border-border text-text2 hover:text-text"
      )}
    >
      {label}
      <span className={cn("inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-md text-[10px] font-bold tabular-nums",
        active ? colors.bg : "bg-bg3")}>
        {count}
      </span>
    </button>
  );
}

function CreateDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { task: string; date: string; priority: Priority; owner?: string; notes?: string; kind: LookaheadKind }) => void;
}) {
  const personnel = useStore((s) => s.personnelMaster).filter((p) => !p.deletedAt);
  const addPersonnel = useStore((s) => s.addPersonnel);
  const currentUser = useStore((s) => s.users.find((u) => u.id === s.currentUserId));

  const [task, setTask] = useState("");
  const [date, setDate] = useState(toISODate(addDays(new Date(), 7)));
  const [priority, setPriority] = useState<Priority>("medium");
  const [kind, setKind] = useState<LookaheadKind>("kritik_is");
  const [ownerId, setOwnerId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Hızlı personel ekleme form state
  const [qFirstName, setQFirstName] = useState("");
  const [qLastName, setQLastName] = useState("");
  const [qCompany, setQCompany] = useState("");
  const [qJobTitle, setQJobTitle] = useState("");
  const [qPhone, setQPhone] = useState("");
  const [qDiscipline, setQDiscipline] = useState<"mekanik" | "elektrik" | "insaat" | "muhendislik" | "idari" | "diger">("muhendislik");

  function quickAdd() {
    if (!qFirstName || !qLastName || !qCompany || !currentUser) {
      alert("Ad, soyad ve firma zorunlu");
      return;
    }
    const p = addPersonnel({
      ownerUserId: currentUser.id,
      firstName: qFirstName,
      lastName: qLastName,
      company: qCompany,
      jobTitle: qJobTitle || undefined,
      phone: qPhone || undefined,
      discipline: qDiscipline,
      status: "active",
    });
    setOwnerId(p.id);
    setShowQuickAdd(false);
    setQFirstName("");
    setQLastName("");
    setQCompany("");
    setQJobTitle("");
    setQPhone("");
  }

  const selectedPerson = personnel.find((p) => p.id === ownerId);
  const ownerName = selectedPerson ? `${selectedPerson.firstName} ${selectedPerson.lastName}` : undefined;

  return (
    <Dialog open={open} onClose={onClose} title="Yeni Kayıt" size="md">
      <div className="space-y-3">
        <Field label="Tip">
          <div className="grid grid-cols-5 gap-1.5">
            {(Object.keys(KIND_LABEL) as LookaheadKind[]).map((k) => {
              const ks = KIND_STYLES[k];
              const active = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "h-10 rounded-lg text-xs font-bold transition-all border",
                    active ? [ks.bg, ks.text, ks.border, "shadow-soft"] : "bg-white border-border text-text3 hover:text-text"
                  )}
                >
                  {KIND_LABEL[k]}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label={kind === "kritik_is" ? "İş Tanımı" : kind === "claim" ? "Claim Konusu" : kind === "tutanak" ? "Tutanak Konusu" : kind === "yazisma" ? "Yazışma Konusu" : "İhbar Konusu"}>
          <Input value={task} onChange={(e) => setTask(e.target.value)} placeholder={kind === "kritik_is" ? "örn. Trafo teslimi" : "Konu / başlık"} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tarih">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Öncelik">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
              <option value="critical">Kritik</option>
            </Select>
          </Field>
        </div>

        <Field label="Sorumlu Personel">
          <div className="flex gap-2">
            <Select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="flex-1"
            >
              <option value="">— Sorumlu seç —</option>
              {personnel
                .sort((a, b) =>
                  `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "tr")
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} — {p.company}
                    {p.jobTitle ? ` (${p.jobTitle})` : ""}
                  </option>
                ))}
            </Select>
            <Button
              variant="soft"
              onClick={() => setShowQuickAdd(true)}
              type="button"
              title="Listede yoksa hızlıca ekle"
            >
              <Plus size={14} /> Ekle
            </Button>
          </div>
        </Field>

        {showQuickAdd && (
          <div className="rounded-xl border-2 border-accent/30 bg-accent/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-accent">Hızlı Personel Ekle</div>
              <button
                onClick={() => setShowQuickAdd(false)}
                className="text-xs text-text3 hover:text-text"
              >
                İptal
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Ad *">
                <Input value={qFirstName} onChange={(e) => setQFirstName(e.target.value)} />
              </Field>
              <Field label="Soyad *">
                <Input value={qLastName} onChange={(e) => setQLastName(e.target.value)} />
              </Field>
              <Field label="Firma *">
                <Input value={qCompany} onChange={(e) => setQCompany(e.target.value)} />
              </Field>
              <Field label="Disiplin">
                <Select
                  value={qDiscipline}
                  onChange={(e) => setQDiscipline(e.target.value as typeof qDiscipline)}
                >
                  <option value="muhendislik">Mühendislik</option>
                  <option value="elektrik">Elektrik</option>
                  <option value="mekanik">Mekanik</option>
                  <option value="insaat">İnşaat</option>
                  <option value="idari">İdari</option>
                  <option value="diger">Diğer</option>
                </Select>
              </Field>
              <Field label="Görev">
                <Input value={qJobTitle} onChange={(e) => setQJobTitle(e.target.value)} placeholder="Şantiye Şefi, ..." />
              </Field>
              <Field label="Telefon">
                <Input value={qPhone} onChange={(e) => setQPhone(e.target.value)} placeholder="0532..." />
              </Field>
            </div>
            <Button variant="accent" onClick={quickAdd} size="sm" className="w-full">
              <Plus size={14} /> Personel Oluştur ve Sorumlu Yap
            </Button>
          </div>
        )}

        <Field label="Notlar">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>İptal</Button>
        <Button
          variant="accent"
          onClick={() =>
            onSubmit({
              task,
              date,
              priority,
              owner: ownerName,
              notes: notes || undefined,
              kind,
            })
          }
        >
          Ekle
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

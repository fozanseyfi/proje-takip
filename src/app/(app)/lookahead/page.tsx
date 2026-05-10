"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useStore, useCurrentProject } from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatDate, toISODate, cn, addDays, daysBetween } from "@/lib/utils";
import type { Priority } from "@/lib/store/types";

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

export default function LookaheadPage() {
  const project = useCurrentProject();
  const items = useStore((s) => s.lookahead).filter((l) => l.projectId === project?.id);
  const add = useStore((s) => s.addLookahead);
  const del = useStore((s) => s.deleteLookahead);
  const toggle = useStore((s) => s.toggleLookaheadDone);

  const [creating, setCreating] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const filtered = useMemo(() => {
    return items
      .filter((i) => showDone || !i.done)
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return a.date.localeCompare(b.date);
      });
  }, [items, showDone]);

  const today = toISODate(new Date());

  if (!project)
    return (
      <Card>
        <CardTitle>Proje Yok</CardTitle>
      </Card>
    );

  return (
    <>
      <PageHeader
        title="15-Gün Kritik İşler"
        description={`Lookahead — gelecek 15 günün kritik aksiyonları`}
        icon={AlertTriangle}
        actions={
          <>
            <label className="flex items-center gap-2 text-xs text-text2">
              <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
              Tamamlananlar
            </label>
            <Button variant="accent" onClick={() => setCreating(true)}>
              <Plus size={14} /> Yeni İş
            </Button>
          </>
        }
      />

      {filtered.length === 0 ? (
        <Card>
          <CardTitle>İş yok</CardTitle>
          <p className="text-sm text-text2">Yeni iş eklemek için yukarıdaki butonu kullan.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((it) => {
            const daysLeft = daysBetween(today, it.date);
            const overdue = daysLeft < 0 && !it.done;
            return (
              <Card
                key={it.id}
                className={cn(
                  "!p-3 flex items-start gap-3 transition-all",
                  it.done && "opacity-50",
                  overdue && "border-red/40"
                )}
              >
                <button
                  onClick={() => toggle(it.id)}
                  className={cn(
                    "mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                    it.done
                      ? "bg-green border-green"
                      : "border-text3 hover:border-accent hover:bg-accent/10"
                  )}
                >
                  {it.done && <CheckCircle2 size={12} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={cn("font-medium text-text", it.done && "line-through text-text3")}>
                    {it.task}
                  </div>
                  {it.notes && <div className="text-xs text-text3 mt-0.5">{it.notes}</div>}
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    <Badge variant={PRIORITY_VARIANT[it.priority]}>{PRIORITY_LABEL[it.priority]}</Badge>
                    <span className="text-text3">
                      📅 {formatDate(it.date)}{" "}
                      {!it.done && (
                        <span
                          className={cn(
                            "ml-1",
                            daysLeft < 0 ? "text-red" : daysLeft <= 3 ? "text-yellow" : "text-text3"
                          )}
                        >
                          ({daysLeft < 0 ? `${-daysLeft} gün gecikme` : `${daysLeft} gün`})
                        </span>
                      )}
                    </span>
                    {it.owner && <span className="text-text3">👤 {it.owner}</span>}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm("Silinsin mi?")) del(it.id);
                  }}
                  className="p-1.5 text-text3 hover:text-red rounded"
                >
                  <Trash2 size={12} />
                </button>
              </Card>
            );
          })}
        </div>
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

function CreateDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { task: string; date: string; priority: Priority; owner?: string; notes?: string }) => void;
}) {
  const [task, setTask] = useState("");
  const [date, setDate] = useState(toISODate(addDays(new Date(), 7)));
  const [priority, setPriority] = useState<Priority>("medium");
  const [owner, setOwner] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <Dialog open={open} onClose={onClose} title="Yeni Kritik İş" size="sm">
      <div className="space-y-3">
        <Field label="İş Tanımı">
          <Input value={task} onChange={(e) => setTask(e.target.value)} placeholder="örn. Trafo teslimi" />
        </Field>
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
        <Field label="Sorumlu">
          <Input value={owner} onChange={(e) => setOwner(e.target.value)} />
        </Field>
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
              owner: owner || undefined,
              notes: notes || undefined,
            })
          }
        >
          Ekle
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

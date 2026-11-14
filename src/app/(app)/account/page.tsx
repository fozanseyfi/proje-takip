"use client";

import { useEffect, useState } from "react";
import {
  User as UserIcon,
  Save,
  Building2,
  Shield,
  KeyRound,
  Mail,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { useStore, useCurrentUser, usePanelName } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";

export default function AccountPage() {
  const user = useCurrentUser();
  const updateUser = useStore((s) => s.updateCurrentUser);
  const storedPanelName = useStore((s) => s.panelName);
  const setPanelName = useStore((s) => s.setPanelName);
  const effectivePanelName = usePanelName(); // boşsa otomatik fullName döner
  const toast = useToast((s) => s.push);

  const [fullName, setFullName] = useState("");
  const [panel, setPanel] = useState("");
  const [pwd, setPwd] = useState({ current: "", next: "", repeat: "" });

  useEffect(() => {
    if (user) setFullName(user.fullName);
  }, [user?.id, user?.fullName]);

  useEffect(() => {
    setPanel(storedPanelName);
  }, [storedPanelName]);

  if (!user) {
    return (
      <Card>
        <div className="text-sm text-text2">Kullanıcı bilgisi bulunamadı.</div>
      </Card>
    );
  }

  function saveProfile() {
    updateUser({ fullName: fullName.trim() });
    toast("Profil bilgileri kaydedildi.", "success");
  }

  function savePanel() {
    setPanelName(panel.trim());
    toast("Panel adı güncellendi.", "success");
  }

  function savePassword() {
    if (!pwd.current) return toast("Mevcut şifreyi girin.", "error");
    if (pwd.next.length < 8) return toast("Yeni şifre en az 8 karakter olmalı.", "error");
    if (pwd.next !== pwd.repeat) return toast("Yeni şifre ile tekrar eşleşmiyor.", "error");
    // Local-mod: gerçek şifre kontrolü yok; sadece simülasyon
    setPwd({ current: "", next: "", repeat: "" });
    toast("Şifre güncellendi (lokal mod).", "success");
  }

  const initials = (user.fullName || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {/* Kimlik şeridi */}
      <section className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border border-border bg-gradient-to-b from-white to-bg2 px-6 py-5">
        <div className="flex min-w-0 basis-full items-center gap-4 sm:basis-0 sm:flex-1">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-extrabold text-white"
            style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)" }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-text3">Profilim</p>
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-extrabold tracking-tight text-text">
              <span className="truncate">{user.fullName}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                <Shield className="size-3" /> {user.isSuperAdmin ? "Yönetici" : "Kullanıcı"}
              </span>
            </h1>
            <p className="truncate text-[13px] text-text2">{user.email}</p>
          </div>
        </div>
        <dl className="flex gap-6 text-xs">
          <div>
            <dt className="text-text3">Şirket / Panel</dt>
            <dd className="font-semibold text-text">{effectivePanelName || "—"}</dd>
          </div>
          <div>
            <dt className="text-text3">Üyelik</dt>
            <dd className="font-semibold text-text">{formatDate(user.createdAt)}</dd>
          </div>
        </dl>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {/* Profil + panel adı */}
        <Panel icon={UserIcon} title="Profil" desc="Görünen adınız ve topbar'da görünen şirket / panel adı.">
          <div className="space-y-3.5">
            <div>
              <Label className="!mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text3">Ad Soyad</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Adınız Soyadınız" />
            </div>
            <div>
              <Label className="!mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text3">E-posta</Label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                <Input value={user.email} readOnly disabled className="pl-9 cursor-not-allowed bg-bg2" />
              </div>
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-text3">
                <Lock className="size-3" />
                Değiştirmek için iletişime geçin.
              </p>
            </div>
            <div className="flex justify-end">
              <Button variant="accent" onClick={saveProfile}>
                <Save className="size-4" />
                Kaydet
              </Button>
            </div>
          </div>
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <Label className="!mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text3">Şirket / Panel Adı</Label>
            <Input
              value={panel}
              onChange={(e) => setPanel(e.target.value)}
              placeholder={user.fullName ? `Otomatik: ${user.fullName}` : "Şirket / panel adı"}
            />
            <div className="text-[11px] text-text3">
              Şu an gösterilen: <strong className="font-semibold text-text">{effectivePanelName || "—"}</strong>
              {!storedPanelName.trim() && (
                <span className="ml-1.5 inline-flex items-center rounded bg-accent/10 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider text-accent">
                  Otomatik
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              {storedPanelName.trim() && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setPanelName("");
                    setPanel("");
                    toast("Otomatik (ad-soyad) kullanılıyor.", "info");
                  }}
                >
                  Varsayılana döndür
                </Button>
              )}
              <Button variant="accent" onClick={savePanel}>
                <Building2 className="size-4" />
                Panel adını kaydet
              </Button>
            </div>
          </div>
        </Panel>

        {/* Şifre */}
        <Panel icon={KeyRound} title="Şifre" desc="Mevcut şifrenizle onaylayıp yenisini belirleyin.">
          <div className="space-y-3.5">
            <div>
              <Label className="!mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text3">Mevcut Şifre</Label>
              <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                  <Input type="password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} className="pl-9" placeholder="••••••••" />
                </div>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <Label className="!mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text3">Yeni Şifre</Label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                  <Input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} className="pl-9" placeholder="En az 8 karakter" />
                </div>
              </div>
              <div>
                <Label className="!mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text3">Yeni Şifre (Tekrar)</Label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                  <Input type="password" value={pwd.repeat} onChange={(e) => setPwd({ ...pwd, repeat: e.target.value })} className="pl-9" placeholder="Tekrar yazın" />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-text3">
                <ShieldAlert className="size-3.5 text-yellow" />
                Mevcut oturumlar bozulmaz.
              </span>
              <Button variant="accent" onClick={savePassword}>
                <KeyRound className="size-4" />
                Şifreyi güncelle
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-white">
      <div className="flex items-start gap-3 border-b border-border px-5 py-3.5">
        <Icon className="mt-0.5 size-4 text-text3" />
        <div>
          <h2 className="text-sm font-bold text-text">{title}</h2>
          <p className="text-xs text-text2">{desc}</p>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

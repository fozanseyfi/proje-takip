"use client";

import { useEffect, useState } from "react";
import { User as UserIcon, Save } from "lucide-react";
import { useStore, useCurrentUser } from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatDate } from "@/lib/utils";

export default function AccountPage() {
  const user = useCurrentUser();
  const resetAll = useStore((s) => s.resetAll);

  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });

  useEffect(() => {
    if (user) setForm({ fullName: user.fullName, email: user.email, phone: user.phone ?? "" });
  }, [user?.id]);

  if (!user)
    return (
      <Card>
        <CardTitle>Kullanıcı Yok</CardTitle>
      </Card>
    );

  return (
    <>
      <PageHeader title="Hesabım" icon={UserIcon} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Profil</CardTitle>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-bg3">
              <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                <UserIcon size={20} />
              </div>
              <div>
                <div className="font-medium">{user.fullName}</div>
                <div className="text-xs text-text3">{user.email}</div>
                {user.isSuperAdmin && (
                  <Badge variant="purple" className="mt-1">
                    Süper Admin
                  </Badge>
                )}
              </div>
            </div>
            <Field label="Ad Soyad">
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </Field>
            <Field label="E-posta">
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Telefon">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Kayıt Tarihi">
              <Input value={formatDate(user.createdAt)} readOnly />
            </Field>
            <Button variant="accent">
              <Save size={14} /> Kaydet
            </Button>
          </div>
        </Card>

        <Card>
          <CardTitle>Lokal Veri</CardTitle>
          <Alert variant="warning" className="mb-3">
            Bu sürüm tüm verileri localStorage&apos;da tutar. Supabase entegrasyonu sonrası bulut tabanlı olacak.
          </Alert>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm("Tüm lokal veri silinsin mi? Bu işlem geri alınamaz.")) {
                resetAll();
                window.location.reload();
              }
            }}
          >
            Tüm Veriyi Sıfırla
          </Button>
        </Card>
      </div>
    </>
  );
}

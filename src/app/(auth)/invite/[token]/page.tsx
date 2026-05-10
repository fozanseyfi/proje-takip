"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function InviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const invitations = useStore((s) => s.invitations);
  const projects = useStore((s) => s.projects);
  const acceptInvitation = useStore((s) => s.acceptInvitation);
  const addUser = useStore((s) => s.addUser);
  const setCurrentUser = useStore((s) => s.setCurrentUser);

  const inv = useMemo(() => invitations.find((i) => i.token === token), [invitations, token]);
  const project = projects.find((p) => p.id === inv?.projectId);

  if (!inv) {
    return (
      <div className="w-full max-w-md rounded-xl bg-bg3/95 border border-border2 p-7">
        <Alert variant="error">
          Davet bulunamadı. Link geçersiz veya iptal edilmiş olabilir.
        </Alert>
        <Link href="/login" className="block text-center mt-4 text-accent text-sm underline">
          Girişe dön
        </Link>
      </div>
    );
  }

  if (inv.acceptedAt) {
    return (
      <div className="w-full max-w-md rounded-xl bg-bg3/95 border border-border2 p-7 text-center">
        <CheckCircle2 size={36} className="mx-auto text-green mb-3" />
        <h1 className="font-display text-xl font-bold">Davet kabul edilmiş</h1>
        <p className="text-sm text-text3 mt-2">Bu davet zaten kullanılmış.</p>
        <Link href="/login" className="block mt-4 text-accent text-sm underline">
          Girişe git
        </Link>
      </div>
    );
  }

  function accept(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const fullName = fd.get("name") as string;
    if (!fullName) return;
    const newUser = addUser({
      email: inv!.email,
      fullName,
      isSuperAdmin: false,
    });
    setCurrentUser(newUser.id);
    acceptInvitation(token, newUser.id);
    router.push("/dashboard");
  }

  return (
    <div className="w-full max-w-md rounded-xl bg-bg3/95 border border-border2 p-7">
      <div className="text-center mb-5">
        <Mail size={36} className="mx-auto text-accent mb-2" />
        <h1 className="font-display text-xl font-bold">Davet Kabul</h1>
        <p className="text-sm text-text3 mt-1">
          <strong>{project?.name}</strong> projesine davet edildin.
        </p>
        <div className="mt-3">
          <Badge variant="accent">{inv.role}</Badge>
        </div>
      </div>

      <Alert variant="info" className="mb-4 text-xs">
        Lokal mod: Hesabını oluşturmak için sadece adını gir.
      </Alert>

      <form onSubmit={accept} className="space-y-3">
        <Field label="E-posta">
          <Input value={inv.email} readOnly className="opacity-70" />
        </Field>
        <Field label="Ad Soyad">
          <Input name="name" placeholder="Adın Soyadın" required autoFocus />
        </Field>
        <Field label="Şifre (lokal modda kullanılmaz)">
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
            <Input type="password" className="pl-9" placeholder="••••••••" />
          </div>
        </Field>
        <Button variant="accent" className="w-full mt-2" type="submit">
          Daveti Kabul Et <ArrowRight size={14} />
        </Button>
      </form>
    </div>
  );
}

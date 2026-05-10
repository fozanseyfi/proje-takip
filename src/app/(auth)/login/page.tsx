"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // Lokal sürümde her zaman dashboard'a yönlendir
    router.push("/dashboard");
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-[4px] text-accent text-glow-cyan">
          GES TAKİP
        </h1>
        <p className="text-text3 text-sm mt-2">Güneş Enerjisi Santrali Proje Yönetimi</p>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-bg3/95 to-bg2/95 border border-border2 p-7 shadow-2xl">
        <h2 className="font-display text-xl font-bold mb-1">Giriş</h2>
        <p className="text-xs text-text3 mb-5">Hesabınla devam et</p>

        <Alert variant="info" className="mb-5 text-xs">
          <strong>Lokal mod:</strong> Auth iskelet aşamasında. Herhangi bir e-posta/şifre ile giriş yapabilirsin.
        </Alert>

        <form onSubmit={submit} className="space-y-3">
          <Field label="E-posta">
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
              <Input type="email" defaultValue="ozan.seyfi@kontrolmatik.com" className="pl-9" />
            </div>
          </Field>
          <Field label="Şifre">
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
              <Input type="password" defaultValue="demo" className="pl-9" />
            </div>
          </Field>
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-text2">
              <input type="checkbox" className="accent-accent" />
              Beni hatırla
            </label>
            <Link href="/forgot-password" className="text-accent hover:underline">
              Şifremi unuttum
            </Link>
          </div>
          <Button variant="accent" className="w-full" size="lg" type="submit">
            Giriş Yap <ArrowRight size={14} />
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] text-text3 uppercase tracking-wider">veya</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="space-y-2">
          <Button variant="ghost" className="w-full" type="button">
            <span className="inline-block w-4 h-4 bg-white rounded-sm" /> Google ile Giriş
          </Button>
          <Button variant="ghost" className="w-full" type="button">
            <span className="inline-block w-4 h-4 bg-blue rounded-sm" /> Microsoft ile Giriş
          </Button>
        </div>

        <p className="text-xs text-text3 mt-6 text-center">
          Hesabın yok mu? Sadece davet ile katılabilirsin.
        </p>
      </div>
    </div>
  );
}

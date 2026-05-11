"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, ShieldCheck, BarChart3, Smartphone, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Logo } from "@/components/brand/logo";

export default function LoginPage() {
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push("/dashboard");
  }

  return (
    <div className="w-full max-w-5xl grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-16 items-center animate-fade-in">
      {/* Brand side */}
      <div className="hidden lg:flex flex-col gap-6">
        <Logo size={44} textClassName="text-xl" />
        <h1 className="font-display text-[44px] xl:text-5xl font-extrabold text-text leading-[1.05] tracking-tight">
          GES projelerini <br />
          <span className="text-shimmer">tek platformda</span> yönet.
        </h1>
        <p className="text-text2 text-base leading-relaxed max-w-md">
          Mühendislik · Satın alma · Saha uygulama · Devreye alma — uçtan uca yaşam döngüsü takibi,
          PMP standartlarında KPI&apos;lar ve mobil saha operasyonu.
        </p>
        <div className="grid grid-cols-2 gap-3 mt-2 max-w-md">
          <Feature icon={<FolderKanban size={16} />} label="11+ Modül" />
          <Feature icon={<BarChart3 size={16} />} label="SPI / CPI / EAC" />
          <Feature icon={<Smartphone size={16} />} label="Mobil Saha" />
          <Feature icon={<ShieldCheck size={16} />} label="Çoklu Proje" />
        </div>
        <div className="flex items-center gap-2 mt-4 text-xs text-text3">
          <ShieldCheck size={14} className="text-green" />
          KVKK uyumlu · Rol bazlı yetkilendirme · Audit log
        </div>
      </div>

      {/* Form side */}
      <div className="relative">
        <div className="relative rounded-2xl bg-white border border-border p-8 shadow-large">
          <div className="lg:hidden mb-6 flex justify-center">
            <Logo size={40} compact textClassName="text-lg" />
          </div>

          <h2 className="font-display text-2xl font-extrabold text-text tracking-tight">Hoş geldin</h2>
          <p className="text-sm text-text2 mt-1 mb-6">Devam etmek için giriş yap</p>

          <form onSubmit={submit} className="space-y-4">
            <Field label="E-posta">
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3" />
                <Input
                  type="email"
                  defaultValue="ozan.seyfi@kontrolmatik.com"
                  className="pl-10 h-11"
                  placeholder="ornek@firma.com"
                />
              </div>
            </Field>
            <Field label="Şifre">
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3" />
                <Input type="password" defaultValue="demo" className="pl-10 h-11" placeholder="••••••••" />
              </div>
            </Field>
            <div className="flex items-center justify-between text-sm pt-1">
              <label className="flex items-center gap-2 text-text2 cursor-pointer select-none">
                <input type="checkbox" className="accent-accent w-4 h-4 rounded" />
                Beni hatırla
              </label>
              <Link href="/forgot-password" className="text-accent hover:underline font-semibold">
                Şifremi unuttum
              </Link>
            </div>
            <Button variant="accent" size="lg" className="w-full" type="submit">
              Giriş Yap <ArrowRight size={14} />
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-text3 uppercase tracking-wider font-bold">veya</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="h-11 flex items-center justify-center gap-2 rounded-lg bg-white border border-border2 hover:bg-bg2 transition-all text-text font-semibold text-sm"
            >
              <GoogleIcon /> Google
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="h-11 flex items-center justify-center gap-2 rounded-lg bg-white border border-border2 hover:bg-bg2 transition-all text-text font-semibold text-sm"
            >
              <MicrosoftIcon /> Microsoft
            </button>
          </div>

          <p className="text-xs text-text3 mt-6 text-center">
            Hesabın yok mu? Yöneticinden davet linki iste.
          </p>
        </div>

        <p className="text-[10px] text-text3 text-center mt-4 tracking-wider uppercase font-bold">
          Lokal mod · herhangi bir e-posta/şifre ile giriş yapabilirsin
        </p>
      </div>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white border border-border shadow-soft">
      <span className="text-accent">{icon}</span>
      <span className="text-sm text-text font-semibold">{label}</span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M14.92 8.16c0-.45-.04-.89-.12-1.32H8v2.5h3.88c-.17.9-.68 1.67-1.45 2.18v1.81h2.35c1.37-1.26 2.16-3.12 2.16-5.17z" fill="#4285F4" />
      <path d="M8 15.2c1.96 0 3.6-.65 4.8-1.76l-2.35-1.81c-.65.44-1.49.7-2.45.7-1.88 0-3.47-1.27-4.04-2.97H1.53v1.87C2.72 13.66 5.18 15.2 8 15.2z" fill="#34A853" />
      <path d="M3.96 9.36c-.14-.44-.22-.9-.22-1.36s.08-.92.22-1.36V4.77H1.53C1.06 5.7.8 6.83.8 8s.26 2.3.73 3.23l2.43-1.87z" fill="#FBBC05" />
      <path d="M8 3.67c1.06 0 2.02.37 2.77 1.08l2.08-2.07C11.59 1.5 9.95.8 8 .8 5.18.8 2.72 2.34 1.53 4.77l2.43 1.87C4.53 4.94 6.12 3.67 8 3.67z" fill="#EA4335" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6.5" height="6.5" fill="#F25022" />
      <rect x="8.5" y="1" width="6.5" height="6.5" fill="#7FBA00" />
      <rect x="1" y="8.5" width="6.5" height="6.5" fill="#00A4EF" />
      <rect x="8.5" y="8.5" width="6.5" height="6.5" fill="#FFB900" />
    </svg>
  );
}

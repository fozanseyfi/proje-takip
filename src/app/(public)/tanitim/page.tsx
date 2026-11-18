import type { Metadata } from "next";
import Link from "next/link";
import { TourView } from "@/components/tanitim/tour-view";

export const metadata: Metadata = {
  title: "Platform Tanıtımı — Proje Yönetim Platformu",
  description: "GES proje yönetim platformunun bütün modülleri, gerçek ekranlar üzerinden adım adım.",
};

/** Herkese açık tanıtım sayfası (giriş gerektirmez). Platform içindeki kopyası: /platform-tanitimi */
export default function TanitimPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="mx-auto flex h-12 max-w-[1280px] items-center justify-between px-4 text-[13px]">
          <Link href="/login" className="font-semibold text-foreground">
            Proje Yönetim Platformu <span className="font-normal text-muted-foreground">· Platform Tanıtımı</span>
          </Link>
          <Link href="/login" className="rounded-md bg-accent px-3 py-1 font-medium text-white hover:opacity-90">
            Giriş Yap
          </Link>
        </div>
      </header>
      <main className="px-4 py-4">
        <TourView top={48 + 16} />
      </main>
    </div>
  );
}

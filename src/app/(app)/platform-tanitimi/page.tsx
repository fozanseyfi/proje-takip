import type { Metadata } from "next";
import { TourView } from "@/components/tanitim/tour-view";

export const metadata: Metadata = {
  title: "Platform Tanıtımı — Proje Yönetim Platformu",
};

/** Sol menüdeki “Platform Tanıtımı” — uygulama kabuğu içinde (üst bar 64px + sayfa boşluğu 24px). */
export default function PlatformTanitimiPage() {
  return <TourView top={64 + 24} />;
}

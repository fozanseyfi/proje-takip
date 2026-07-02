"use client";

import { useEffect } from "react";

/**
 * Service worker'ı kayıt eder — telefona "Ana ekrana ekle" ile kurulabilmesi ve
 * temel çevrimdışı kabuk için. Hidrasyonla yarışmamak adına sayfa yüklendikten
 * sonra kaydeder. Hata olursa sessizce yutar (SW yoksa uygulama normal çalışır).
 */
export function PWARegister() {
  useEffect(() => {
    // Dev modunda kayıt yapma — HMR ile eski chunk önbelleğe takılmasın.
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    };

    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}

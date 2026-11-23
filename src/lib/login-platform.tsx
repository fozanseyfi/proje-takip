/*
 * Giriş sayfasının BU PLATFORMA ÖZGÜ kısmı. Sayfanın geri kalanı
 * components/auth/login-kit.tsx'te — o dosya bütün platformlarda birebir aynıdır.
 */
import type { LoginPlatform } from "@/components/auth/login-kit";
import { LogoMark } from "@/components/brand/logo";
import manifest from "@/lib/tanitim/manifest.json";
import { TOUR } from "@/lib/tanitim/config";

interface TourModule { id: string; title: string; steps: { img: string; title: string }[] }
const MODULES = (manifest.modules as TourModule[]).filter((m) => m.steps.length > 0);

function shot(moduleId: string, step: number) {
  const m = MODULES.find((x) => x.id === moduleId) ?? MODULES[0];
  const s = m?.steps[Math.min(step, (m?.steps.length ?? 1) - 1)];
  return { id: m?.id ?? moduleId, img: s?.img ?? "", title: s?.title ?? "" };
}

const hero = shot("genel", 1);

export const LOGIN_PLATFORM: LoginPlatform = {
  id: "pm",
  name: "Proje Yönetim",
  fullName: "Proje Yönetim Platformu",
  mark: <LogoMark size={32} />,
  accent: TOUR.accent,
  accentDark: TOUR.accentDark,
  intro: {
    eyebrow: "GES şantiyeleri için",
    title: "Şantiyede ne oldu, plana göre neredeyiz, her gün tek ekranda.",
    text:
      "WBS ve baseline planını bir kez kurun; günlük gerçekleşme, puantaj ve tutanaklar girildikçe S-eğrisi, kazanılmış değer ve hakediş kendiliğinden güncellenir. Birden fazla projeyi aynı portföyde izlersiniz.",
    points: [
      { title: "WBS ve planlama", text: "Ağırlıklı iş kırılımı, baseline, öncüllükler ve Gantt" },
      { title: "Günlük gerçekleşme", text: "İmalat miktarları, kritik işler, tutanak ve claim kaydı" },
      { title: "Puantaj ve kaynak", text: "Personel, makine ve alt yüklenici takibi" },
      { title: "Hakediş ve maliyet", text: "Satınalma, fatura, hakediş ve plan / gerçekleşme" },
    ],
  },
  hero: { img: hero.img, caption: `Gerçek ekran: ${hero.title}`, href: `/tanitim#${hero.id}` },
  tour: {
    text: TOUR.promoText,
    modules: MODULES.map((m) => ({ id: m.id, title: m.title })),
    total: MODULES.reduce((n, m) => n + m.steps.length, 0),
    previews: TOUR.previews.map((p) => ({ ...shot(p.id, p.step), label: p.label })),
  },
  links: { register: "/portfolio" },
};

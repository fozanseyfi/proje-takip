/**
 * Tanıtım sayfasının platforma özgü ayarları. Tanıtım bileşenleri (components/tanitim/tour-view.tsx,
 * components/auth/login-kit.tsx) bütün platformlarda birebir aynıdır; yalnız bu dosya ve
 * manifest/görüntüler platforma göre değişir.
 */
export const TOUR = {
  /** Platformun ana rengi (vurgu, numaralar, kaydırma çubuğu) */
  accent: "#059669",
  /** Gece modunda vurgu rengi */
  accentDark: "#34d399",
  /** Tarayıcı çerçevesindeki adres */
  domain: "pm.fozanseyfi.com",
  /** Giriş sayfasındaki tanıtım şeridinin açıklaması */
  promoText:
    "WBS ve planlamadan günlük gerçekleşmeye, puantajdan hakediş ve bütçeye kadar GES şantiyesinin bütün modülleri gerçek ekranlar üzerinden anlatılıyor: hangi veri nereye girilir, rapor nereden alınır.",
  /** Giriş sayfasında gösterilen örnek ekranlar (bölüm id + adım sırası, 0'dan) */
  previews: [
    { id: "genel", step: 0, label: "Proje dashboard" },
    { id: "planlama", step: 2, label: "Timeline & Gantt" },
    { id: "gunluk", step: 0, label: "Günlük gerçekleşme" },
  ],
};

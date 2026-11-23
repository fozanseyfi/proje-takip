"use client";

/** Geliştirici notu — bütün platformlarda aynı metin (Teklif'teki login-kit ile birebir). */
export function AuthMissionCard() {
  return (
    <div className="rounded-2xl border border-yellow/30 bg-gradient-to-br from-yellow/8 via-white to-white p-4 text-[12.5px] leading-relaxed text-text2">
      <p className="text-[13px] font-bold text-text">Merhaba, ben Ozan.</p>
      <p className="mt-2">
        Uzun süre sahada ve masa başında, teklif hazırlarken, keşif çıkarırken, tedarikçi karşılaştırırken hep
        aynı Excel dosyalarıyla uğraştım. Bu platformlar, önce kendi işimi kolaylaştırmak için yazdığım
        araçlardan doğdu.
      </p>
      <p className="mt-2">
        Arkasında bir şirket yok, size satmaya çalıştığım bir şey de yok. İşinize yararsa ne mutlu bana. Eksik
        gördüğünüz ya da canınızı sıkan bir şey olursa{" "}
        <a href="mailto:ozan.seyfi@kontrolmatik.com" className="font-bold text-yellow hover:brightness-90">yazın</a>; bir sonraki özellik sizin
        &ldquo;şu da olsa&rdquo; demenizle gelebilir.
      </p>
      <p className="mt-2 text-text">— Furkan Ozan Seyfi</p>
    </div>
  );
}


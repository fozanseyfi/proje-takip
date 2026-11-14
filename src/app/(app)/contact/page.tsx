"use client";

import { ContactView } from "@/components/common/contact-view";
import { useCurrentUser } from "@/lib/store";
import { sendContactMessage } from "./actions";

export default function ContactPage() {
  const user = useCurrentUser();

  return (
    <ContactView
      config={{
        current: "proje",
        subjectTag: "Proje Yönetim",
        footerTag: "proje-yonetim-platformu",
        bio: "Yenilenebilir enerji sektöründe, büyük ölçekli GES projelerinin geliştirme, yatırım ve işletme süreçlerinde çalışıyorum. Bu platformu, saha operasyonu, planlama ve raporlama süreçlerinde ihtiyaç duyduğum takibi tek bir yerde, şeffaf ve hızlı yapabilmek için bireysel olarak geliştirdim; sektördeki meslektaşlarımın da işine yarayacağı inancıyla paylaşıyorum.",
        formNote: "Aşağıdaki formu doldurun, hesabınıza bağlı olarak takip edilebilen bir mesaj olarak iletilir.",
        subjectPlaceholder: "Kısa bir özet — örn. PDF çıktısında font sorunu",
        onSend: async ({ topic, subject, message }) => {
          if (!user) throw new Error("Mesaj göndermek için önce giriş yap.");
          await sendContactMessage({ topic, subject, message, senderName: user.fullName, senderEmail: user.email });
        },
        privacy: (
          <>
            Tüm proje, puantaj, fatura ve personel verileri kendi hesabınızda izole tutulur. Geliştirici dahil{" "}
            <strong>hiçbir üçüncü taraf</strong> proje verilerinizi göremez. Supabase&apos;e geçişle birlikte tüm tablolar{" "}
            <strong>RLS</strong> politikalarıyla korunacak.
          </>
        ),
        disclaimerTitle: "Yardımcı araç",
        disclaimer: (
          <>
            Platform; planlama, gerçekleşme, SPI/CPI ve raporlamada yol gösterici bir yardımcıdır. Üretilen PDF/Excel
            çıktıları <strong>resmi belge / hak ediş / hukuki delil yerine geçmez</strong>; nihai kararlar kullanıcı
            sorumluluğundadır.
          </>
        ),
        legalIntro:
          "Bu uygulama bir proje takip yardımcısıdır. Sözleşme, hukuki süreçler ve resmi raporlama için tek başına bağlayıcı kabul edilemez. Platformu kullanmaya devam ederek aşağıdaki şartları kabul etmiş sayılırsınız.",
        clauses: [
          {
            title: "Kullanım Amacı",
            body: (
              <>
                Proje Yönetim Platformu; saha ekiplerinin günlük gerçekleşme, puantaj, planlama ve ilerleme takibini
                kolaylaştırmak amacıyla geliştirilmiş bir <strong>iç araç</strong>tır. Hesaplanan değerler (SPI, CPI, EAC,
                S-eğrisi vb.) yönlendirici göstergelerdir; proje yönetim kararları için ek doğrulama gerektirir.
              </>
            ),
          },
          {
            title: "Veri Sorumluluğu",
            body: (
              <>
                Sisteme girilen tüm bilgilerin doğruluğundan ve güncelliğinden kullanıcı sorumludur. Uygulama, eksik veya
                yanlış girilen veriler üzerinden yapılan hesaplamaların sonuçlarından doğacak{" "}
                <strong>hiçbir maddi, manevi veya hukuki zarardan</strong> sorumlu tutulamaz. Üçüncü taraflarla (işveren, alt
                yüklenici, müfettişlik vb.) paylaşılan raporların doğrulanması ilgili proje yöneticisinin sorumluluğundadır.
              </>
            ),
          },
          {
            title: "Hukuki Bağlayıcılık",
            body: (
              <>
                Bu platformdan alınan PDF/Excel çıktıları, dijital raporlar, panel görselleri ve hesaplamalar{" "}
                <strong>hukuki delil veya resmi belge niteliği taşımaz.</strong> Hak ediş, fatura, sözleşme değişikliği, ihbar,
                claim, tutanak gibi resmi süreçlerde imzalı ıslak veya KEP üzerinden gönderilmiş orijinal belgeler esas
                alınır. Bu uygulamadaki kayıtlar yalnızca ön çalışma ve takip amaçlıdır.
              </>
            ),
          },
          {
            title: "KVKK & Gizlilik",
            body: (
              <>
                Personel TC kimlik numarası, telefon, yevmiye gibi kişisel veriler 6698 sayılı Kişisel Verilerin Korunması
                Kanunu (KVKK) kapsamında işlenir. Bu verilerin sisteme girilmesi, ilgili kişiden açık rıza alındığı
                varsayımıyla yapılır. Verilerin saklanması, paylaşılması ve silinmesi proje yöneticisinin sorumluluğundadır.
                Uygulama yöneticileri sızıntı, yetkisiz erişim veya veri kaybı durumlarından doğacak zararlardan sorumlu
                değildir.
              </>
            ),
          },
          {
            title: "Yedekleme & Kayıp",
            body: (
              <>
                Verilerin yedeklenmesinden kullanıcı sorumludur. Uygulama; donanım arızası, internet kesintisi, tarayıcı
                verisi silinmesi, beklenmedik hatalar veya 3. parti servis kesintileri sebebiyle oluşabilecek veri kaybından{" "}
                <strong>sorumlu tutulamaz</strong>. Kritik veriler için düzenli aralıklarla Excel/PDF yedek alınması önerilir.
              </>
            ),
          },
          {
            title: "Üçüncü Taraf Servisler",
            body: (
              <>
                Hava durumu (Open-Meteo), döviz kuru (TCMB), e-posta (Resend / Gmail SMTP) gibi üçüncü taraf servislerin
                kullanımı, ilgili servis sağlayıcının kendi koşullarına tabidir. Bu servislerin geçici veya kalıcı çalışmaması
                uygulamanın sorumluluğu altında değildir.
              </>
            ),
          },
          {
            title: "Telif & Lisans",
            body: (
              <>
                Uygulamadaki tüm yazılım kodu, tasarım ve dokümantasyon geliştiricinin telif kapsamındadır. İzinsiz
                kopyalanması, dağıtılması veya tersine mühendislik yapılması yasaktır.
              </>
            ),
          },
          {
            title: "Sorumluluk Reddi",
            body: (
              <>
                Uygulamayı kullanmaya devam eden her kullanıcı, yukarıdaki maddeleri okuduğunu, anladığını ve kabul ettiğini
                beyan etmiş sayılır. Anlaşmazlık durumunda Ankara mahkemeleri yetkilidir.
              </>
            ),
          },
        ],
      }}
    />
  );
}

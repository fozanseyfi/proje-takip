/**
 * Proje Yönetim Platformu — tanıtım ekran görüntüleri + src/lib/tanitim/manifest.json.
 *
 *   npx next dev -p 4200                                 (ayrı terminalde)
 *   node scripts/tour/capture.mjs [bölüm-id ...]
 *
 * Veriler tarayıcıda (localStorage) tutulur. Demo verisi için çekimden önce geçici olarak
 * eski örnek proje üreticisi (sample-loader, git geçmişinden) ve /tour-seed sayfası eklenir;
 * bunlar repoya girmez (.git/info/exclude). Ayrıntı: scripts/tour/README.md
 */
import path from "node:path";
import { launch, autoDialogs, noSmoothScroll, go, settle, sleep, byText, fill } from "./lib.mjs";
import { VW, VH, mark, press, scrollTo, toTop, modalButton, runTour } from "./engine.mjs";

const MANIFEST = path.resolve("src/lib/tanitim/manifest.json");
const DEMO = { name: "Deniz Aydın", email: "deniz.aydin@demo-enerji.example" };
const OFF = 80; // üst bar (64px) + boşluk

/** Sayfadaki h1–h3 başlığını ekranın üstüne getir. */
const toHeading = (page, text) => scrollTo(page, text, OFF);
/** Açık penceredeki ilk metin alanı. */
const dialogInput = (page) => page.$("[role=dialog] input[type=text], [role=dialog] input:not([type]), .fixed input[type=text]");

// ---------------------------------------------------------------- senaryo
const MODULES = [
  {
    id: "giris",
    group: "Başlarken",
    title: "Giriş, Portfolio ve Projeler",
    intro:
      "Platform iki seviyede çalışır: Portfolio bütün projeleri özetler, bir proje açıldığında sol menü o projenin modüllerine (planlama, günlük operasyon, finansal, ekip) geçer.",
    steps: [
      {
        title: "Giriş ekranı",
        text: "E-posta ve şifreyle girilir. Sağda platformun canlı önizlemesi, altta modüllerin tanıtımı ve veri gizliliği ilkeleri yer alır.",
        guest: true,
        run: async (page) => {
          await go(page, "/login", 1500);
          await fill(page, 'input[name="email"]', DEMO.email);
          await mark(page, await byText(page, "Giriş Yap", "button"), { click: true });
        },
      },
      {
        title: "Portfolio",
        text: "Girişten sonra Portfolio açılır: bütün projeler planlanan ve gerçekleşen ilerleme, SPI ve kritik iş sayısıyla listelenir. “Aç” ile proje panosuna geçilir.",
        run: async (page) => {
          await go(page, "/portfolio", 1500);
          await mark(page, await byText(page, "Aç", "main a"), { click: true });
        },
      },
      {
        title: "Projeler",
        text: "Projeler sayfasında yeni proje açılır, mevcut projeler açılır veya ayarlarına gidilir. Örnek projeler tek tuşla silinip sıfırdan başlanabilir.",
        run: async (page) => {
          await go(page, "/projects", 1200);
          await mark(page, await byText(page, "Yeni Proje", "main button"));
        },
      },
      {
        title: "Yeni proje",
        text: "Proje adı, konum, ana yüklenici, yatırımcı (işveren), başlangıç tarihi, süre, kurulu güç ve bütçe (para birimiyle) girilir. Ana yüklenici, personel ve makine eklerken şirket listesinde otomatik çıkar.",
        run: async (page) => {
          await go(page, "/projects", 1000);
          await press(page, await byText(page, "Yeni Proje", "main button"), 900);
          const inp = await page.$('input[placeholder="örn. Konya GES 2"]');
          if (inp) {
            await fill(page, inp, "Konya Karapınar 18 MWp GES");
            const loc = await page.$('input[placeholder="il, ilçe"]');
            if (loc) await fill(page, loc, "Konya, Karapınar");
            const inv = await page.$('input[placeholder="örn. ABC Enerji A.Ş."]');
            if (inv) await fill(page, inv, "Demo Yatırım A.Ş.");
            await mark(page, inp, { center: false });
          }
        },
        after: async (page) => page.keyboard.press("Escape"),
      },
      {
        title: "Üst bar",
        text: "Üst barda seçili proje, planlanan ve gerçekleşen ilerleme ile SPI sürekli görünür; zil bildirimleri, sağdaki ad hesap menüsünü açar.",
        run: async (page) => {
          await go(page, "/dashboard", 1500);
          await mark(page, await byText(page, "Ankara Polatlı GES", "header button, header a, header div"), { center: false });
        },
      },
    ],
  },

  {
    id: "genel",
    group: "Proje Takibi",
    title: "Proje Panosu ve İlerleme",
    intro:
      "Projenin sağlık durumu tek ekranda: planlanan ve gerçekleşen ilerleme, SPI, tahmini bitiş, S-eğrisi, personel ve makine sayıları, kritik işler, hakediş ve satınalma durumu.",
    steps: [
      {
        title: "Dashboard",
        text: "Üstte planlanan ve gerçekleşen ilerleme, bugünkü personel ve makine sayısı, geçen ve kalan süre, SPI'ya ve kazanılmış takvime (ES) göre tahmini bitiş ile sapma gün sayısı yer alır.",
        run: async (page) => {
          await go(page, "/dashboard", 2000);
          await mark(page, await byText(page, "Yönetim Özeti PDF", "main button"));
        },
      },
      {
        title: "S-eğrisi",
        text: "Planlanan ve gerçekleşen kümülatif ilerleme gün gün çizilir; rapor günü ve planlanan bitiş çizgiyle işaretlidir.",
        run: async (page) => {
          await go(page, "/dashboard", 1800);
          await toHeading(page, "Genel S-Curve");
        },
      },
      {
        title: "Personel ve makine trendi",
        text: "Son 7 günün personel headcount'u ve 30 günlük personel / makine trendi firma ve disipline göre grafiklenir.",
        run: async (page) => {
          await go(page, "/dashboard", 1800);
          await toHeading(page, "Personel Headcount · Son 7 Gün");
        },
      },
      {
        title: "Faturalandırma, satınalma ve kritik işler",
        text: "Sözleşme bedeli, faturalanan ve tahsil edilen tutarlar yüzde çubuğuyla gösterilir; altında satınalma takibi, açık kritik işler ve claim / tutanak konuları özetlenir. “Detay” ilgili modüle götürür.",
        run: async (page) => {
          await go(page, "/dashboard", 1800);
          await toHeading(page, "Faturalandırma Durumu");
        },
      },
      {
        title: "Timeline & Gantt",
        text: "WBS kalemleri seviyelere göre (ana başlık, alt başlık, iş kalemi) Gantt çizelgesinde gösterilir. Planlanan, gerçekleşen ve baseline çubukları aç/kapa; öncül okları, kritik yol, float ısısı ve What-If senaryosu üstteki düğmelerle açılır.",
        run: async (page) => {
          await go(page, "/timeline", 2000);
          await mark(page, await byText(page, "Kritik Yol", "main button"));
          await mark(page, await byText(page, "What-If", "main button"));
        },
      },
      {
        title: "Plan / Gerçekleşme (EVM)",
        text: "Kazanılmış değer analizi: planlanan değer, kazanılan değer, SPI ve SV proje toplamında ve her ana başlık için hesaplanır. Tarihi değiştirerek geçmiş bir günün durumu görülür.",
        run: async (page) => {
          await go(page, "/plan-status", 2000);
        },
      },
      {
        title: "Aylık puantaj",
        text: "Personel ve makinelerin aylık puantaj çizelgesi: her gün için çalışma durumu tek tabloda; Excel veya PDF olarak indirilir.",
        run: async (page) => {
          await go(page, "/monthly-timesheet", 2000);
          await mark(page, await byText(page, "Excel", "main button"));
        },
      },
    ],
  },

  {
    id: "planlama",
    group: "Planlama",
    title: "WBS ve Planlama",
    intro:
      "İş kırılım yapısı (WBS) ve baseline planı: her iş kalemi miktar, birim ve ağırlığıyla tanımlanır; süreler ve öncüllükler girilip planlama sihirbazıyla takvim oluşturulur.",
    steps: [
      {
        title: "WBS yapısı",
        text: "Ana başlık, alt başlık ve iş kalemleri hiyerarşik ağırlıklarıyla listelenir. Her kalemin miktarı, birimi ve projedeki ağırlığı düzenlenebilir; Excel veya PDF olarak indirilir.",
        run: async (page) => {
          await go(page, "/wbs", 2000);
          await mark(page, await byText(page, "Yeni WBS", "main button"));
        },
      },
      {
        title: "En yüksek ağırlıklı kalemler",
        text: "Projede en çok ağırlığa sahip 15 iş kalemi grafikle gösterilir; ilerlemeyi en çok etkileyen işler bir bakışta görünür.",
        run: async (page) => {
          await go(page, "/wbs", 1800);
          await toHeading(page, "En Yüksek Ağırlıklı 15 İş Kalemi");
        },
      },
      {
        title: "Baseline planı",
        text: "Planlama dört adımda yapılır: süreleri tanımla, öncül ekle, planlama sihirbazını çalıştır, baseline'ı kaydet. Takvim aylara bölünmüş çizelgede görünür.",
        run: async (page) => {
          await go(page, "/planning", 2200);
          await mark(page, await byText(page, "3Planlama Sihirbazı", "main button").catch(() => byText(page, "Planlama Sihirbazı", "main button")));
        },
      },
      {
        title: "Öncüllükler",
        text: "İş kalemleri arasındaki bitiş-başlangıç ilişkileri ve gecikmeler tanımlanır; kritik yol bu ilişkilerden hesaplanır.",
        run: async (page) => {
          await go(page, "/planning", 2000);
          await toHeading(page, "Öncüllükler");
        },
      },
    ],
  },

  {
    id: "gunluk",
    group: "Günlük Operasyon",
    title: "Günlük Gerçekleşme ve Puantaj",
    intro:
      "Sahada her gün girilen veriler: iş kalemlerinin günlük ilerlemesi, kritik işler ve tutanaklar, personel ve makine puantajı, hava durumu ve fotoğraflarla günlük rapor.",
    steps: [
      {
        title: "Günlük gerçekleşme",
        text: "Seçili tarih için her WBS kaleminin o gün yapılan miktarı yazılır; dün'e kadar yapılan, kümülatif yüzde, plan yüzdesi ve kalem bazında SPI aynı satırda görünür. Ctrl+S kaydeder.",
        run: async (page) => {
          await go(page, "/realization", 2200);
          await mark(page, await byText(page, "Kaydet", "main button"));
          await mark(page, await byText(page, "Önceki Günden Kopyala", "main button"));
        },
      },
      {
        title: "Kritik işler, tutanak ve claim",
        text: "Kritik işler, tutanaklar, claim'ler, yazışmalar ve ihbarlar tek listede türüne göre süzülür. Her kayıt sorumlu, termin ve durumla izlenir; tutanak Word olarak indirilir.",
        run: async (page) => {
          await go(page, "/lookahead", 2000);
          await mark(page, await byText(page, "Yeni Kayıt", "main button"));
        },
      },
      {
        title: "Yeni kayıt",
        text: "Kayıt tipi (kritik iş, claim, tutanak, yazışma, ihbar) seçilir; iş tanımı, tarih, öncelik, sorumlu personel ve notlar girilir.",
        run: async (page) => {
          await go(page, "/lookahead", 1500);
          await press(page, await byText(page, "Yeni Kayıt", "main button"), 900);
        },
        after: async (page) => page.keyboard.press("Escape"),
      },
      {
        title: "Personel puantajı",
        text: "Projeye atanmış personel firma ve disipline göre listelenir; o gün çalışanlar işaretlenip kaydedilir. Kaydet düğmesi işaretli / toplam kişi sayısını gösterir.",
        run: async (page) => {
          await go(page, "/personnel", 2000);
          await mark(page, await byText(page, "Kaydet", "main button"));
        },
      },
      {
        title: "Makine puantajı",
        text: "Sahadaki makineler için aynı işlem: o gün çalışan makineler işaretlenir, çalışma saati girilir.",
        run: async (page) => {
          await go(page, "/machines", 1800);
        },
      },
      {
        title: "Günlük rapor",
        text: "Günün faaliyet özeti, hava durumu (konumdan otomatik), personel ve makine sayıları, fotoğraflar ve notlar girilir; “DCR PDF” günlük şantiye raporunu verir.",
        run: async (page) => {
          await go(page, "/daily-report", 2000);
          await mark(page, await byText(page, "DCR PDF", "main button"));
        },
      },
    ],
  },

  {
    id: "finansal",
    group: "Finansal",
    title: "Satınalma, Hakediş ve Maliyet",
    intro: "Ekipman satınalmalarının takvimi, işveren ve alt yüklenici hakediş / faturaları ile personel ve makine maliyetleri.",
    steps: [
      {
        title: "Procurement",
        text: "Panel, inverter, taşıyıcı sistem ve kablo gibi kalemlerin planlanan ve gerçekleşen sipariş, üretim ve teslim tarihleri izlenir; geciken kalemler kritik olarak işaretlenir.",
        run: async (page) => {
          await go(page, "/procurement", 2000);
          await mark(page, await byText(page, "Yeni Kayıt", "main button"));
        },
      },
      {
        title: "Hakediş & fatura",
        text: "İşveren hakediş ve faturaları ile alt yüklenici hakediş ve faturaları ayrı sekmelerde tutulur. “Hakediş Planla” ödeme planını ilerleme yüzdelerine göre çıkarır.",
        run: async (page) => {
          await go(page, "/billing", 2000);
          await mark(page, await byText(page, "Hakediş Planla", "main button"));
        },
      },
      {
        title: "Personel & makina maliyeti",
        text: "Puantajdan gelen adam-gün ve makine-gün değerleri birim ücretlerle çarpılarak firma ve disiplin bazında maliyet hesaplanır.",
        run: async (page) => {
          await go(page, "/labor-cost", 2000);
        },
      },
    ],
  },

  {
    id: "takim",
    group: "Proje Takımı",
    title: "Proje Takımı ve Teslim Alma",
    intro: "Projeye atanan personel, makine ve alt yükleniciler; geçici kabul için teslim alma kontrol listesi ve proje ayarları.",
    steps: [
      {
        title: "Proje personeli",
        text: "Projeye atanan kişiler firma ve disipline göre gruplanır; giriş tarihi, görevi ve durumu listelenir. Atama buradan kaldırılır.",
        run: async (page) => {
          await go(page, "/team-personnel", 1800);
        },
      },
      {
        title: "Proje makineleri",
        text: "Makineler firma ve tipine göre (ekskavatör, loder, vinç, kamyon…) listelenir.",
        run: async (page) => {
          await go(page, "/team-machines", 1800);
        },
      },
      {
        title: "Alt yükleniciler",
        text: "Projede çalışan alt yükleniciler kapsam, kişi sayısı ve sözleşme bilgileriyle görünür.",
        run: async (page) => {
          await go(page, "/team-subcontractors", 1800);
        },
      },
      {
        title: "Teslim alma listesi",
        text: "Geçici kabul öncesi yüzlerce kontrol maddesi uygun / uygun değil / şartlı olarak işaretlenir; uygunsuzluklar NCR olarak kaydedilip kritik işlere aktarılır. Taslak ve doldurulmuş liste PDF olarak alınır.",
        run: async (page) => {
          await go(page, "/teslim-alma", 2000);
          await mark(page, await byText(page, "Lookahead'e Aktar", "main button"));
        },
      },
      {
        title: "Proje ayarları",
        text: "Proje adı, lokasyon, koordinat, kurulu güç, başlangıç, süre, bütçe ve rapor tarihi buradan güncellenir.",
        run: async (page) => {
          await go(page, "/settings", 1800);
        },
      },
    ],
  },

  {
    id: "master",
    group: "Çalışma Alanı",
    title: "Müşteriler ve Master Data",
    intro:
      "Bütün projelerde ortak kullanılan kayıtlar: müşteriler, personel, makine ve alt yüklenici master verileri. Bir kişi bir kez kaydedilir, istenen projeye atanır.",
    steps: [
      {
        title: "Personel master data",
        text: "Bütün personel firma, proje ve disiplin filtreleriyle listelenir; belgeleri (sağlık raporu, SGK, eğitim) ve geçerlilik tarihleri izlenir. “Ata” ile projeye atanır.",
        run: async (page) => {
          await go(page, "/master/personnel", 2000);
          await mark(page, await byText(page, "Yeni Personel", "main button"));
        },
      },
      {
        title: "Yeni personel",
        text: "Ad soyad, firma, görev, disiplin, işe giriş tarihi ve belgeler girilir.",
        run: async (page) => {
          await go(page, "/master/personnel", 1500);
          await press(page, await byText(page, "Yeni Personel", "main button"), 900);
        },
        after: async (page) => page.keyboard.press("Escape"),
      },
      {
        title: "Makine master data",
        text: "Makineler plaka, tip, firma, yakıt ve günlük ücretleriyle tutulur; muayene ve sigorta belgeleri izlenir.",
        run: async (page) => {
          await go(page, "/master/machines", 1800);
        },
      },
      {
        title: "Alt yüklenici master data",
        text: "Alt yüklenici firmalar sözleşme, kapsam ve çalıştıkları projelerle listelenir.",
        run: async (page) => {
          await go(page, "/master/subcontractors", 1800);
        },
      },
    ],
  },

  {
    id: "yonetim",
    group: "Yönetim",
    title: "Ekip, Paylaşım ve Kayıtlar",
    intro: "Kullanıcılar ve roller, proje ekibine davet, salt okunur paylaşım linkleri, aktivite kayıtları, bildirimler ve veri yedeği.",
    steps: [
      {
        title: "Kullanıcılar ve roller",
        text: "Kullanıcılar rolleriyle (Süper Admin, Proje Yöneticisi, Saha Mühendisi, Görüntüleyici) listelenir; bekleyen davetler ve rollerin yetkileri aynı sayfadadır.",
        run: async (page) => {
          await go(page, "/users", 1800);
        },
      },
      {
        title: "Ekip & davet",
        text: "Projeye e-posta ve rolle kişi davet edilir; davet linkini açan kişi şifresini belirleyip projeye katılır.",
        run: async (page) => {
          await go(page, "/team", 1800);
          await mark(page, await byText(page, "Davet Et", "main button"), { click: true });
        },
      },
      {
        title: "Paylaşım linkleri",
        text: "Proje panosu işveren veya yatırımcıyla giriş gerektirmeyen salt okunur linkle paylaşılır; linklerin süresi ve görüntülenmesi izlenir.",
        run: async (page) => {
          await go(page, "/share", 1500);
          await mark(page, await byText(page, "Link Oluştur", "main button"), { click: true });
        },
      },
      {
        title: "Profil",
        text: "Ad soyad, panel adı ve şifre güncellenir.",
        run: async (page) => {
          await go(page, "/account", 1500);
        },
      },
      {
        title: "Veri yedeği",
        text: "Bütün veriler tek JSON dosyası olarak indirilir; başka bir bilgisayarda aynı dosya seçilerek geri yüklenir.",
        run: async (page) => {
          await go(page, "/backup", 1500);
          await mark(page, await byText(page, "JSON Yedek İndir", "main button"));
        },
      },
    ],
  },

  {
    id: "destek",
    group: "Destek",
    title: "Nasıl Çalışır, İletişim ve Platformlarım",
    intro: "Platformun adım adım kullanım rehberi, geliştiriciyle iletişim ve aynı hesapla kullanılabilen diğer platformlar.",
    steps: [
      {
        title: "Nasıl çalışır",
        text: "Projeyi açmaktan günlük veri girişine, raporlardan hakedişe kadar akış adım adım anlatılır.",
        run: async (page) => {
          await go(page, "/how-it-works", 1500);
        },
      },
      {
        title: "İletişime geç",
        text: "Hata bildirimi, öneri veya soru için konu ve mesaj yazılır; mesaj e-posta uygulamanızda taslak olarak açılır.",
        run: async (page) => {
          await go(page, "/contact", 1500);
        },
      },
      {
        title: "Platformlarım",
        text: "Sol menüdeki Platformlarım bölümünden bu tanıtıma ve teklif, fizibilite, satınalma karar destek ve konstrüksiyon BoM platformlarına geçilir.",
        run: async (page) => {
          await go(page, "/platforms", 1500);
          await mark(page, await byText(page, "Platform Tanıtımı", "aside a, nav a, a"));
        },
      },
    ],
  },
];

// ---------------------------------------------------------------- çalıştır
const { browser, page } = await launch({ width: VW, height: VH });
await page.evaluateOnNewDocument(() => {
  window.print = () => {};
});
const guestCtx = await browser.createBrowserContext();
const guest = await guestCtx.newPage();
autoDialogs(guest);
await noSmoothScroll(guest);
await guest.setViewport({ width: VW, height: VH, deviceScaleFactor: Number(process.env.TOUR_DPR || 2) });
guest.setDefaultTimeout(45_000);

try {
  // Giriş + demo proje (geçici /tour-seed sayfası)
  await go(page, "/login", 2000);
  await fill(page, 'input[name="email"]', DEMO.email);
  await (await byText(page, "Giriş Yap", "button")).click();
  await sleep(3000);
  await go(page, "/tour-seed", 3000);
  const seeded = await page.$eval("#tour-seed", (n) => n.textContent).catch(() => "?");
  console.log("demo:", seeded);
  if (!/^seeded:/.test(seeded)) throw new Error("Demo proje yüklenemedi (/tour-seed)");

  await runTour({
    modules: MODULES,
    pages: { main: page, guest },
    manifest: MANIFEST,
    only: process.argv.slice(2),
    hide: ["div.fixed.top-20.right-4"],
  });
} finally {
  await browser.close();
}

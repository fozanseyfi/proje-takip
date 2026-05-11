// Örnek "Ankara Polatlı GES" projesi için sabit havuzlar
// Tek dosya: isim / firma / makine listesi + WBS plan schedule + quantity override

import type { Discipline, MachineType, FuelType } from "@/lib/store/types";

// ============================================================
// İsim havuzu
// ============================================================
export const MALE_NAMES = [
  "Ahmet", "Mehmet", "Mustafa", "Ali", "Hüseyin", "Hasan", "İbrahim", "Osman", "Yusuf", "Ömer",
  "Murat", "Emre", "Burak", "Serkan", "Cem", "Volkan", "Erdem", "Kadir", "Selim", "Hakan",
  "Tolga", "Onur", "Barış", "Eren", "Yiğit", "Furkan", "Berkay", "Caner", "Halil", "Ramazan",
  "Şener", "Erkan", "Bülent", "Fatih", "İlhan",
];
export const FEMALE_NAMES = [
  "Ayşe", "Fatma", "Emine", "Hatice", "Zeynep", "Elif", "Merve", "Hülya", "Selin", "Esra",
];
export const LAST_NAMES = [
  "Yılmaz", "Demir", "Şahin", "Çelik", "Yıldız", "Yıldırım", "Öztürk", "Aydın", "Özdemir", "Arslan",
  "Doğan", "Kılıç", "Aslan", "Çetin", "Kara", "Koç", "Kurt", "Özkan", "Şimşek", "Polat",
  "Can", "Akın", "Bulut", "Ünal", "Erdoğan", "Aksoy", "Acar", "Kalkan", "Korkmaz", "Çakır",
];

// ============================================================
// Firmalar
// ============================================================
export interface SampleCompany {
  name: string;
  isMain?: boolean;
  scope?: string;
}

export const SAMPLE_COMPANIES: SampleCompany[] = [
  { name: "Kontrolmatik Teknoloji A.Ş.", isMain: true, scope: "Ana yüklenici · Mühendislik · İdari" },
  { name: "Anadolu İnşaat Ltd.", scope: "Saha hazırlık · Temel · Yollar" },
  { name: "Demir Elektrik Sanayi", scope: "AC/DC kablolama · Pano · Topraklama" },
  { name: "Yıldız Mekanik Mont. A.Ş.", scope: "Taşıyıcı sistem · Panel montaj" },
  { name: "Polat Hafriyat Tic.", scope: "Hafriyat · Yol açma" },
  { name: "Güneş Saha Hizmetleri", scope: "Telçit · Çevre düzenlemesi" },
];

// ============================================================
// Disiplin & personel dağılımı (toplam 95)
// ============================================================
export interface DisciplineConfig {
  count: number;
  jobs: string[];
  companies: string[];        // bu disiplinin atanabileceği firmalar
  dailyRateRange: [number, number];   // TRY günlük
  rateCurrency: "TRY";
}

export const PERSONNEL_PLAN: Record<Discipline, DisciplineConfig> = {
  elektrik: {
    count: 22,
    jobs: ["Elektrikçi", "Pano Ustası", "Topraklama Ustası", "Kablo Ustası", "Elektrik Kaynakçı", "Elektrik Tekniker"],
    companies: ["Demir Elektrik Sanayi", "Kontrolmatik Teknoloji A.Ş."],
    dailyRateRange: [1800, 2800],
    rateCurrency: "TRY",
  },
  mekanik: {
    count: 14,
    jobs: ["Mekanikçi", "Kaynakçı", "Vinç Operatörü", "Tesisatçı"],
    companies: ["Yıldız Mekanik Mont. A.Ş."],
    dailyRateRange: [1700, 2600],
    rateCurrency: "TRY",
  },
  insaat: {
    count: 38,
    jobs: [
      "İnşaat Ustası", "Demirci", "Kalıpçı", "Beton Ustası", "Kalfa", "Çırak",
      "Operatör", "Hafriyat İşçisi", "İnşaat İşçisi",
    ],
    companies: ["Anadolu İnşaat Ltd.", "Polat Hafriyat Tic.", "Güneş Saha Hizmetleri"],
    dailyRateRange: [1300, 2200],
    rateCurrency: "TRY",
  },
  muhendislik: {
    count: 9,
    jobs: ["Şantiye Şefi", "Saha Sorumlusu", "Elektrik Mühendisi", "İnşaat Mühendisi", "Mekanik Mühendisi"],
    companies: ["Kontrolmatik Teknoloji A.Ş."],
    dailyRateRange: [3500, 5500],
    rateCurrency: "TRY",
  },
  idari: {
    count: 7,
    jobs: ["İSG Uzmanı", "İdari Personel", "Şoför", "Güvenlik", "Aşçı"],
    companies: ["Kontrolmatik Teknoloji A.Ş.", "Güneş Saha Hizmetleri"],
    dailyRateRange: [1500, 2400],
    rateCurrency: "TRY",
  },
  diger: {
    count: 5,
    jobs: ["Yardımcı Eleman", "Temizlikçi", "Saha Yardımcı"],
    companies: ["Güneş Saha Hizmetleri"],
    dailyRateRange: [1100, 1500],
    rateCurrency: "TRY",
  },
};

// ============================================================
// Makineler (12)
// ============================================================
export interface SampleMachine {
  name: string;
  type: MachineType;
  plate: string;
  company: string;
  fuel: FuelType;
  dailyRate: number;
}

export const SAMPLE_MACHINES: SampleMachine[] = [
  { name: "Komatsu PC200-8", type: "ekskavator", plate: "06 PK 1521", company: "Polat Hafriyat Tic.", fuel: "dizel", dailyRate: 6500 },
  { name: "Hyundai R220LC-9", type: "ekskavator", plate: "06 PK 2034", company: "Polat Hafriyat Tic.", fuel: "dizel", dailyRate: 6200 },
  { name: "Caterpillar 320D2", type: "ekskavator", plate: "42 AB 7741", company: "Anadolu İnşaat Ltd.", fuel: "dizel", dailyRate: 7200 },
  { name: "JCB 3CX Sitemaster", type: "loder", plate: "06 AİL 884", company: "Anadolu İnşaat Ltd.", fuel: "dizel", dailyRate: 4800 },
  { name: "Volvo L120H", type: "loder", plate: "06 PK 3115", company: "Polat Hafriyat Tic.", fuel: "dizel", dailyRate: 5400 },
  { name: "Liebherr LR 1100", type: "vinc", plate: "06 YMN 220", company: "Yıldız Mekanik Mont. A.Ş.", fuel: "dizel", dailyRate: 12500 },
  { name: "Tadano GR-300EX", type: "vinc", plate: "06 YMN 314", company: "Yıldız Mekanik Mont. A.Ş.", fuel: "dizel", dailyRate: 9800 },
  { name: "Manitou MRT 2150", type: "forklift", plate: "06 YMN 471", company: "Yıldız Mekanik Mont. A.Ş.", fuel: "dizel", dailyRate: 3500 },
  { name: "MAN TGS 26.480", type: "kamyon", plate: "06 PK 5102", company: "Polat Hafriyat Tic.", fuel: "dizel", dailyRate: 4200 },
  { name: "Ford Cargo 1832", type: "kamyon", plate: "06 AİL 622", company: "Anadolu İnşaat Ltd.", fuel: "dizel", dailyRate: 3800 },
  { name: "Cat CS54B", type: "silindir", plate: "42 AB 8093", company: "Anadolu İnşaat Ltd.", fuel: "dizel", dailyRate: 4500 },
  { name: "Atlas Copco QAS 200", type: "jenerator", plate: "—", company: "Kontrolmatik Teknoloji A.Ş.", fuel: "dizel", dailyRate: 2800 },
];

// ============================================================
// WBS quantity override (12 MWp / 10 MWe için)
// ============================================================
export const QUANTITY_OVERRIDE: Record<string, number> = {
  "1.3.1.1": 20000,   // Solar Panel — 20.000 × 600W = 12.0 MWp
  "1.3.1.2": 50,      // İnverter — 50 × 200kW = 10.0 MWe AC
  "1.3.1.3": 24000,   // Taşıyıcı Sistem
  "1.3.1.4": 80000,   // Hafriyat (m³)
  "1.3.1.5": 3,       // Trafo
  "1.3.1.6": 14,      // OG Hücreler
  "1.3.1.9": 60000,   // DC Kablo (m)
  "1.4.1.3": 80000,   // Şantiye Yolları (m²)
  "1.4.1.5": 3,       // Temel
  "1.4.1.6": 100,     // Mıcır (m³)
  "1.4.2.1": 14000,   // Delgi
  "1.4.2.2": 14000,   // Kolon
  "1.4.2.3": 24000,   // Kiriş
  "1.4.2.4": 24000,   // Aşık
  "1.4.3.1": 20000,   // Panel Dağıtım
  "1.4.3.2": 20000,   // Panel Montaj
  "1.4.5.1": 60000,   // DC Kablo Çekimi
  "1.4.7.1": 3,       // Trafoların Yerine Konulması
  "1.4.7.2": 14,      // Hücrelerin Montajı
  "1.4.8.2": 2000,    // Telçit (m)
};

// ============================================================
// Plan schedule: her leaf için startDay + durationDays (proje gün 1-120)
// ============================================================
export interface PlanWindow {
  startDay: number;
  durationDays: number;
}
export const PLAN_SCHEDULE: Record<string, PlanWindow> = {
  // Uygulama Öncesi
  "1.1.1.1": { startDay: 1, durationDays: 1 },
  "1.1.2.1": { startDay: 1, durationDays: 3 },

  // Mühendislik · Zemin
  "1.2.1.1": { startDay: 1, durationDays: 5 },
  "1.2.1.2": { startDay: 3, durationDays: 7 },
  "1.2.1.3": { startDay: 5, durationDays: 5 },
  "1.2.1.4": { startDay: 8, durationDays: 7 },
  "1.2.1.5": { startDay: 8, durationDays: 7 },
  "1.2.1.6": { startDay: 5, durationDays: 10 },

  // Mühendislik · Elektrik
  "1.2.2.1": { startDay: 5, durationDays: 5 },
  "1.2.2.2": { startDay: 8, durationDays: 5 },
  "1.2.2.3": { startDay: 10, durationDays: 4 },
  "1.2.2.4": { startDay: 12, durationDays: 6 },
  "1.2.2.5": { startDay: 15, durationDays: 5 },
  "1.2.2.6": { startDay: 18, durationDays: 3 },
  "1.2.2.7": { startDay: 20, durationDays: 7 },

  // Mühendislik · Mekanik
  "1.2.3.1": { startDay: 8, durationDays: 5 },
  "1.2.3.2": { startDay: 12, durationDays: 5 },
  "1.2.3.3": { startDay: 18, durationDays: 4 },

  // Mühendislik · İnşaat
  "1.2.4.1": { startDay: 10, durationDays: 5 },
  "1.2.4.2": { startDay: 12, durationDays: 5 },
  "1.2.4.3": { startDay: 10, durationDays: 4 },
  "1.2.4.4": { startDay: 8, durationDays: 4 },
  "1.2.4.5": { startDay: 12, durationDays: 3 },

  // Procurement
  "1.3.1.1": { startDay: 15, durationDays: 30 },  // Solar Panel
  "1.3.1.2": { startDay: 18, durationDays: 30 },  // İnverter
  "1.3.1.3": { startDay: 15, durationDays: 25 },  // Taşıyıcı Sistem
  "1.3.1.4": { startDay: 12, durationDays: 25 },  // Hafriyat
  "1.3.1.5": { startDay: 25, durationDays: 35 },  // Trafo
  "1.3.1.6": { startDay: 25, durationDays: 30 },  // OG Hücre
  "1.3.1.7": { startDay: 30, durationDays: 25 },  // AC/LV
  "1.3.1.8": { startDay: 30, durationDays: 30 },  // AC/MV
  "1.3.1.9": { startDay: 20, durationDays: 30 },  // DC Kablo

  // İşçilik · İnşaat
  "1.4.1.1": { startDay: 8, durationDays: 5 },
  "1.4.1.2": { startDay: 10, durationDays: 7 },
  "1.4.1.3": { startDay: 15, durationDays: 20 },
  "1.4.1.4": { startDay: 20, durationDays: 15 },
  "1.4.1.5": { startDay: 30, durationDays: 15 },
  "1.4.1.6": { startDay: 35, durationDays: 10 },
  "1.4.1.7": { startDay: 25, durationDays: 25 },

  // İşçilik · Taşıyıcı Sistem
  "1.4.2.1": { startDay: 30, durationDays: 30 },
  "1.4.2.2": { startDay: 35, durationDays: 30 },
  "1.4.2.3": { startDay: 45, durationDays: 35 },
  "1.4.2.4": { startDay: 50, durationDays: 35 },

  // İşçilik · Panel
  "1.4.3.1": { startDay: 60, durationDays: 35 },
  "1.4.3.2": { startDay: 65, durationDays: 40 },

  // İşçilik · AC Kablolama
  "1.4.4.1": { startDay: 60, durationDays: 25 },
  "1.4.4.2": { startDay: 70, durationDays: 30 },
  "1.4.4.3": { startDay: 90, durationDays: 20 },

  // İşçilik · DC Kablolama
  "1.4.5.1": { startDay: 65, durationDays: 40 },
  "1.4.5.2": { startDay: 75, durationDays: 35 },

  // İşçilik · Topraklama
  "1.4.6.1": { startDay: 50, durationDays: 20 },
  "1.4.6.2": { startDay: 55, durationDays: 25 },

  // İşçilik · Trafo & Hücre
  "1.4.7.1": { startDay: 95, durationDays: 10 },
  "1.4.7.2": { startDay: 100, durationDays: 12 },

  // İşçilik · Telçit
  "1.4.8.1": { startDay: 30, durationDays: 10 },
  "1.4.8.2": { startDay: 35, durationDays: 15 },

  // İşçilik · Devreye Alma
  "1.4.9.1": { startDay: 110, durationDays: 7 },
  "1.4.9.2": { startDay: 115, durationDays: 5 },
};

// ============================================================
// Bütçe kategorileri (USD)
// ============================================================
export interface SampleBudgetCat {
  name: string;
  amount: number;
  linkedWbs?: string[];
}
export const BUDGET_CATEGORIES: SampleBudgetCat[] = [
  { name: "Solar Panel", amount: 2_200_000, linkedWbs: ["1.3.1.1"] },
  { name: "İnverter & MV Ekipman", amount: 700_000, linkedWbs: ["1.3.1.2", "1.3.1.5", "1.3.1.6"] },
  { name: "Taşıyıcı Sistem", amount: 750_000, linkedWbs: ["1.3.1.3", "1.4.2"] },
  { name: "Kablo (AC/DC/MV)", amount: 450_000, linkedWbs: ["1.3.1.7", "1.3.1.8", "1.3.1.9"] },
  { name: "İnşaat & Saha", amount: 580_000, linkedWbs: ["1.4.1"] },
  { name: "İşçilik (Genel)", amount: 380_000 },
  { name: "Lojistik & Geçici", amount: 100_000 },
];
// Toplam = 5.160.000 USD

// ============================================================
// Alt yüklenici sözleşmeleri (USD)
// ============================================================
export interface SampleSubcontractor {
  name: string;
  scopeOfWork: string;
  discipline: Discipline;
  contractAmount: number;
  contactName: string;
  phone: string;
}
export const SAMPLE_SUBCONTRACTORS: SampleSubcontractor[] = [
  {
    name: "Anadolu İnşaat Ltd.",
    scopeOfWork: "Saha hazırlık, temel, yollar, drenaj",
    discipline: "insaat",
    contractAmount: 580_000,
    contactName: "Hasan Yılmaz",
    phone: "0532 411 22 67",
  },
  {
    name: "Demir Elektrik Sanayi",
    scopeOfWork: "AC/DC kablolama, pano, topraklama, sonlandırma",
    discipline: "elektrik",
    contractAmount: 720_000,
    contactName: "Mehmet Demir",
    phone: "0532 887 14 90",
  },
  {
    name: "Yıldız Mekanik Mont. A.Ş.",
    scopeOfWork: "Taşıyıcı sistem (delgi/kolon/kiriş/aşık) + panel montajı",
    discipline: "mekanik",
    contractAmount: 1_150_000,
    contactName: "Murat Yıldız",
    phone: "0533 220 11 84",
  },
  {
    name: "Polat Hafriyat Tic.",
    scopeOfWork: "Hafriyat, yol açma, kazı-dolgu",
    discipline: "insaat",
    contractAmount: 320_000,
    contactName: "Osman Polat",
    phone: "0532 552 78 02",
  },
  {
    name: "Güneş Saha Hizmetleri",
    scopeOfWork: "Telçit örme, çevre düzenlemesi, idari servisler",
    discipline: "diger",
    contractAmount: 80_000,
    contactName: "Selim Aksoy",
    phone: "0535 109 34 21",
  },
];

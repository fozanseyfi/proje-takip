# GES Proje Takip

Güneş Enerjisi Santrali (GES) inşa projelerinin mühendislik → satın alma → saha uygulama → devreye alma yaşam döngüsünü uçtan uca takip eden, çoklu kullanıcılı, mobil-uyumlu proje yönetim platformu.

## Mevcut Durum (Faz 0/1 — Lokal İskelet)

**Çalışan:** UI, tüm modüller, mock veri (`localStorage` persist).
**Henüz yok:** Supabase entegrasyonu, gerçek auth, Vercel deploy.

> **Strateji:** Önce lokalde tüm uygulamayı çalıştır, sonra Supabase'e bağla, en son Vercel'e deploy et.

## Modüller

| Modül | Route | Durum |
|---|---|---|
| Dashboard | `/dashboard` | ✅ KPI + S-eğrisi + bugün özet |
| Portfolio Dashboard | `/portfolio` | ✅ Süper Admin · tüm projeler |
| Timeline & Gantt | `/timeline` | ✅ Plan/gerçek çubukları |
| WBS Yapısı | `/wbs` | ✅ Ağaç görünümü, CRUD, soft delete |
| Planlama | `/planning` | ✅ Tarih bazlı miktar girişi |
| Gerçekleşme | `/realization` | ✅ Günlük girişi, kümülatif % |
| Personel Puantajı | `/personnel` | ✅ Checkbox listesi (mobil-first) |
| Makine Puantajı | `/machines` | ✅ Saat + yakıt girişi |
| Master Data — Personel | `/master/personnel` | ✅ CRUD + autocomplete + proje atama |
| Master Data — Makine | `/master/machines` | ✅ CRUD + proje atama |
| Günlük Rapor | `/daily-report` | ✅ Foto + hava mock + özet |
| Satın Alma | `/procurement` | ✅ Çoklu para birimi |
| Faturalandırma | `/billing` | ✅ Manuel fatura takibi |
| Bütçe & CPI | `/budget` | ✅ EV/AC/CPI/EAC hesabı |
| 15-Gün Kritik İşler | `/lookahead` | ✅ Priority + checkbox |
| Projeler | `/projects` | ✅ Liste + yeni proje + DEFAULT_WBS seed |
| Proje Ayarları | `/settings` | ✅ Genel/tarih/finansal |
| Ekip & Davet | `/team` | ✅ Üye + davet (mock e-posta) |
| Public Paylaşım | `/share` | ✅ Token oluştur + link kopyala |
| Çöp Kutusu | `/trash` | ✅ Soft delete + restore |
| Audit Log | `/audit` | ✅ İskelet |
| Yedekleme | `/backup` | ✅ JSON export |
| Profilim | `/account` | ✅ Profil + lokal veri sıfırlama |
| Login | `/login` | ✅ UI placeholder (lokal mod) |
| Davet Kabul | `/invite/[token]` | ✅ Lokal kabul akışı |
| Public Viewer | `/p/[token]` | ✅ Read-only paylaşım sayfası |

## Teknoloji

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **TypeScript** (strict)
- **Tailwind CSS v4** (CSS-first config, `@theme inline`)
- **Zustand** + `persist` (localStorage)
- **Recharts** (S-eğrisi)
- **Lucide React** (ikonlar)
- **date-fns**, **clsx**, **tailwind-merge**

## Kurulum

```bash
npm install
npm run dev -- -p 5000
```

`http://localhost:5000` adresinde açılır. İlk açılışta otomatik seed: 1 örnek proje (Konya GES 1, 79 maddelik DEFAULT_WBS) + 1 süper admin kullanıcı (`ozan.seyfi@kontrolmatik.com`).

## Klasör Yapısı

```
src/
  app/
    (app)/              # Login sonrası modüller — AppShell ile sarılı
      dashboard/
      wbs/
      planning/
      ... (25 modül)
    (auth)/             # Login, invite — minimal layout
    (public)/p/[token]/ # Public read-only viewer
  components/
    ui/                 # Button, Card, Input, Dialog, Table, Badge, Progress, Alert
    layout/             # AppShell, Header, Sidebar, BottomNav, SeedProvider
    charts/             # Recharts wrapper'ları
  lib/
    store/              # Zustand store + types + selector'lar
    calc/               # SPI, S-eğrisi hesabı (HTML'den port)
    data/               # DEFAULT_WBS (79 madde)
    utils.ts            # cn, format helper'ları
docs/
  PRD-GES-Proje-Takip-Platformu-v2.md   # Ürün gereksinim dokümanı
  GES_Proje_Takip_Sistemi_v3.html       # Referans tek dosyalı HTML araç
```

## Tema

HTML referansındaki dark + cyan tema port edildi:

- Arka plan: `#050810` → `#121c30` gradient
- Accent: `#00d4ff` (cyan)
- Plan: `#3d8ef0` (mavi)
- Real: `#00e676` (yeşil)
- SPI seviyeleri: yeşil/sarı/kırmızı
- Fontlar: Inter (gövde), Plus Jakarta Sans (display), JetBrains Mono (sayılar)

## Sonraki Adımlar

1. **Supabase entegrasyonu**
   - PostgreSQL schema + RLS policy'leri (SQL migration)
   - Auth provider'ları (e-posta + Google + Microsoft)
   - Storage (günlük rapor fotoları)
   - `supabase gen types typescript` → tip üretimi
   - Zustand store → Supabase query'lere taşıma
2. **Vercel deploy**
3. **PWA manifest + service worker** (mobil)
4. **Hava durumu API entegrasyonu** (Open-Meteo)
5. **TCMB döviz kuru cron**
6. **PDF rapor üretimi**
7. **Excel import/export** (SheetJS)
8. **E-posta gönderimi** (Resend)

## Komutlar

```bash
npm run dev               # localhost:3000
npm run dev -- -p 5000    # özel port
npm run build             # production build
npm start                 # build sonrası başlat
npm run lint              # ESLint
```

## Referans Dokümanlar

- [PRD v2](docs/PRD-GES-Proje-Takip-Platformu-v2.md) — Ürün gereksinim dokümanı (844 satır)
- [HTML Referans](docs/GES_Proje_Takip_Sistemi_v3.html) — Tek dosyalı orijinal araç (4888 satır)

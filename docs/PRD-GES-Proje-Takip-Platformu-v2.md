# GES Proje Takip Platformu — PRD v2 (Product Requirements Document)

> **Sürüm:** v2.0 (28 Nisan 2026)
> **Hedef:** Mevcut tek dosyalık HTML/localStorage tabanlı GES Proje Takip aracını, çoklu kullanıcılı, e-posta + SSO girişli, rol bazlı yetkilendirmeli, multi-project, mobil-uyumlu bir SaaS platformuna dönüştürmek.
> **Hedef Araç:** Antigravity
> **Bu dokümanda bağlayıcı kararlar ve teknik öneriler ayrı ayrı işaretlenmiştir.**

---

## 1. Ürün Özeti

GES Proje Takip Platformu, Güneş Enerjisi Santrali (GES) inşa projelerinin **mühendislik → satın alma → saha uygulama → devreye alma** yaşam döngüsünü uçtan uca takip eden bir proje yönetim aracıdır. Mevcut araç tek bir kullanıcı için tarayıcıda localStorage ile çalışmaktadır; bu PRD, aracın **çoklu proje + çoklu ekip + rol bazlı yetkilendirme + mobil destek** ile bulut tabanlı bir web uygulamasına dönüştürülmesini tanımlar.

### 1.1 Hedef Kullanıcılar
- **Süper Admin** — sistem geneli yönetici, tüm projeleri/kullanıcıları görür, **Portfolio Dashboard**'a erişir
- **Direktör** — Süper Admin yetkisinde olan, birden fazla projenin sahibi (rol olarak Süper Admin ile aynı yetkilere sahip)
- **Proje Yöneticisi (Project Manager)** — kendi projelerinin tam sahibi
- **Saha Mühendisi / Ekip Lideri** — sahada veri girişi yapan operasyonel kullanıcı (ağırlıklı mobil)
- **Görüntüleyici (Viewer)** — müşteri/yatırımcı, sadece okuma yetkisi
- **Public Link Ziyaretçileri** — login'siz, read-only paylaşılan dashboard'u görenler

### 1.2 Temel Değer Önerisi
- Kâğıt/Excel ile dağınık şekilde tutulan WBS, planlama, gerçekleşme, personel ve makine verilerini **tek platformda** birleştirir.
- **SPI / CPI / Earned Value / Forecasting** gibi endüstri standardı PMP araçlarını hazır sunar.
- E-posta ile davet edilen ekip üyelerinin **rol bazlı yetkilerle** veri girişi/görüntülemesini sağlar.
- **Direktör seviyesi Portfolio Dashboard** ile birden fazla GES projesinin sağlığı tek ekrandan izlenir.
- **Mobil-first** puantaj ve günlük rapor — saha mühendisi telefondan saniyeler içinde veri girer.
- Müşteriye/yatırımcıya **public link** ile şeffaf raporlama.

---

## 2. Teknoloji Stack Önerisi

> **Karar Antigravity'ye bırakılmıştır.** Aşağıdaki stack, modern bir SaaS için **önerilen** seçimdir.

### Önerilen Stack
- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript
- **UI:** Tailwind CSS + shadcn/ui (mevcut HTML'in koyu/cyan teması korunmalı)
- **Mobil yaklaşım:** **PWA** (Progressive Web App) — native app yerine, offline cache + ana ekrana ekle özelliği
- **Charts:** Recharts veya Chart.js (mevcut HTML Chart.js kullanıyor)
- **Backend:** Next.js API Routes / Server Actions
- **DB:** PostgreSQL (Supabase üzerinde)
- **Auth:** Supabase Auth (e-posta/şifre + Google + Microsoft OAuth + Magic Link)
- **ORM:** Prisma veya Drizzle
- **File storage:** Supabase Storage (günlük rapor fotoları, yedekleme dosyaları)
- **E-posta gönderimi:** Resend veya Supabase SMTP
- **Background jobs:** Supabase Edge Functions veya Inngest
- **Deployment:** Vercel
- **PDF üretimi:** react-pdf veya Puppeteer
- **Excel import/export:** SheetJS (xlsx)
- **Hava durumu API:** Open-Meteo (ücretsiz, anahtar gerekmez) veya OpenWeatherMap
- **Döviz kuru API:** TCMB resmi kur servisi veya exchangerate-api.com

### Neden Bu Stack?
- Supabase, **auth + DB + storage + realtime + RLS** sunduğu için multi-tenant yetki kurallarını DB seviyesinde garantiler.
- PWA, native app maliyeti olmadan mobil deneyim sunar; kamera erişimi (foto), offline-first cache, ana ekrana ekle gibi özellikleri destekler.
- Vercel + Next.js, hızlı geliştirme ve sıfır-config deployment.

---

## 3. Authentication & Onboarding

### 3.1 Giriş Yöntemleri
1. **E-posta + Şifre** (klasik)
2. **Google OAuth (SSO)**
3. **Microsoft OAuth (SSO)** — kurumsal Microsoft 365 için
4. **Magic Link** — sadece davet kabul akışında

### 3.2 Kayıt Akışı
- **Açık kayıt yok.** Davete dayalı sistem.
- İlk Süper Admin sistem kurulumunda manuel (env veya seed) tanımlanır.
- Yeni kullanıcı: davet linki → e-posta doğrulanır → şifre/SSO → projeye otomatik dahil.

### 3.3 Şifre Sıfırlama, Oturum, 2FA, Şifre Güvenliği
PRD v1'deki ile aynı (8+ karakter, 1 büyük 1 rakam, 5 deneme→15dk kilit, 2FA opsiyonel TOTP, refresh token rotation).

---

## 4. Veri Modeli (DB Schema)

> Aşağıdaki şema **bağlayıcı**dır. Tablo isimleri Antigravity tarafından değiştirilebilir ama **kavramlar ve ilişkiler korunmalıdır**.

### 4.1 Çekirdek Tablolar

#### `users`
| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid PK | |
| email | text unique | |
| full_name | text | |
| avatar_url | text nullable | |
| is_super_admin | boolean | Sistem geneli yetki (Direktör de bu rolü kullanır) |
| phone | text nullable | |
| auth_provider | enum | `password`, `google`, `microsoft` |
| created_at, updated_at, last_login_at | timestamptz | |

#### `projects`
| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid PK | |
| name | text | "Konya GES 1" |
| location | text | "Konya, Karapınar" |
| latitude | numeric nullable | Hava durumu için |
| longitude | numeric nullable | Hava durumu için |
| wbs_no | text | "1" |
| start_date | date | |
| duration_days | int | |
| planned_end | date | |
| contract_end | date | |
| report_date | date | |
| installed_capacity_mw | numeric nullable | |
| total_budget | numeric nullable | Bütçe modülü için |
| budget_currency | enum | `TRY`, `USD`, `EUR` |
| status | enum | `active`, `archived`, `completed` |
| public_share_token | text nullable unique | read-only public link için |
| public_share_password | text nullable | opsiyonel şifre koruması (hash) |
| public_share_expires_at | timestamptz nullable | |
| created_by | uuid FK→users | |
| created_at, updated_at | timestamptz | |

#### `project_members`
| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK | |
| user_id | uuid FK | |
| role | enum | `project_manager`, `field_engineer`, `viewer` |
| invited_by | uuid FK→users | |
| invited_at, accepted_at | timestamptz | |
| **UNIQUE** (project_id, user_id) | | |

#### `invitations`
PRD v1'deki ile aynı (id, project_id, email, role, token, invited_by, expires_at, accepted_at).

#### `permissions` (Detaylı yetki matrisi)
Her proje için her modül için ayrı izin (can_read, can_write, can_delete).
PRD v1 § 4.2'deki ile aynı.

### 4.2 Master Data Tabloları (YENİ — v2'de eklendi)

> **Mantık:** Personel ve Makine artık **proje bazlı tek-seferlik kayıt** değil. Kullanıcı bir kez tanımlar, tüm projelerde autocomplete ile çağırır.

#### `personnel_master` (Personel Ana Listesi) — YENİ
| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid PK | |
| owner_user_id | uuid FK→users | Bu kaydı oluşturan PM/Süper Admin (havuz sahibi) |
| organization_scope | enum | `personal`, `global` — şimdilik hep `personal`, ileride org desteği |
| first_name | text | |
| last_name | text | |
| tc_kimlik_no | text nullable | 11 haneli TC kimlik (validasyon: Mernis algoritması) |
| company | text | Çalıştığı firma adı |
| discipline | enum | `mekanik`, `elektrik`, `insaat`, `muhendislik`, `idari`, `diger` |
| job_title | text nullable | "Kaynakçı", "Topraklama Ustası", vb. |
| phone | text nullable | |
| start_date | date nullable | İşe başlama tarihi |
| daily_rate | numeric nullable | Günlük yevmiye (özel - sadece PM/Süper Admin görür) |
| daily_rate_currency | enum nullable | `TRY`, `USD`, `EUR` |
| status | enum | `active`, `inactive` |
| notes | text nullable | |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz nullable | **soft delete** |

> **Tekillik kuralı:** TC Kimlik No varsa benzersiz olmalı; yoksa (first_name + last_name + company) kombinasyonu uyarı tetikler ama engellemez.

#### `machines_master` (Makine Ana Listesi) — YENİ
| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid PK | |
| owner_user_id | uuid FK→users | |
| organization_scope | enum | `personal`, `global` |
| name | text | "Komatsu PC200" |
| machine_type | enum | `ekskavator`, `kamyon`, `vinc`, `forklift`, `loder`, `greyder`, `silindir`, `jenerator`, `diger` |
| license_plate | text nullable | "34 ABC 123" |
| company | text | Sahip firma |
| daily_rate | numeric nullable | |
| daily_rate_currency | enum nullable | |
| fuel_type | enum nullable | `dizel`, `benzin`, `elektrik`, `diger` |
| status | enum | `active`, `inactive` |
| notes | text nullable | |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz nullable | **soft delete** |

#### `project_personnel_assignments` — Personel Proje Ataması — YENİ
| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK | |
| personnel_master_id | uuid FK→personnel_master | |
| assigned_from | date | bu projede çalışmaya başladığı tarih |
| assigned_to | date nullable | ayrılış tarihi |
| project_specific_role | text nullable | bu projede özel rolü varsa |
| created_at | timestamptz | |
| **UNIQUE** (project_id, personnel_master_id, assigned_from) | | |

#### `project_machine_assignments` — Makine Proje Ataması — YENİ
Aynı yapı, `machines_master` referansıyla.

### 4.3 İş Verileri (project_id zorunlu)

#### `wbs_items` — İş Kırılım Yapısı
PRD v1'deki ile aynı (code, name, level, parent_code, is_leaf, weight, quantity, unit, discipline, planned_start/end, realized_start/end).
- `deleted_at` eklendi (**soft delete**).

#### `planned_progress`
PRD v1'deki ile aynı.

#### `realized_progress`
PRD v1'deki ile aynı.
- `deleted_at` eklendi (**soft delete**).

#### `personnel_attendance` — Personel Puantajı (DEĞİŞTİ)
| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK | |
| personnel_master_id | uuid FK→personnel_master | (artık doğrudan ana listeye bağlı) |
| date | date | |
| present | boolean | **çalıştı mı?** (varsayılan true, gelmediyse false) |
| hours | numeric | varsayılan 9.0 (1 standart iş günü) |
| location | text nullable | |
| notes | text nullable | |
| recorded_by | uuid FK→users | |
| recorded_at | timestamptz | |
| **UNIQUE** (project_id, personnel_master_id, date) | | |

#### `machine_attendance` — Makine Puantajı (DEĞİŞTİ)
Benzer yapı, `machines_master` referansıyla. `present`, `hours`, `fuel_consumed nullable`.

#### `daily_reports` — Günlük Rapor (DEĞİŞTİ)
| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK | |
| report_date | date | |
| weather | text nullable | API'den otomatik (ör. "Parçalı Bulutlu") |
| temperature_min | numeric nullable | |
| temperature_max | numeric nullable | |
| weather_auto_fetched | boolean | true ise otomatik çekilmiş |
| work_stopped | boolean | hava nedeniyle iş durdu mu? |
| work_stopped_reason | text nullable | |
| summary | text | |
| issues | text nullable | |
| tomorrow_plan | text nullable | |
| photos | jsonb | Storage URL listesi `[{url, caption, uploaded_at}]` |
| created_by | uuid FK→users | |
| created_at, updated_at | timestamptz | |
| **UNIQUE** (project_id, report_date) | | |

#### `procurement_items` — Satın Alma
PRD v1'deki + `currency` alanı (TRY/USD/EUR/...).

#### `billing_items` — Faturalandırma / Hakediş
PRD v1'deki + `currency`. **Manuel** kalır, otomatik üretim yok.

#### `lookahead_items` — 15 Günlük Kritik İşler
PRD v1'deki ile aynı.

### 4.4 Bütçe & CPI Tabloları (YENİ MODÜL)

#### `budget_categories` — Bütçe Kategorileri
| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK | |
| name | text | "Solar Panel", "İşçilik", "Lojistik", "İnşaat" |
| planned_amount | numeric | |
| currency | enum | |
| linked_wbs_codes | text[] nullable | hangi WBS maddeleriyle ilişkili |
| sort_order | int | |

#### `budget_actuals` — Gerçekleşen Maliyet Kayıtları
| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK | |
| category_id | uuid FK→budget_categories | |
| date | date | |
| amount | numeric | |
| currency | enum | |
| amount_in_project_currency | numeric | otomatik dönüştürülmüş tutar |
| description | text nullable | |
| invoice_ref | text nullable | |
| recorded_by | uuid FK→users | |
| recorded_at | timestamptz | |

#### `exchange_rates` — Döviz Kurları (cache)
| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid PK | |
| date | date | |
| from_currency, to_currency | enum | |
| rate | numeric | |
| source | text | "TCMB" |
| **UNIQUE** (date, from_currency, to_currency) | | |

> Günlük TCMB kurları cron job ile çekilir ve cache'lenir. Kullanıcı manuel kur girebilir (override).

### 4.5 Audit Log
PRD v1'deki ile aynı (action, entity_type, entity_id, before_value, after_value, ip, user_agent).

### 4.6 Bildirim Tablosu

#### `notifications`
| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| project_id | uuid FK nullable | |
| type | enum | `invitation`, `task_overdue`, `deadline_approaching`, `spi_critical`, `cpi_critical`, `daily_report_published`, ... |
| title | text | |
| body | text | |
| link | text nullable | tıklandığında gidilecek route |
| read_at | timestamptz nullable | |
| created_at | timestamptz | |

### 4.7 Soft Delete Kapsamı

> **Soft delete olan tablolar:**
> - `wbs_items`
> - `personnel_master` ve `personnel_attendance`
> - `machines_master`
> - `realized_progress`
>
> Diğer tablolarda hard delete (audit log her şeyi kaydediyor).
> "Çöp Kutusu" UI'ı `deleted_at IS NOT NULL` kayıtları gösterir, geri yükleme butonu ile `deleted_at` NULL'a çekilir. **30 gün sonra otomatik hard delete** (cron job).

### 4.8 Modül Listesi (`module` enum)
```
dashboard
portfolio_dashboard          # YENİ - sadece Süper Admin görür
timeline_gantt
procurement
billing
budget_cpi                   # YENİ
daily_report
wbs
planning
realization
personnel
machines
project_settings
team_management
master_data_personnel        # YENİ
master_data_machines         # YENİ
trash                        # YENİ - soft delete edilen kayıtlar
audit_log
backup_restore               # YENİ
```

### 4.9 Varsayılan Yetki Matrisi (GÜNCELLENDİ)

| Modül | Süper Admin | Project Manager | Field Engineer | Viewer |
|---|:-:|:-:|:-:|:-:|
| Dashboard | RWD | RW | R | R |
| **Portfolio Dashboard** | RWD | – | – | – |
| Timeline & Gantt | RWD | RW | R | R |
| WBS Yapısı | RWD | RW | R | R |
| Planning | RWD | RW | R | R |
| Realization | RWD | RW | **RW** | R |
| Personnel | RWD | RW | **RW** (puantaj) | R |
| Machines | RWD | RW | **RW** (puantaj) | R |
| Daily Report | RWD | RW | **RW** | R |
| Procurement | RWD | RW | R | R |
| Billing | RWD | RW | – | R |
| **Budget & CPI** | RWD | RW | – | – (gizli) |
| **Master Data Personnel** | RWD | RW | R (sadece autocomplete) | – |
| **Master Data Machines** | RWD | RW | R | – |
| Project Settings | RWD | RW | – | – |
| Team Management | RWD | RW | – | – |
| **Trash** | RWD | RW | – | – |
| Audit Log | R | R | – | – |
| **Backup/Restore** | RWD | RW | – | – |

---

## 5. Modül Detayları

> Mevcut HTML'in 11 sekmesi taşınacak + yeni modüller eklenecek.

### 5.1 Dashboard (Proje Bazlı) 📊
PRD v1 § 5.1 ile aynı + **Forecasting kartı** (bkz. § 5.13).

### 5.2 **Portfolio Dashboard** 🌐 (YENİ)
**Amaç:** Direktör/Süper Admin için tüm projelerin tek-bakışta sağlık görünümü.

**Bileşenler:**
- **Proje kart grid'i:** Her proje için bir kart
  - Proje adı, lokasyon, kurulu güç (MW)
  - SPI (renk: yeşil/sarı/kırmızı)
  - CPI (renk: yeşil/sarı/kırmızı)
  - İlerleme yüzdesi (planlanan vs gerçekleşen)
  - Tahmini bitirme tarihi (forecast)
  - Açık kritik iş sayısı
  - Son güncelleme zamanı
- **Karşılaştırma tablosu:** Tüm projelerin SPI/CPI/ilerleme/forecast değerleri yan yana sıralanmış
- **Filtreler:** Status (active/completed/archived), lokasyon, PM
- **Sıralama:** En kritik (en düşük SPI veya CPI) üstte
- **Toplu KPI'lar:** Tüm projelerin ortalama SPI, toplam yatırım, toplam kalan iş
- **Harita görünümü** (opsiyonel): Türkiye haritası üzerinde proje konumları, renk kodlu

**Erişim:** Sadece Süper Admin (Direktör).

### 5.3 Timeline & Gantt ◈
PRD v1 § 5.2 ile aynı.

### 5.4 Satın Alma 🛒
PRD v1 + çoklu para birimi desteği.

### 5.5 Faturalandırma 💰
PRD v1 ile aynı, **manuel kalır**.

### 5.6 **Bütçe & CPI** 💵 (YENİ)
**Amaç:** Proje finansal sağlığı, ana iş takibinden ayrı bir modül.

**Bileşenler:**
- **Bütçe kategorileri** tanımlama (Solar Panel, İşçilik, Lojistik, vb.)
- Her kategoriye **planlanan tutar**
- **Gerçekleşen tutar** kayıtları (tarih, tutar, açıklama, fatura referansı)
- **CPI hesabı:** `CPI = Earned Value (EV) / Actual Cost (AC)`
  - EV = WBS gerçekleşme yüzdesi × kategori planlanan bütçe
  - AC = bugüne kadar girilmiş gerçekleşen maliyet toplamı
- **Sapma tablosu:** Her kategori için Planlanan / Gerçekleşen / Sapma % / Kalan bütçe
- **Tahmini Final Maliyeti (EAC)** — Forecasting'le entegre
- **Çoklu para birimi:** Her kayıt kendi para biriminde girilir, otomatik proje para birimine dönüştürülür (TCMB kuru)
- **Grafik:** Zaman serisi - planlanan vs gerçekleşen kümülatif

**Görünürlük:** Sadece Süper Admin ve PM. Field Engineer ve Viewer **göremez**.

### 5.7 Günlük Rapor 📋 (GÜNCELLENDİ)
**Yeni özellikler:**
- **Hava durumu otomatik:** Proje konumuna göre Open-Meteo/OpenWeatherMap API'sinden çekilir (tarih + lat/long → hava + min/max sıcaklık).
- **İş durdu flag'i:** Hava kötüyse (yağmur, fırtına) otomatik aktif olur ama kullanıcı override edebilir.
- **Çoklu foto:** Her rapora birden fazla foto yüklenebilir, her birinin caption'ı olur. Fotolar Supabase Storage'a yüklenir.
- **Mobil-first:** Telefon kamerasından doğrudan foto çekme (`<input type="file" accept="image/*" capture>`).
- **Otomatik dahil edilenler:**
  - O gün çalışan personel sayısı (puantajdan)
  - O gün çalışan makine sayısı (puantajdan)
  - O gün gerçekleşen WBS aktiviteleri (realization'dan)
- **PDF export** + **e-posta ile gönder** (proje üyelerine).

### 5.8 WBS Yapısı 🗂️
PRD v1 ile aynı + soft delete.

### 5.9 Planlanan 📅
PRD v1 ile aynı.

### 5.10 Gerçekleşme ✅ (GÜNCELLENDİ)
**Yeni:**
- **Mobil giriş optimizasyonu**
- **Soft delete** (yanlışlıkla silinen kayıt çöp kutusundan geri alınabilir)
- ~~Foto + GPS~~ — **kapsam dışı.** Foto sadece günlük raporda eklenir.

### 5.11 Personel 👷 (GÜNCELLENDİ)
**Yeni Personel Master Data Akışı:**

#### Kayıt Akışı
1. PM/Süper Admin **Master Data → Personel** sekmesine girer
2. "Yeni Personel" butonu → modal açılır
3. Bilgileri girer: Ad, Soyad, TC, Şirket, Disiplin, Görev, Telefon, İşe Başlama, Yevmiye (opsiyonel)
4. Kaydedilince `personnel_master` tablosuna eklenir
5. Sonra "Bu projeye ata" → `project_personnel_assignments` kaydı oluşur

#### Puantaj Girişi (Field Engineer'ın günlük işi)
1. **Tarih seçici** üstte (varsayılan: bugün)
2. **Otomatik checkbox listesi:** Bu projeye atanmış tüm personel listelenir, **varsayılan hepsi işaretli (geldi)**
3. Field Engineer sadece **gelmeyenlerin tikini kaldırır**
4. Standart saat alanı (varsayılan 9 saat) — istisna durumlarda satır bazında değiştirilebilir
5. "Kaydet" → `personnel_attendance` tablosuna toplu insert
6. **Mobil özel:** swipe ile bir günden diğerine geçiş, hızlı toplu işaretleme

#### Autocomplete Akışı (Eski Tip Tek Tek Giriş için)
- Eğer kullanıcı "ahm" yazdığında:
  - Master listede arama yapılır (first_name + last_name + company içinde)
  - Eşleşen sonuçlar dropdown'da gösterilir
  - Kullanıcı seçer → tüm bilgiler otomatik dolar
  - Eşleşme yoksa → "**+ Yeni Personel Ekle: 'ahm'**" butonu çıkar
  - Tıklanınca modal açılır, soyad/şirket vs. tamamlanır, master'a eklenir, projeye atanır
- **Kural:** Kayıtlı olmayan kimse puantaja eklenemez. Ya master'da olmalı ya yeni kayıt yapılmalı.

#### Personel Listesi Görünümü (PM için)
- Tüm projelerde çalışmış personel listesi (Master Data sekmesinde)
- Filtreler: şirket, disiplin, status
- Her personel için: hangi projelerde çalıştı, toplam adam-saat, ortalama yevmiye
- **CSV/Excel export**

### 5.12 Makine 🚜 (GÜNCELLENDİ)
**Personel ile aynı master data akışı:**
- `machines_master` ana liste
- `project_machine_assignments` proje ataması
- Autocomplete (plaka veya isim ile arama)
- Hızlı checkbox puantajı

### 5.13 **Forecasting** (Tahmini Bitirme & Bütçe) 🔮 (YENİ - Dashboard'a entegre)
**Hesaplama mantığı:**
- **Tahmini bitirme tarihi:** Son 30 günün gerçekleşme hızı baz alınır → kalan iş ÷ günlük ortalama hız → tahmini gün → bitiş tarihi
- **Tahmini final bütçesi (EAC):** `EAC = AC + (BAC - EV) / CPI`
  - BAC = Budget at Completion (toplam planlanan bütçe)
  - EV = Earned Value
  - AC = Actual Cost
  - CPI = Cost Performance Index
- Dashboard'da kart olarak gösterilir, **planlanan tarih ile arasındaki sapma vurgulanır**.

### 5.14 Proje Ayarları ⚙️
PRD v1 + yeni alanlar:
- Proje konum (lat/long) — hava durumu için
- Proje para birimi (TRY/USD/EUR)
- **Public share link** yönetimi (oluştur, şifre koy, süre belirle, iptal et)
- Bildirim tercihleri (proje bazında SPI/CPI eşik değerleri)

### 5.15 **Çöp Kutusu** 🗑️ (YENİ)
- Soft delete edilen kayıtlar (WBS, Personel master, Makine master, Realized Progress)
- Filtreler: tablo tipi, silme tarihi, silen kullanıcı
- "Geri Yükle" butonu
- "Kalıcı Sil" butonu
- 30 gün sonra otomatik hard delete (cron)

### 5.16 **Yedekleme & Geri Yükleme** 💾 (YENİ)
**Yedekleme:**
- "Bu Projeyi Yedekle" butonu → Excel paketi (.xlsx) üretir
  - Her sekme bir sheet: WBS, Planning, Realization, Personnel, Machines, Daily Reports, Procurement, Billing, Budget
  - Foto URL'leri ayrı sheet'te (referans olarak)
- **Otomatik haftalık yedek:** PM'in e-postasına Pazar gece 23:00'te otomatik gönderilir (opsiyonel toggle)

**Geri Yükleme:**
- Excel paketi yükle → preview göster → onaylanırsa import et
- Çakışma stratejisi seçimi: "üzerine yaz" / "yeni kayıt olarak ekle" / "atla"
- Audit log'a "Bulk Restore" olarak kaydedilir

### 5.17 **Audit Log Görüntüleme**
PRD v1 + filtreler:
- Tarih aralığı
- Kullanıcı
- Aksiyon tipi
- Tablo
- Export to CSV

---

## 6. Public Share Link 🔗 (YENİ)

### 6.1 Akış
1. PM, Proje Ayarları → "Public Share Link" sekmesine girer
2. "Link Oluştur" butonu → token üretilir
3. Opsiyonel:
   - Şifre koruması (hash'lenmiş)
   - Geçerlilik süresi (örn. 30 gün)
   - Hangi modüller erişilebilir: ☑ Dashboard, ☑ S-Eğrisi, ☑ Daily Report (foto+özet), ☐ Bütçe (default kapalı), ☐ Personel detay
4. Link kopyalanır → müşteriye gönderilir
5. Müşteri linke tıklar → opsiyonel şifre → **read-only dashboard** görür
6. PM istediği zaman "İptal Et" ile token'ı geçersizleştirir

### 6.2 Public View Özellikleri
- Sadece okuma. Hiçbir buton, düzenleme yok.
- Watermark: "[Proje Adı] - Read-only paylaşım"
- Personel TC kimlik no, yevmiye gibi hassas veriler **gizli**
- Audit log: Public link tıklamaları sayıcı (kim hangi IP'den ne zaman baktı)
- Mobil-uyumlu

---

## 7. Bildirimler

### 7.1 E-posta Bildirimleri
- Davet, davet kabul edildi, görev gecikti, termin yaklaşıyor (3 gün kala)
- Günlük rapor yayınlandı (opsiyonel)
- **SPI < 0.85** → PM ve Süper Admin
- **CPI < 0.90** → PM ve Süper Admin (yeni)
- Şifre sıfırlama, 2FA kodu

### 7.2 In-App Bildirim Merkezi
- Header'da çan ikonu + sayaç
- "Tümünü okundu" butonu
- ~~Push notification~~ — **kapsam dışı**

### 7.3 Bildirim Tercihleri
Kullanıcı her tip için açık/kapalı, frequency (anında/günlük özet/haftalık).

---

## 8. Export & Raporlama

### 8.1 Excel/CSV Export
- WBS, Personel listesi, Personel puantaj, Makine listesi, Makine puantaj, Realization, Procurement, Billing, Budget, Audit Log, **Personel Master Data**, **Makine Master Data**

### 8.2 PDF Raporlar
- Günlük durum raporu (foto, hava, özet)
- Haftalık yönetim raporu (KPI, S-eğrisi, kritik işler)
- Aylık ilerleme raporu
- Hakediş raporu
- **Portfolio özet raporu** (yeni — direktör için tüm projeler)

### 8.3 Excel/CSV Import
- WBS şablonu
- Personel master toplu yükleme
- Makine master toplu yükleme
- Planlama verisi
- Hata raporu

---

## 9. Hava Durumu API Entegrasyonu (YENİ)

### 9.1 Akış
- Cron job, her sabah 06:00'da tüm aktif projelerin konumuna göre o günün hava durumu tahminini çeker → `daily_reports` taslağı oluşturur (henüz kaydedilmemiş)
- Field Engineer günlük raporu açtığında veriler önceden dolu gelir
- Geçmiş tarihler için historical weather API çağrısı (Open-Meteo destekler)

### 9.2 Veri Alanları
- Genel durum (clear, partly_cloudy, rain, snow, storm)
- Min/Max sıcaklık (°C)
- Yağış miktarı (mm)
- Rüzgar hızı (km/h)
- "İş durdu" otomatik flag: rain > 5mm OR wind > 50km/h OR storm

### 9.3 API Tercihi
- **Önerilen: Open-Meteo** (https://open-meteo.com)
  - Ücretsiz, anahtar gerektirmez
  - Geçmiş + tahmin destekli
  - Türkiye için doğruluk yüksek
- Alternatif: OpenWeatherMap (anahtar gerekir, ücretsiz tier 60 çağrı/dk)

---

## 10. Çoklu Para Birimi (YENİ)

### 10.1 Desteklenen Para Birimleri
TRY, USD, EUR (genişletilebilir)

### 10.2 Akış
- Her parasal alan (procurement.unit_price, billing.amount, budget_actuals.amount) kendi para biriminde girilir
- Proje varsayılan para birimi (proje ayarlarından) seçilir
- **TCMB kuru** her gün 16:00'da cron ile çekilir (`exchange_rates` cache)
- Görüntülemede her tutar yanında "≈ proje para biriminde X" gösterilir
- Geçmiş tarihte yapılan harcamalar **o günün kuruyla** dönüştürülür
- Manuel kur override: "Bu kayıt için kuru manuel gir" seçeneği

### 10.3 API Tercihi
- TCMB resmi XML servisi: `https://www.tcmb.gov.tr/kurlar/today.xml`
- Backup: exchangerate-api.com

---

## 11. Mobil Deneyim (YENİ)

### 11.1 PWA Yaklaşımı
- Next.js PWA plugin (next-pwa veya manuel manifest + service worker)
- Ana ekrana ekle
- Offline cache (puantaj girişi offline yapılabilir, online olunca senkronize)

### 11.2 Mobil-First Optimizasyon Sayfaları
- **Puantaj** (personel + makine) — checkbox listesi, swipe, tek tap
- **Günlük Rapor** — kameradan foto, hava otomatik dolu
- **Realization** — basit form, son kullanılan WBS hızlı erişim
- **Dashboard** — özet kartlar (detay grafikler masaüstünde daha iyi)

### 11.3 Diğer Modüller (Masaüstü-First)
- WBS, Timeline & Gantt, Bütçe, Master Data, Audit Log: Mobilde **görüntülenebilir** ama düzenleme masaüstünde önerilir.
- Mobilde "büyük ekranda aç" linki gösterilir.

---

## 12. Ekip Yönetimi & Davet
PRD v1 § 6 ile aynı.

---

## 13. UI/UX Yönergeleri

### 13.1 Görsel Stil
PRD v1 § 10 ile aynı (koyu/cyan tema, Inter/Plus Jakarta Sans/JetBrains Mono).

### 13.2 Layout
- **Header:** logo + proje seçici dropdown + arama + bildirim çanı + kullanıcı menüsü
- **Sol Sidebar:** modül navigasyonu
- **Sağ İçerik:** seçili modül
- **Mobil:** bottom navigation bar (Dashboard, Puantaj, Rapor, Realization, ...)
- **Süper Admin için:** üst-sağda "Portfolio'ya Geç" butonu

### 13.3 Erişilebilirlik & Çoklu Dil
PRD v1 ile aynı (WCAG AA, Türkçe MVP, EN sonradan).

---

## 14. Güvenlik & Yasal

### 14.1 Veri Güvenliği
- RLS (Row Level Security) tüm tablolarda
- HTTPS, rate limiting, CSRF, XSS koruması
- **Public link token'ları:** Cryptographically secure (en az 32 byte random)
- **Public link şifresi:** bcrypt hash

### 14.2 Veri Saklama
- AB veya TR bölgesinde
- Soft delete: kritik tablolar 30 gün, sonra hard delete
- KVKK uyumu: kullanıcı kendi verisini silebilir

### 14.3 Hassas Veri Maskeleme
- **TC Kimlik No** sadece PM/Süper Admin görür (Field Engineer için **••• maskesi**)
- **Yevmiye** sadece PM/Süper Admin görür
- **Public share** linkinde **TC ve yevmiye gizli**

---

## 15. Geliştirme Aşamaları

### Faz 1 — Temel Altyapı (1. Sprint)
- Auth (e-posta + Google + Microsoft)
- DB schema + RLS
- Project CRUD
- Team management (davet + rol)
- Basit Dashboard iskeletu
- **Master Data tabloları (boş ama hazır)**

### Faz 2 — Ana Modüller (2-3. Sprint)
- WBS (CRUD + import/export)
- Planlanan & Gerçekleşme
- **Personel Master Data + autocomplete + checkbox puantajı**
- **Makine Master Data + checkbox puantajı**
- Günlük Rapor + **hava durumu API**
- **Mobil-first optimizasyon (puantaj, rapor, realization)**

### Faz 3 — İleri Modüller (4. Sprint)
- Timeline & Gantt
- Satın Alma & Faturalandırma
- **Bütçe & CPI modülü** + **çoklu para birimi**
- S-eğrisi, SPI, CPI hesapları
- 15-Gün Kritik İşler
- **Forecasting**

### Faz 4 — Polish & Direktör Özellikleri (5. Sprint)
- **Portfolio Dashboard**
- **Public Share Link**
- Bildirimler (e-posta + in-app)
- PDF rapor üretimi
- Excel import/export tüm modüller
- **Soft Delete + Çöp Kutusu**
- **Yedekleme/Geri Yükleme** (Excel paketi)
- Audit log UI

### Faz 5 — Sonra
- HTML'den veri göçü modülü
- 2FA
- Webhook API (3. parti entegrasyon)
- Çoklu dil (EN)
- Native mobil app (PWA yetersiz kalırsa)

---

## 16. Başarı Kriterleri (Acceptance Criteria)

**Kimlik & Yetki**
- [ ] E-posta + şifre, Google SSO, Microsoft SSO ile giriş çalışıyor
- [ ] Davet linki ile yeni kullanıcı projeye dahil olabiliyor
- [ ] Yetki matrisi modül bazında özelleştirilebiliyor
- [ ] Yetkisiz kullanıcı yazma butonu göremiyor (UI + API seviyesinde)

**Master Data**
- [ ] Personel master listesinde "ahm" yazınca eşleşen sonuçlar gelir
- [ ] Eşleşme yoksa "+ Yeni Personel Ekle" butonu çıkar
- [ ] Master'da olmayan biri puantaja eklenemez
- [ ] Aynı yapı makine için de çalışır

**Saha Operasyon**
- [ ] Mobilde puantaj checkbox listesi açılır, varsayılan herkes işaretli
- [ ] Sadece gelmeyenleri unchecking ile günlük puantaj < 30 saniyede biter
- [ ] Günlük raporda hava otomatik dolu gelir
- [ ] Birden fazla foto telefon kamerasından eklenebilir

**KPI & Forecasting**
- [ ] SPI < 0.85 olduğunda PM'e e-posta gider
- [ ] CPI < 0.90 olduğunda PM'e e-posta gider
- [ ] Dashboard'da tahmini bitirme tarihi ve tahmini final bütçe görünür
- [ ] Çoklu para birimi: USD harcama TCMB kuruyla TRY'ye dönüştürülmüş gösterilir

**Direktör Görünümü**
- [ ] Süper Admin Portfolio Dashboard'da tüm projeleri tek ekranda görür
- [ ] Her projenin SPI, CPI, ilerleme, forecast değerleri renkli gösterilir
- [ ] En kritik proje üstte sıralanır

**Public Share**
- [ ] PM read-only public link oluşturabiliyor
- [ ] Şifre korumalı link oluşturulabiliyor
- [ ] Public link'te TC ve yevmiye gizli
- [ ] PM linki iptal edebiliyor

**Veri Yönetimi**
- [ ] Çöp kutusu silinen WBS/Personel/Makine/Realization kayıtlarını gösterir
- [ ] "Geri Yükle" çalışır
- [ ] Excel yedek paketi tüm verileri içerir
- [ ] Excel paketinden geri yükleme çalışır (preview + onay)

**Mobil**
- [ ] PWA olarak ana ekrana eklenebiliyor
- [ ] Offline puantaj girişi sonra senkronize oluyor
- [ ] Puantaj, günlük rapor, realization mobil-first

**UI**
- [ ] Mevcut HTML'in koyu/cyan teması korunmuş
- [ ] Mobil bottom-nav çalışıyor

---

## 17. Kapsam Dışı (Açıkça)

> Bu maddeler **bu sürümde yapılmayacak**:

- **Risk & Issue Yönetimi modülü** — 15 günlük kritik işler listesi yeterli kabul edildi
- **Doküman yönetimi** (kontrat, çizim arşivi) — Drive/SharePoint kullanılacak
- **Otomatik hakediş üretimi** — manuel kalıyor
- **Push notification** — in-app + e-posta yeterli
- **Alt yüklenici (subcontractor) izolasyonu** — personel/makine kaydında "company" alanı yeterli
- **GPS tagged foto** (realization'da) — foto sadece günlük raporda
- **Native iOS/Android app** — PWA yeterli
- **Stripe / paid SaaS billing** — bu sürümde değil

---

## 18. Antigravity'ye Notlar

1. **Mevcut HTML dosyası** (`Proje_Takip__1_.html`) referans olarak verilecektir. UI bileşenlerini, hesaplama mantıklarını (SPI, S-eğrisi, ağırlık hesapları, default WBS şablonu) **mevcut JS kodundan birebir okuyup** TypeScript'e port et.
2. **Default WBS şablonu** (~100 madde) mevcut HTML'in `DEFAULT_WBS` array'inden alınmalı ve seed data olarak yüklenmelidir.
3. **Master Data önemli:** `personnel_master` ve `machines_master` tabloları **proje bağımsızdır**. Her projeye ayrı atama yapılır. Autocomplete'in 50ms altında dönmesi için DB index gerekir (`first_name`, `last_name`, `tc_kimlik_no`, `company` üzerinde).
4. **Tüm form girişlerinde Türkçe** yer tutucu metinler.
5. **Tarih formatları:** UI `DD.MM.YYYY`, DB `YYYY-MM-DD`.
6. **Para birimi:** Proje varsayılanı seçilir, her tutar girişinde currency seçici olur.
7. **Hesaplama yoğun işlemleri** (S-eğrisi, SPI, CPI, EAC, Gantt CPM) frontend'de yap.
8. **Realtime updates:** Supabase Realtime — özellikle Daily Report, Realization, Puantaj.
9. **TypeScript strict mode** açık; `any` yasak.
10. **Test:** Auth, davet, yetki, autocomplete akışları için Playwright e2e.
11. **README.md** ile proje kurulumu, env değişkenleri, deployment adımları belgelensin.
12. **Mobil-first özellikler için ayrı route grupları** (`/m/timesheet`, `/m/daily-report`, `/m/realization`) düşünülebilir, veya responsive ile tek route'tan halledilebilir — Antigravity'nin tercihi.
13. **Hava durumu API'si** için cache stratejisi: aynı tarih + aynı konum 24 saat cache'lensin.
14. **Public share link** route'u: `/p/[token]` — auth bypass, RLS public read için ayrı policy.
15. **Cron job'lar:** Pazar gece otomatik yedek, her sabah hava durumu çekme, her 16:00 TCMB kuru çekme, her gün 30+ gün önceki soft-deleted kayıtları hard delete.

---

**Sürüm:** v2.0
**Tarih:** 28 Nisan 2026
**Hazırlayan:** Claude (Anthropic) — kullanıcı brief'i + iteratif keşif soruları temelinde
**Hedef Araç:** Antigravity
**Önceki Sürüm:** v1.0 (aynı tarih)

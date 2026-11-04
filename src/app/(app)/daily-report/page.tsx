"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudFog,
  CloudSun,
  Sun,
  CloudSnow,
  Camera,
  X,
  Save,
  RefreshCw,
} from "lucide-react";
import { useStore, useCurrentProject, useCurrentUser, useProjectWbs, useProjectRealized } from "@/lib/store";
import type { DailyReport } from "@/lib/store/types";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatDate, toISODate, daysBetween } from "@/lib/utils";
import { compressImage, deletePhoto, putPhoto, useResolvedPhotoUrls } from "@/lib/data/photo-store";

type Photo = DailyReport["photos"][number];

/** Hava durumu — manuel seçim listesi */
const WEATHER_OPTIONS = [
  "Açık / Güneşli",
  "Az bulutlu",
  "Parçalı bulutlu",
  "Çok bulutlu",
  "Kapalı",
  "Sisli / Puslu",
  "Hafif yağmurlu",
  "Yağmurlu",
  "Sağanak yağışlı",
  "Gök gürültülü fırtına",
  "Karla karışık yağmur",
  "Kar yağışlı",
  "Dolu",
  "Tozlu / Kum fırtınası",
  "Dondurucu soğuk / Buzlanma",
  "Aşırı sıcak",
];

const WIND_OPTIONS = ["Sakin", "Hafif rüzgarlı", "Orta rüzgarlı", "Kuvvetli rüzgarlı", "Fırtına"];

function weatherIcon(condition?: string) {
  const c = (condition ?? "").toLocaleLowerCase("tr");
  if (!c) return <Cloud size={18} className="text-text3" />;
  if (c.includes("gök gürültülü") || c.includes("fırtına")) return <CloudLightning size={18} className="text-purple" />;
  if (c.includes("kar") || c.includes("dolu") || c.includes("buz")) return <CloudSnow size={18} className="text-blue" />;
  if (c.includes("yağmur") || c.includes("sağanak")) return <CloudRain size={18} className="text-blue" />;
  if (c.includes("sis") || c.includes("pus") || c.includes("toz")) return <CloudFog size={18} className="text-text2" />;
  if (c.includes("az bulutlu") || c.includes("parçalı")) return <CloudSun size={18} className="text-yellow" />;
  if (c.includes("güneş") || c.includes("açık") || c.includes("sıcak")) return <Sun size={18} className="text-yellow" />;
  return <Cloud size={18} className="text-text2" />;
}

function parseNum(v: string): number | undefined {
  if (v.trim() === "") return undefined;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

export default function DailyReportPage() {
  const project = useCurrentProject();
  const user = useCurrentUser();
  const reports = useStore((s) => s.dailyReports);
  const upsertReport = useStore((s) => s.upsertDailyReport);
  const personnelAttendance = useStore((s) => s.personnelAttendance);
  const machineAttendance = useStore((s) => s.machineAttendance);
  const wbs = useProjectWbs(project?.id);
  const realized = useProjectRealized(project?.id);

  const [date, setDate] = useState(toISODate(new Date()));

  // Proje seçilince/değişince tarih aralık dışındaysa otomatik klamp et
  useEffect(() => {
    if (!project) return;
    const td = toISODate(new Date());
    const max = project.plannedEnd < td ? project.plannedEnd : td;
    if (date < project.startDate) setDate(project.startDate);
    else if (date > max) setDate(max);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  const existing = useMemo(
    () => reports.find((r) => r.projectId === project?.id && r.reportDate === date),
    [reports, project, date]
  );

  // Hava durumu — manuel seçim
  const [weather, setWeather] = useState("");
  const [wind, setWind] = useState("");
  const [tempMin, setTempMin] = useState("");
  const [tempMax, setTempMax] = useState("");

  const [summary, setSummary] = useState("");
  const [issues, setIssues] = useState("");
  const [tomorrowPlan, setTomorrowPlan] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [workStopped, setWorkStopped] = useState(false);
  const [workStoppedReason, setWorkStoppedReason] = useState("");

  const photoUrls = useResolvedPhotoUrls(photos.map((p) => p.url));

  // Tarihten existing'i ilkleme — state'i resetle
  useEffect(() => {
    setWeather(existing?.weather ?? "");
    setWind(existing?.wind ?? "");
    setTempMin(existing?.temperatureMin != null ? String(existing.temperatureMin) : "");
    setTempMax(existing?.temperatureMax != null ? String(existing.temperatureMax) : "");
    setSummary(existing?.summary ?? "");
    setIssues(existing?.issues ?? "");
    setTomorrowPlan(existing?.tomorrowPlan ?? "");
    setPhotos(existing?.photos ?? []);
    setWorkStopped(existing?.workStopped ?? false);
    setWorkStoppedReason(existing?.workStoppedReason ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, existing?.id]);

  const toast = useToast((s) => s.push);

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const files = input.files ? Array.from(input.files) : [];
    if (files.length === 0) return;
    setPhotoBusy(true);
    try {
      const added: Photo[] = [];
      for (const f of files) {
        const dataUrl = await compressImage(f);
        const ref = await putPhoto(dataUrl);
        added.push({ url: ref, uploadedAt: new Date().toISOString() });
      }
      setPhotos((p) => [...p, ...added]);
      toast(`${added.length} fotoğraf eklendi — kaydetmeyi unutma`, "info");
    } catch (err) {
      console.error(err);
      toast("Fotoğraf eklenemedi (tarayıcı depolaması kullanılamıyor)", "error");
    } finally {
      setPhotoBusy(false);
      input.value = ""; // aynı dosya tekrar seçilebilsin
    }
  }

  function removePhoto(idx: number) {
    setPhotos((p) => p.filter((_, i) => i !== idx));
  }

  /** Formu kaydeder; başarılıysa kaydedilen raporu döner. */
  function save(opts: { silent?: boolean } = {}): DailyReport | undefined {
    if (!project || !user) return undefined;
    const tMin = parseNum(tempMin);
    const tMax = parseNum(tempMax);
    let saved: DailyReport;
    try {
      saved = upsertReport({
        id: existing?.id,
        projectId: project.id,
        reportDate: date,
        weather: weather || undefined,
        wind: wind || undefined,
        temperatureMin: tMin,
        temperatureMax: tMax,
        weatherAutoFetched: false,
        workStopped,
        workStoppedReason: workStopped ? workStoppedReason || undefined : undefined,
        summary,
        issues: issues || undefined,
        tomorrowPlan: tomorrowPlan || undefined,
        photos,
        createdBy: user.id,
      });
    } catch (err) {
      console.error(err);
      toast(
        isQuotaError(err)
          ? "Kaydedilemedi: tarayıcı hafızası dolu. Veri Yedeği sayfasından yedek alıp eski verileri temizleyin."
          : "Rapor kaydedilemedi",
        "error"
      );
      return undefined;
    }
    // Rapordan çıkarılan fotoğrafları depodan da sil
    const keep = new Set(photos.map((p) => p.url));
    for (const p of existing?.photos ?? []) {
      if (!keep.has(p.url)) void deletePhoto(p.url).catch(() => {});
    }
    if (!opts.silent) toast("Günlük rapor kaydedildi", "success");
    return saved;
  }

  // Tarih sınırları: proje başı/sonu + bugünden ileri gidilmez.
  const today = toISODate(new Date());
  const minDate = project?.startDate ?? "";
  const maxDate = (() => {
    if (!project) return today;
    return project.plannedEnd < today ? project.plannedEnd : today;
  })();

  function clampDate(d: string): string {
    if (!project) return d;
    if (d < minDate) return minDate;
    if (d > maxDate) return maxDate;
    return d;
  }

  function shift(delta: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(clampDate(toISODate(d)));
  }

  // Proje gün sayacı: tarih projenin kaçıncı günü?
  const projectDayNum = project
    ? daysBetween(project.startDate, date) + 1
    : 0;
  const projectTotalDays = project
    ? daysBetween(project.startDate, project.plannedEnd) + 1
    : 0;
  const canPrev = date > minDate;
  const canNext = date < maxDate;

  // Otomatik dahil edilenler
  const personnelToday = project
    ? personnelAttendance.filter(
        (a) => a.projectId === project.id && a.date === date && a.present
      ).length
    : 0;
  const machinesToday = project
    ? machineAttendance.filter((a) => a.projectId === project.id && a.date === date && a.present).length
    : 0;

  if (!project) {
    return (
      <Card>
        <CardTitle>Proje Yok</CardTitle>
        <p className="text-sm text-text2">Önce bir proje seç.</p>
      </Card>
    );
  }

  async function downloadDCR() {
    if (!project) return;
    // PDF ekrandaki son hali yansıtsın — önce kaydet
    const report = save({ silent: true });
    if (!report) return;
    const { downloadDCRPDF } = await import("@/lib/pdf/dcr");
    await downloadDCRPDF({
      project,
      report,
      date,
      personnelAttendance,
      machineAttendance,
      wbs,
      realized,
      preparedBy: user?.fullName,
    });
    toast("Rapor kaydedildi, DCR PDF indirildi", "success");
  }

  // Eski (otomatik çekilmiş) kayıtlarda listede olmayan bir değer olabilir
  const weatherOptions = weather && !WEATHER_OPTIONS.includes(weather) ? [weather, ...WEATHER_OPTIONS] : WEATHER_OPTIONS;
  const windOptions = wind && !WIND_OPTIONS.includes(wind) ? [wind, ...WIND_OPTIONS] : WIND_OPTIONS;

  return (
    <>
      <PageHeader
        title="Günlük Rapor"
        description={`Sahada günlük durum raporu`}
        icon={FileText}
        actions={
          <>
            <Button variant="outline" onClick={downloadDCR} title="Daily Construction Report — raporu kaydeder ve imzalanacak A4 PDF üretir">
              <FileText size={14} /> DCR PDF
            </Button>
            <Button variant="accent" onClick={() => save()}>
              <Save size={14} /> Kaydet
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => shift(-1)}
              disabled={!canPrev}
              className="p-2 rounded-md bg-bg4 hover:bg-bg3 disabled:opacity-40 disabled:cursor-not-allowed"
              title={canPrev ? "Önceki gün" : "Proje başlangıcındasın"}
            >
              <ChevronLeft size={14} />
            </button>
            <Input
              type="date"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={(e) => setDate(clampDate(e.target.value))}
              className="w-44 font-mono"
            />
            <button
              onClick={() => shift(1)}
              disabled={!canNext}
              className="p-2 rounded-md bg-bg4 hover:bg-bg3 disabled:opacity-40 disabled:cursor-not-allowed"
              title={canNext ? "Sonraki gün" : date === today ? "Bugünden ileri gidilemez" : "Proje sonundasın"}
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-accent/10 border border-accent/30">
            <span className="text-[10px] uppercase tracking-wider font-bold text-accent">
              Proje Günü
            </span>
            <span className="font-mono font-bold text-accent">
              {projectDayNum}
            </span>
            <span className="text-text3 font-mono text-xs">/ {projectTotalDays}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {existing ? (
              <Badge variant="green">Mevcut Rapor</Badge>
            ) : (
              <Badge variant="gray">Yeni Rapor</Badge>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardTitle>Hava Durumu</CardTitle>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-bg3">
              {weatherIcon(weather)}
              <div className="flex-1 min-w-0">
                <div className="font-medium">{weather || "Seçilmedi"}</div>
                <div className="text-xs text-text3 font-mono">
                  {tempMin || "—"}°C — {tempMax || "—"}°C{wind ? ` · ${wind}` : ""}
                </div>
              </div>
            </div>
            <Field label="Hava">
              <Select value={weather} onChange={(e) => setWeather(e.target.value)}>
                <option value="">— Seçin —</option>
                {weatherOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Min °C">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={tempMin}
                  onChange={(e) => setTempMin(e.target.value)}
                  placeholder="örn. 8"
                />
              </Field>
              <Field label="Maks °C">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={tempMax}
                  onChange={(e) => setTempMax(e.target.value)}
                  placeholder="örn. 21"
                />
              </Field>
            </div>
            <Field label="Rüzgar">
              <Select value={wind} onChange={(e) => setWind(e.target.value)}>
                <option value="">— Seçin —</option>
                {windOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={workStopped}
                onChange={(e) => setWorkStopped(e.target.checked)}
                className="accent-red"
              />
              <span className="text-text">Hava nedeniyle iş durdu</span>
            </label>
            {workStopped && (
              <Input
                value={workStoppedReason}
                onChange={(e) => setWorkStoppedReason(e.target.value)}
                placeholder="Açıklama (yağmur, fırtına, vs.)"
              />
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Otomatik Veriler</CardTitle>
          <dl className="space-y-2 text-sm">
            <Row label="Personel (puantaj)">{personnelToday}</Row>
            <Row label="Makine (puantaj)">{machinesToday}</Row>
            <Row label="Tarih">{formatDate(date)}</Row>
          </dl>
        </Card>

        <Card>
          <CardTitle>Fotoğraflar ({photos.length})</CardTitle>
          <label className={`block w-full ${photoBusy ? "cursor-wait opacity-60" : "cursor-pointer"}`}>
            <input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={onPhotoChange}
              disabled={photoBusy}
              className="hidden"
            />
            <div className="border-2 border-dashed border-border2 rounded-lg p-4 text-center hover:border-accent/40 transition-colors">
              {photoBusy ? (
                <RefreshCw size={24} className="mx-auto text-text3 mb-2 animate-spin" />
              ) : (
                <Camera size={24} className="mx-auto text-text3 mb-2" />
              )}
              <div className="text-xs text-text3">{photoBusy ? "Fotoğraflar işleniyor…" : "Foto çek veya seç"}</div>
            </div>
          </label>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {photos.map((p, i) => (
                <div key={p.url + i} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-bg3">
                  {photoUrls[i] ? (
                    <a href={photoUrls[i]} target="_blank" rel="noreferrer" title="Büyük göster">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoUrls[i]} alt={p.caption || `Foto ${i + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-text3">…</div>
                  )}
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 p-1 bg-black/70 rounded-md text-white hover:bg-red/80"
                    title="Fotoğrafı kaldır"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Card className="md:col-span-3">
          <CardTitle>Saha Notu / Özet</CardTitle>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Bugün sahada yapılan işler, önemli olaylar..."
            rows={4}
          />
        </Card>
        <Card>
          <CardTitle>Sorunlar / Engeller</CardTitle>
          <Textarea
            value={issues}
            onChange={(e) => setIssues(e.target.value)}
            placeholder="Karşılaşılan sorunlar..."
            rows={4}
          />
        </Card>
        <Card>
          <CardTitle>Yarın İçin Plan</CardTitle>
          <Textarea
            value={tomorrowPlan}
            onChange={(e) => setTomorrowPlan(e.target.value)}
            placeholder="Yarın yapılacaklar..."
            rows={4}
          />
        </Card>
        <Card>
          <CardTitle>İpuçları</CardTitle>
          <Alert variant="info">
            Telefon kamerası kullanılabilir. Fotoğraflar otomatik küçültülür ve bu cihazda saklanır.
            DCR PDF butonu raporu önce kaydeder, sonra imzalanacak günlük raporu üretir.
          </Alert>
        </Card>
        {/* Mobile alt boşluk — sticky bottom action bar için */}
        <div className="md:hidden h-20" aria-hidden="true" />
      </div>

      {/* MOBILE: Sticky bottom action bar */}
      <div
        className="md:hidden fixed left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t border-border px-3 py-2 flex gap-2 shadow-large"
        style={{
          bottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <button
          onClick={() => shift(-1)}
          disabled={!canPrev}
          className="flex-1 h-12 rounded-lg bg-white border border-border text-text2 flex items-center justify-center gap-1 font-semibold text-sm disabled:opacity-40 active:scale-95 transition-all"
        >
          <ChevronLeft size={16} />
          Önceki
        </button>
        <button
          onClick={() => save()}
          className="flex-[2] h-12 rounded-lg bg-accent text-white flex items-center justify-center gap-2 font-bold text-sm shadow-medium active:scale-95 transition-all"
        >
          <Save size={16} />
          Kaydet
        </button>
        <button
          onClick={() => shift(1)}
          disabled={!canNext}
          className="flex-1 h-12 rounded-lg bg-white border border-border text-text2 flex items-center justify-center gap-1 font-semibold text-sm disabled:opacity-40 active:scale-95 transition-all"
        >
          Sonraki
          <ChevronRight size={16} />
        </button>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm py-1">
      <dt className="text-text3 text-xs uppercase tracking-wider">{label}</dt>
      <dd className="font-mono text-text">{children}</dd>
    </div>
  );
}

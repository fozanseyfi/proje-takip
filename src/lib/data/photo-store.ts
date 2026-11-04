"use client";

/**
 * Saha fotoğrafları — IndexedDB deposu.
 *
 * localStorage ~5 MB ile sınırlı; base64 fotoğraflar birkaç tanede bu sınırı doldurup
 * tüm store'un kaydını bozuyordu. Fotoğraflar artık sıkıştırılıp IndexedDB'ye yazılır,
 * DailyReport.photos[].url alanında sadece "idb:<id>" referansı tutulur.
 *
 * Eski kayıtlarda url doğrudan "data:..." olabilir — resolve fonksiyonları ikisini de destekler.
 *
 * NOT: Veri Yedeği (JSON export) sadece localStorage'ı alır; fotoğraflar yedeğe girmez.
 * Supabase Storage entegrasyonunda bu modül bir bucket upload'ı ile değiştirilecek.
 */

import { useEffect, useState } from "react";

const DB_NAME = "ges-photos";
const STORE = "photos";
const IDB_PREFIX = "idb:";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error("IndexedDB açılamadı"));
    };
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        t.oncomplete = () => resolve(req.result);
        t.onerror = () => reject(t.error ?? req.error);
        t.onabort = () => reject(t.error ?? new Error("IndexedDB işlemi iptal edildi"));
      })
  );
}

export function isIdbPhotoUrl(url: string): boolean {
  return url.startsWith(IDB_PREFIX);
}

/** Fotoğrafı (data URL) IndexedDB'ye yazar, rapora konacak referansı döner. */
export async function putPhoto(dataUrl: string): Promise<string> {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await tx("readwrite", (s) => s.put(dataUrl, id));
  return IDB_PREFIX + id;
}

export async function deletePhoto(url: string): Promise<void> {
  if (!isIdbPhotoUrl(url)) return;
  await tx("readwrite", (s) => s.delete(url.slice(IDB_PREFIX.length)));
}

/** "idb:<id>" → data URL. data:/http(s): url'ler aynen döner. Bulunamazsa "". */
export async function resolvePhotoUrl(url: string): Promise<string> {
  if (!isIdbPhotoUrl(url)) return url;
  try {
    const v = await tx<string | undefined>("readonly", (s) => s.get(url.slice(IDB_PREFIX.length)));
    return v ?? "";
  } catch {
    return "";
  }
}

export async function resolvePhotoUrls(urls: string[]): Promise<string[]> {
  return Promise.all(urls.map(resolvePhotoUrl));
}

/** React hook — referans listesini görüntülenebilir url'lere çevirir. */
export function useResolvedPhotoUrls(urls: string[]): string[] {
  const key = urls.join("|");
  const [resolved, setResolved] = useState<{ key: string; urls: string[] }>({ key: "", urls: [] });
  useEffect(() => {
    let cancelled = false;
    resolvePhotoUrls(urls).then((r) => {
      if (!cancelled) setResolved({ key, urls: r });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  // Henüz çözülmemişse data: url'leri hemen göster, idb olanlar için boş
  if (resolved.key === key) return resolved.urls;
  return urls.map((u) => (isIdbPhotoUrl(u) ? "" : u));
}

/**
 * Görseli en uzun kenarı `maxSide` px olacak şekilde küçültüp JPEG'e çevirir.
 * Telefon fotoğrafları (4-8 MB) → ~150-300 KB.
 */
export function compressImage(file: File, maxSide = 1600, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Dosya okunamadı"));
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(src); // çözülemeyen format — orijinali kullan
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(src);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

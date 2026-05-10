import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============= Tarih yardımcıları =============
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function toISODate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

export function fromISODate(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

export function daysBetween(start: Date | string, end: Date | string): number {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ============= Para birimi =============
export type Currency = "TRY" | "USD" | "EUR";

const currencySymbols: Record<Currency, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
};

export function formatMoney(
  amount: number | null | undefined,
  currency: Currency = "TRY",
  decimals = 2
): string {
  if (amount == null || isNaN(amount)) return "—";
  const formatted = amount.toLocaleString("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${currencySymbols[currency]}${formatted}`;
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value == null || isNaN(value)) return "—";
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPct(value: number | null | undefined, decimals = 1): string {
  if (value == null || isNaN(value)) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

// ============= SPI/CPI renk seviyesi =============
export type SpiLevel = "good" | "warn" | "bad";

export function spiLevel(spi: number | null | undefined): SpiLevel | null {
  if (spi == null || isNaN(spi)) return null;
  if (spi >= 0.95) return "good";
  if (spi >= 0.8) return "warn";
  return "bad";
}

export function cpiLevel(cpi: number | null | undefined): SpiLevel | null {
  if (cpi == null || isNaN(cpi)) return null;
  if (cpi >= 1.0) return "good";
  if (cpi >= 0.9) return "warn";
  return "bad";
}

// ============= UUID =============
export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

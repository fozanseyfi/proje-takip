"use client";

import { create } from "zustand";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn, uid } from "@/lib/utils";

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  ttl: number;
}

interface ToastState {
  items: ToastItem[];
  push: (message: string, variant?: ToastVariant, ttl?: number) => void;
  dismiss: (id: string) => void;
}

export const useToast = create<ToastState>((set, get) => ({
  items: [],
  push: (message, variant = "info", ttl = 3500) => {
    const id = uid();
    set((s) => ({ items: [...s.items, { id, message, variant, ttl }] }));
    setTimeout(() => get().dismiss(id), ttl);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

const ICON: Record<ToastVariant, React.ComponentType<{ size?: number; className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES: Record<ToastVariant, string> = {
  success: "border-green/30 [&_svg]:text-green",
  error: "border-red/30 [&_svg]:text-red",
  warning: "border-yellow/40 [&_svg]:text-yellow",
  info: "border-accent/30 [&_svg]:text-accent",
};

export function Toaster() {
  const items = useToast((s) => s.items);
  const dismiss = useToast((s) => s.dismiss);

  return (
    <div className="fixed top-20 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      {items.map((t) => {
        const Icon = ICON[t.variant];
        return (
          <div
            key={t.id}
            className={cn(
              "min-w-[280px] max-w-md flex items-start gap-3 px-4 py-3 rounded-xl border bg-white text-sm",
              "pointer-events-auto shadow-large animate-toast-in",
              STYLES[t.variant]
            )}
          >
            <Icon size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1 text-text font-medium">{t.message}</div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-text3 hover:text-text -mr-1 -my-0.5 p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

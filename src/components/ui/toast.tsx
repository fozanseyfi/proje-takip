"use client";

import { create } from "zustand";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { useEffect } from "react";
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

const ICON: Record<ToastVariant, React.ComponentType<{ size?: number }>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES: Record<ToastVariant, string> = {
  success: "bg-green/10 border-green/40 text-green",
  error: "bg-red/10 border-red/40 text-red",
  warning: "bg-yellow/10 border-yellow/40 text-yellow",
  info: "bg-accent/10 border-accent/40 text-accent",
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
              "min-w-[260px] max-w-md flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border backdrop-blur-md text-sm",
              "pointer-events-auto shadow-2xl animate-toast-in bg-bg2/95",
              STYLES[t.variant]
            )}
          >
            <Icon size={16} />
            <div className="flex-1 text-text">{t.message}</div>
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

// Auto-mount hook (for testing)
export function useAutoMount() {
  useEffect(() => {}, []);
}

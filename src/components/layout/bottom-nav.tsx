"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { mobileNavItems } from "./nav-config";
import { cn } from "@/lib/utils";

export function BottomNav({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t border-border h-16 grid grid-cols-5 shadow-medium">
      {mobileNavItems.slice(0, 4).map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[10px] transition-colors relative",
              active ? "text-accent" : "text-text3 hover:text-text2"
            )}
          >
            {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-accent" />}
            <Icon size={20} />
            <span className="font-semibold leading-tight">{item.label.split(" ")[0]}</span>
          </Link>
        );
      })}
      <button
        onClick={onMenuClick}
        className="flex flex-col items-center justify-center gap-1 text-[10px] text-text3 hover:text-text2"
      >
        <Menu size={20} />
        <span className="font-semibold leading-tight">Menü</span>
      </button>
    </nav>
  );
}

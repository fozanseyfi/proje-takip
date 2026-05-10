"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { mobileNavItems } from "./nav-config";
import { cn } from "@/lib/utils";

export function BottomNav({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-bg2/95 backdrop-blur-xl border-t border-accent/15 h-14 grid grid-cols-5">
      {mobileNavItems.slice(0, 4).map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors",
              active ? "text-accent" : "text-text3 hover:text-text"
            )}
          >
            <Icon size={18} />
            <span className="font-medium leading-tight">{item.label.split(" ")[0]}</span>
          </Link>
        );
      })}
      <button
        onClick={onMenuClick}
        className="flex flex-col items-center justify-center gap-0.5 text-[10px] text-text3 hover:text-text"
      >
        <Menu size={18} />
        <span className="font-medium leading-tight">Menü</span>
      </button>
    </nav>
  );
}

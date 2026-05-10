"use client";

import { useState } from "react";
import { Header } from "./header";
import { Sidebar, MobileDrawer } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { SeedProvider } from "./seed-provider";
import { Toaster } from "@/components/ui/toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <SeedProvider>
      <div className="min-h-screen flex flex-col">
        <Header onMenuClick={() => setDrawerOpen(true)} />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 min-w-0 pb-20 md:pb-6">
            <div className="px-4 sm:px-6 py-5 max-w-[1600px] mx-auto animate-fade-in">{children}</div>
          </main>
        </div>
        <BottomNav onMenuClick={() => setDrawerOpen(true)} />
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>
      <Toaster />
    </SeedProvider>
  );
}

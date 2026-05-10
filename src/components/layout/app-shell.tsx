"use client";

import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { SeedProvider } from "./seed-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SeedProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 min-w-0 pb-20 md:pb-6">
            <div className="px-4 sm:px-6 py-5 max-w-[1600px] mx-auto">{children}</div>
          </main>
        </div>
        <BottomNav />
      </div>
    </SeedProvider>
  );
}

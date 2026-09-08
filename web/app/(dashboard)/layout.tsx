"use client";

import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { DialogProvider } from "@/components/notifications/DialogProvider";
import { IntegrityBanner } from "@/components/notifications/IntegrityBanner";
import { FloatingQueue } from "@/components/jobs/FloatingQueue";
import { cn } from "@/components/ui";
import { useUIStore } from "@/store/useUIStore";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    isDesktopSidebarOpen,
    isMobileMenuOpen,
    setMobileMenuOpen,
  } = useUIStore();

  React.useEffect(() => {
    if (isMobileMenuOpen) {
      import('@/lib/scrollLock').then(({ lockScroll }) => lockScroll());
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") setMobileMenuOpen(false);
      };
      window.addEventListener("keydown", handleEsc);
      return () => {
        import('@/lib/scrollLock').then(({ unlockScroll }) => unlockScroll());
        window.removeEventListener("keydown", handleEsc);
      };
    }
  }, [isMobileMenuOpen, setMobileMenuOpen]);

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden relative">
      {/* Global Layer */}
      <FloatingQueue />

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] md:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-[70] w-[240px] bg-card border-r border-border/50 shadow-overlay transform transition-transform duration-250 ease-out md:hidden",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar isMobile={true} />
      </div>

      {/* Header */}
      <IntegrityBanner />
      <Header />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar */}
        <aside className={cn(
          "hidden md:flex flex-col h-full bg-card border-r border-border/50 transition-all duration-300 ease-out overflow-hidden shrink-0",
          isDesktopSidebarOpen ? "w-[200px]" : "w-0 border-r-0"
        )}>
          <div className="w-[200px] h-full">
            <Sidebar isMobile={false} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth pb-16 md:pb-5">
            <div className="w-full max-w-[1600px] mx-auto p-2.5 md:p-3 lg:p-5">
              {children}
            </div>
          </div>

          {/* Mobile Bottom Nav */}
          <BottomNav />
        </main>
      </div>
    </div>
  );
}

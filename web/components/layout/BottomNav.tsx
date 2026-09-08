"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Folder,
  Settings,
  BarChart3,
} from "lucide-react";
import { cn } from "@/components/ui";

export function BottomNav() {
  const pathname = usePathname();

  const items = [
    { name: "Files", href: "/files", icon: Folder },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[52px] bg-card/80 backdrop-blur-lg border-t border-border/50 z-50 md:hidden flex items-center justify-around px-4 pb-[env(safe-area-inset-bottom)]">
      {items.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 w-14 h-full transition-all duration-150 active:scale-[0.92]",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.6} />
            <span className={cn(
              "text-[9px] font-semibold uppercase tracking-wider transition-opacity",
              isActive ? "opacity-100" : "opacity-60"
            )}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

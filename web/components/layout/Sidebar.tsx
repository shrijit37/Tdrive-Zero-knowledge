"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Files,
  Clock,
  Settings,
  Database,
  ShieldCheck,
  Terminal,
  Trash2,
  BarChart3,
  Star,
  Sparkles,
  Server,
  Cloud,
  Signal,
  HardDrive,
  Film,
} from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { cn } from "@/components/ui";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { SystemStatus, StructuredResponse } from "@/types";

interface SidebarProps {
  isMobile?: boolean;
}

export function Sidebar({ isMobile = false }: SidebarProps) {
  const { setMobileMenuOpen } = useUIStore();
  const pathname = usePathname();

  const { data: status } = useQuery({
    queryKey: ["system-status"],
    queryFn: async () => {
      const resp = await api.get<StructuredResponse<SystemStatus>>("/system/status");
      return resp.data.data;
    },
    refetchInterval: 30000,
  });

  const navItems = [
    { name: "My Files", href: "/files", icon: Files, kbd: null },
    { name: "Streams", href: "/streams", icon: Film, kbd: null },
    { name: "OmniCloud", href: "/omnicloud", icon: Cloud, kbd: null },
    { name: "Analytics", href: "/analytics", icon: BarChart3, kbd: null },
    { name: "Recent Tasks", href: "/jobs", icon: Clock, kbd: null },
    { name: "Starred", href: "/starred", icon: Star, kbd: null },
    { name: "Trash Bin", href: "/trash", icon: Trash2, kbd: null },
    { name: "Cleanup", href: "/cleanup", icon: Sparkles, kbd: null },
    { name: "Server", href: "/server", icon: Server, kbd: null },
    { name: "Settings", href: "/settings", icon: Settings, kbd: null },
    { name: "Telegram", href: "/telegram", icon: Signal, kbd: null },
    { name: "S3 Gateway", href: "/s3", icon: HardDrive, kbd: null },
    { name: "Developer", href: "/developer", icon: Terminal, kbd: null },
  ];

  const handleLinkClick = () => {
    if (isMobile) setMobileMenuOpen(false);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-card select-none w-full",
      isMobile ? "w-full" : "w-[200px]"
    )}>
      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all duration-150 group min-h-[32px]",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
              )}
            >
              <item.icon
                size={15}
                strokeWidth={isActive ? 2.2 : 1.8}
                className={cn("shrink-0 transition-colors", isActive && "text-primary")}
              />
              <span className="text-[12px] font-medium truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Storage + Security Footer */}
      <div className="px-3 py-3 border-t border-border/50 space-y-3">
        {/* Storage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Database size={10} className="text-muted-foreground" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Storage</span>
            </div>
            <span className="text-[10px] font-semibold text-primary font-mono">Unlimited</span>
          </div>

          <div className="h-1 w-full bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
              style={{ width: status?.active_storage ? "18%" : "3%" }}
            />
          </div>

          <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
            {formatSize(status?.active_storage || 0)}
            <span className="text-muted-foreground/60 ml-1">cloud</span>
          </p>
        </div>

        {/* OmniCloud */}
        <div className="space-y-2 pt-2 border-t border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "accent-dot",
                status?.omnicloud_connected ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
              )} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">OmniCloud</span>
            </div>
            {status?.omnicloud_connected ? (
              <span className="text-[10px] font-semibold text-primary font-mono">
                {status?.omnicloud_total
                  ? `${Math.min(100, Math.round(((status.omnicloud_used || 0) / status.omnicloud_total) * 100))}%`
                  : "Ready"}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground/50">Offline</span>
            )}
          </div>

          {status?.omnicloud_connected ? (
            (status.omnicloud_total || 0) > 0 ? (
              <>
                <div className="h-1 w-full bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(100, Math.round((status.omnicloud_used! / status.omnicloud_total!) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
                  {formatSize(status.omnicloud_used || 0)}
                  <span className="text-muted-foreground/40"> / {formatSize(status.omnicloud_total || 0)}</span>
                </p>
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground/60">
                No accounts linked.{" "}
                <Link href="/settings" className="text-primary hover:underline font-medium">Link one</Link>
              </p>
            )
          ) : (
            <p className="text-[10px] text-muted-foreground/60">
              Disconnected — check backend config.
            </p>
          )}
        </div>

        {/* Security Badge */}
        <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md border border-primary/10 transition-colors hover:bg-primary/8">
          <ShieldCheck size={13} className="text-primary shrink-0" />
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Encrypted</span>
        </div>
      </div>
    </div>
  );
}

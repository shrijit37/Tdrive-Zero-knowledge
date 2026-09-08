"use client";

import React from "react";
import { Search, Menu, User, Settings as SettingsIcon, Bell, LogOut } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { cn } from "@/components/ui";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { SystemStatus, StructuredResponse } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function Header() {
  const router = useRouter();
  const {
    toggleDesktopSidebar,
    toggleMobileMenu,
    searchQuery,
    setSearchQuery,
  } = useUIStore();

  const { unreadCount } = useNotificationStore();
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const profileRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileOpen]);

  const { data: status } = useQuery({
    queryKey: ["system-status"],
    queryFn: async () => {
      const resp = await api.get<StructuredResponse<SystemStatus>>("/system/status");
      return resp.data.data;
    },
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      localStorage.removeItem("tdrive_session_token");
      localStorage.removeItem("tdrive_csrf_token");
      router.push("/login");
    } catch (error) {
      console.error("Logout failed", error);
      localStorage.removeItem("tdrive_session_token");
      localStorage.removeItem("tdrive_csrf_token");
      router.push("/login");
    }
  };

  return (
    <header className="h-11 min-h-[44px] border-b border-border/50 bg-card/70 backdrop-blur-md flex items-center px-2.5 md:px-3 z-40 shrink-0 sticky top-0">
      {/* Brand & Toggle */}
      <div className="flex items-center w-[40px] md:w-[180px] shrink-0">
        <button
          onClick={() => {
            if (window.innerWidth < 768) toggleMobileMenu();
            else toggleDesktopSidebar();
          }}
          className="p-1.5 hover:bg-surface-2 rounded-md transition-colors duration-150 active:scale-[0.95]"
        >
          <Menu size={16} className="text-muted-foreground" />
        </button>
        <div className="hidden md:flex items-center ml-2.5 gap-2">
          {/* Logo mark — refined, no gradient, just accent color */}
          <div className="relative w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center border border-primary/10 overflow-hidden">
            <span className="relative text-primary font-display font-bold text-xs tracking-tight">T</span>
          </div>
          <span className="font-display font-bold text-[15px] tracking-tight text-foreground">
            TDrive
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 flex justify-center px-2 md:px-4">
        <div className="relative w-full max-w-[520px] group">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-150">
            <Search size={14} />
          </div>
          <input
            type="text"
            placeholder="Search files..."
            className="w-full h-8 bg-surface-1 border border-border/50 focus:bg-card focus:border-primary/30 focus:ring-1 focus:ring-ring/20 rounded-md pl-8 pr-3 text-xs outline-none transition-all duration-150 placeholder:text-muted-foreground/40 font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end w-[40px] md:w-[180px] space-x-0.5 shrink-0">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(true)}
            className="p-1.5 hover:bg-surface-2 rounded-md transition-colors duration-150 relative active:scale-[0.95]"
          >
            <Bell size={16} className="text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full border border-card" />
            )}
          </button>
          <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
        </div>

        <Link
          href="/settings"
          className="hidden md:flex p-1.5 hover:bg-surface-2 rounded-md transition-colors duration-150 active:scale-[0.95] text-muted-foreground"
        >
          <SettingsIcon size={16} />
        </Link>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-1.5 p-1 hover:bg-surface-2 rounded-md transition-colors duration-150 active:scale-[0.97] group"
          >
            <div className="w-6 h-6 bg-surface-3 rounded-full flex items-center justify-center text-muted-foreground border border-border/50 group-hover:border-primary/30 transition-colors duration-150 overflow-hidden">
              {status?.telegram_profile_photo ? (
                <img
                  src={status.telegram_profile_photo}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={12} />
              )}
            </div>
            {status?.telegram_username && (
              <span className="hidden md:block text-[11px] font-medium text-muted-foreground truncate max-w-[80px]">
                {status.telegram_username}
              </span>
            )}
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-1.5 w-44 bg-card border border-border/50 rounded-lg shadow-overlay py-1 z-50 animate-slide-up">
              <div className="px-3 py-2 border-b border-border/50">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Signed in as</p>
                <p className="text-xs font-semibold text-foreground truncate mt-0.5">{status?.telegram_username || "Telegram User"}</p>
              </div>

              <Link
                href="/settings"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors"
              >
                <SettingsIcon size={13} />
                Settings
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut size={13} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

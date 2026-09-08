"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useNotificationStore } from "@/store/useNotificationStore";
import {
  Bell,
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  Trash2,
  CheckCheck,
} from "lucide-react";
import { Button, cn } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";

export function NotificationCenter({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      import('@/lib/scrollLock').then(({ lockScroll }) => lockScroll());
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleEsc);
      return () => {
        import('@/lib/scrollLock').then(({ unlockScroll }) => unlockScroll());
        window.removeEventListener("keydown", handleEsc);
      };
    }
  }, [isOpen, onClose]);

  const getIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle2 className="text-status-success" size={16} />;
      case "error": return <AlertCircle className="text-destructive" size={16} />;
      case "warning": return <AlertTriangle className="text-status-warning" size={16} />;
      default: return <Info className="text-primary" size={16} />;
    }
  };

  if (!isOpen) return null;

  const drawerContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[140] bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-[150] flex flex-col h-full bg-card shadow-overlay transition-all duration-250 ease-out animate-slide-in-from-right", // Note: this uses the CSS animation name directly
        "w-full md:w-[400px] border-l border-border/50"
      )}>
        {/* Header */}
        <div className="flex flex-col border-b border-border/50 bg-card/95 backdrop-blur-md sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-display font-bold tracking-tight text-foreground">Notifications</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-surface-2 rounded-md transition-colors duration-150 active:scale-[0.95]"
              aria-label="Close notifications"
            >
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>

          {notifications.length > 0 && (
            <div className="px-4 pb-2.5 flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] font-medium text-primary hover:bg-primary/5"
                onClick={markAllAsRead}
              >
                <CheckCheck size={12} className="mr-1" />
                Mark all read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                onClick={clearAll}
              >
                <Trash2 size={12} className="mr-1" />
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto flex flex-col px-3 py-3 scrollbar-none">
          {notifications.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 animate-fade-in">
              <div className="w-12 h-12 bg-surface-2 rounded-full flex items-center justify-center mb-3">
                <Bell size={20} strokeWidth={1.5} className="text-muted-foreground/40" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-0.5">No notifications</h3>
              <p className="text-xs text-muted-foreground">Check back later for updates.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.read && markAsRead(notif.id)}
                  className={cn(
                    "group relative p-3 rounded-lg border transition-all cursor-pointer",
                    notif.read
                      ? "border-border/30 hover:border-border/50"
                      : "bg-primary/[0.03] border-primary/10 hover:bg-primary/[0.05]"
                  )}
                >
                  {!notif.read && (
                    <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-primary rounded-full" />
                  )}

                  <div className="flex items-start gap-2.5">
                    <div className={cn(
                      "p-1.5 rounded-md shrink-0 transition-transform group-hover:scale-105",
                      notif.read ? "bg-surface-2" : "bg-surface-1"
                    )}>
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0 pr-3">
                      <h4 className={cn(
                        "text-xs font-semibold leading-snug mb-0.5 line-clamp-1",
                        notif.read ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {notif.title}
                      </h4>
                      <p className={cn(
                        "text-[11px] leading-relaxed line-clamp-2",
                        notif.read ? "text-muted-foreground/60" : "text-muted-foreground"
                      )}>
                        {notif.message}
                      </p>
                      <span className="text-[9px] font-medium text-muted-foreground/40 uppercase tracking-wider mt-1.5 block">
                        {formatDistanceToNow(notif.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return mounted ? createPortal(drawerContent, document.body) : null;
}

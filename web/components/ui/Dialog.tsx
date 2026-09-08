"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  backdropClassName?: string;
}

export function Dialog({
  isOpen,
  onClose,
  children,
  className,
  backdropClassName,
}: DialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      import('@/lib/scrollLock').then(({ lockScroll }) => {
        lockScroll();
      });
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") onCloseRef.current();
      };
      window.addEventListener("keydown", handleEsc);
      return () => {
        import('@/lib/scrollLock').then(({ unlockScroll }) => {
          unlockScroll();
        });
        window.removeEventListener("keydown", handleEsc);
      };
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop — subtle dark overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-[4px] animate-fade-in",
          backdropClassName
        )}
        onClick={onClose}
      />

      {/* Content — Builder's Edge: 14px radius, subtle shadow, hairline border */}
      <div
        className={cn(
          "relative bg-card w-full max-w-md rounded-xl shadow-overlay border border-border/50 overflow-hidden animate-slide-up flex flex-col max-h-[90vh] sm:max-h-[85vh]",
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
